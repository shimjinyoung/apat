// 서버 전용 헬퍼 — /api/apartment-trades가 사용.
// 국토부 실거래가 Open API(getRTMSDataSvcAptTradeDev)를 Next.js 서버에서 직접 fetch로 호출한다.
// 예전에는 로컬 Python 스크립트(data-pipeline/data_pipeline/apartment_search.py)를 execFile로
// 실행했으나, 그 방식은 로컬에서만 동작해 Vercel 배포본에서는 이 화면 전체가 막혀 있었다
// (2026-09-23 결정 당시 §9 참고). Vercel 서버리스 함수에는 Python venv도, 로컬 디스크 캐시도
// 없으므로 순수 TypeScript(fetch)로 이식해 로컬·배포 양쪽에서 동일하게 동작하게 한다.
import { isKnownRegionCode } from "@/lib/region-codes";

const SERVICE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";
const MAX_MONTHS = 36; // 최근 3년

export interface ApartmentTrade {
  aptName: string;
  dong: string;
  date: string;
  dealAmountManwon: number;
  excluUseAreaSqm: number;
  pricePerSqmManwon: number | null;
  floor: string;
  buildYear: string;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// 국토부 API는 각 <item>이 평평한(중첩 없는) 태그로만 구성되므로, 이 구조에 한해서는
// 정규식 기반 추출로 충분하다(전체 목적의 XML 파서가 필요할 정도로 복잡하지 않음).
function parseItems(xml: string): Record<string, string>[] {
  const resultCode = xml.match(/<resultCode>(.*?)<\/resultCode>/)?.[1];
  if (resultCode && !["00", "000"].includes(resultCode)) {
    const msg = xml.match(/<resultMsg>(.*?)<\/resultMsg>/)?.[1] ?? "";
    throw new Error(`MOLIT API 오류: ${resultCode} ${msg}`);
  }

  const items: Record<string, string>[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRegex.exec(xml))) {
    const fields: Record<string, string> = {};
    const fieldRegex = /<(\w+)>([^<]*)<\/\1>/g;
    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = fieldRegex.exec(itemMatch[1]))) {
      fields[fieldMatch[1]] = decodeXmlEntities(fieldMatch[2]).trim();
    }
    items.push(fields);
  }
  return items;
}

function shiftMonth(year: number, month: number, offset: number): [number, number] {
  const total = year * 12 + (month - 1) - offset;
  return [Math.floor(total / 12), (total % 12) + 1];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 36개월을 한 번에 병렬 요청하면 공공데이터포털의 초당 호출 제한(계정당 트래픽 제한)에 걸려
// HTTP 429가 난다(2026-09-26 실제로 재현·확인) — 동시 실행 개수를 제한해서 우회한다.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchWithRetry(url: string, attempts = 4): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, {
      // 지난 달치는 사실상 불변이므로 1시간 캐싱 — 같은 지역을 여러 사용자가 조회할 때 재요청을 줄인다
      next: { revalidate: 3600 },
    });
    if (res.status !== 429) return res;
    await sleep(300 * 2 ** i); // 300ms, 600ms, 1200ms, 2400ms
  }
  throw new Error("MOLIT API HTTP 429 (재시도 초과) — 잠시 후 다시 시도해주세요.");
}

async function fetchMonthRaw(regionCode: string, dealYmd: string, serviceKey: string): Promise<Record<string, string>[]> {
  const allRows: Record<string, string>[] = [];
  let pageNo = 1;
  for (;;) {
    const params = new URLSearchParams({
      serviceKey,
      LAWD_CD: regionCode,
      DEAL_YMD: dealYmd,
      pageNo: String(pageNo),
      numOfRows: "1000",
    });
    const res = await fetchWithRetry(`${SERVICE_URL}?${params}`);
    if (!res.ok) throw new Error(`MOLIT API HTTP ${res.status}`);
    const rows = parseItems(await res.text());
    allRows.push(...rows);
    if (rows.length < 1000) break;
    pageNo += 1;
  }
  return allRows;
}

function toTrade(row: Record<string, string>): ApartmentTrade {
  const amountManwon = Number(row.dealAmount.replace(/,/g, ""));
  const area = Number(row.excluUseAr);
  const y = row.dealYear.padStart(4, "0");
  const m = row.dealMonth.padStart(2, "0");
  const d = row.dealDay.padStart(2, "0");
  return {
    aptName: row.aptNm,
    dong: row.umdNm ?? "",
    date: `${y}-${m}-${d}`,
    dealAmountManwon: amountManwon,
    excluUseAreaSqm: area,
    pricePerSqmManwon: area ? Math.round((amountManwon / area) * 10) / 10 : null,
    floor: row.floor ?? "",
    buildYear: row.buildYear ?? "",
  };
}

export async function searchApartmentTrades(
  regionCode: string,
  name: string,
): Promise<{ ok: true; trades: ApartmentTrade[] } | { ok: false; message: string }> {
  if (!isKnownRegionCode(regionCode)) {
    return { ok: false, message: "알 수 없는 지역코드입니다." };
  }
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length > 30) {
    return { ok: false, message: "아파트명을 1~30자로 입력해 주세요." };
  }

  const rawKey = process.env.MOLIT_SERVICE_KEY ?? "";
  if (!rawKey) {
    return { ok: false, message: "서버에 MOLIT_SERVICE_KEY가 설정되어 있지 않습니다." };
  }
  // data.go.kr이 발급하는 키는 이미 퍼센트 인코딩되어 있어, URLSearchParams가 다시 인코딩하기 전에
  // 한 번 디코딩해야 이중 인코딩으로 인한 403을 피할 수 있다(molit_trade_volume.py와 동일한 이슈).
  const serviceKey = decodeURIComponent(rawKey);

  const today = new Date();
  const baseYear = today.getFullYear();
  const baseMonth = today.getMonth() + 1;

  const months = Array.from({ length: MAX_MONTHS }, (_, offset) => shiftMonth(baseYear, baseMonth, offset));

  try {
    const monthlyRows = await mapWithConcurrency(months, 5, ([y, m]) =>
      fetchMonthRaw(regionCode, `${y}${String(m).padStart(2, "0")}`, serviceKey),
    );
    const needle = trimmedName.toLowerCase();
    const trades = monthlyRows
      .flat()
      .filter((row) => (row.aptNm ?? "").toLowerCase().includes(needle))
      .map(toTrade)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { ok: true, trades };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
