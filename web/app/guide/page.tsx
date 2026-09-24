import { INDICATORS, WEIGHT_SUM } from "@/lib/indicators";
import { Tooltip } from "@/components/Tooltip";
import { TREND_CONFIG, DIFFUSION_INDEX_IDS, DIFFUSION_BULLISH_MIN, DIFFUSION_BEARISH_MAX } from "@/lib/classify";

const BANDS = [
  { range: "0~30", label: "비우호 국면", guidance: "추가 하락 여지, 관망" },
  { range: "30~50", label: "하방 둔화, 관찰 필요", guidance: "선행지표 전환 여부 매주 체크" },
  { range: "50~70", label: "전환 신호 누적 중", guidance: "선행지표 2개 이상 우호 전환 시 매수 검토 시작" },
  { range: "70~85", label: "매수 우호 국면", guidance: "다수 지표 동반 우호, 실행 검토" },
  { range: "85~100", label: "과열 진입 가능성", guidance: "이미 가격 반영 다수 → 주의" },
];

const LEADING = INDICATORS.filter((i) => i.isLeading);

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">해석 방식 및 계산식 안내</h1>
        <p className="mt-2 text-sm text-neutral-600">
          이 페이지는{" "}
          <code className="rounded bg-neutral-100 px-1">docs/scoring-model.md</code>를 그대로 반영합니다.
          로직을 바꾸려면 그 문서를 먼저 갱신한 뒤 이 페이지와{" "}
          <code className="rounded bg-neutral-100 px-1">lib/scoring.ts</code>를 함께 수정합니다.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold">1. 지표 구성과 가중치</h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="whitespace-nowrap px-3 py-2">카테고리</th>
                <th className="whitespace-nowrap px-3 py-2">지표</th>
                <th className="px-3 py-2">설명</th>
                <th className="whitespace-nowrap px-3 py-2">데이터 소스</th>
                <th className="whitespace-nowrap px-3 py-2">가중치</th>
                <th className="whitespace-nowrap px-3 py-2">성격</th>
              </tr>
            </thead>
            <tbody>
              {INDICATORS.map((i) => (
                <tr key={i.id} className="border-t border-neutral-100">
                  <td className="whitespace-nowrap px-3 py-2">{i.category}</td>
                  <td className="whitespace-nowrap px-3 py-2">{i.label}</td>
                  <td className="px-3 py-2 text-neutral-600">{i.description}</td>
                  <td className="px-3 py-2">
                    <Tooltip text={i.sourceName}>
                      <a
                        href={i.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block max-w-[140px] truncate text-xs text-blue-600 hover:underline"
                      >
                        {i.sourceName}
                      </a>
                    </Tooltip>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{i.weight.toFixed(2)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{i.isLeading ? "선행" : "동행/중기"}</td>
                </tr>
              ))}
              <tr className="border-t border-neutral-200 font-medium">
                <td className="whitespace-nowrap px-3 py-2" colSpan={4}>
                  가중치 합계
                </td>
                <td className="whitespace-nowrap px-3 py-2">{WEIGHT_SUM.toFixed(2)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">2. 채점 기준 (-1 비우호 / 0 중립 / +1 우호)</h2>
        <p className="mb-3 text-sm text-neutral-600">
          11개 지표는 모두 <code>lib/classify.ts</code> 한 곳에서 채점하며, 아래 표는 그 설정값을 그대로 읽어 보여줍니다.
          대부분은 <strong>직전 시점 대비 변화율(%)</strong>로 판정합니다(주간 지표는 전주, 월간 지표는 전월). 변화폭이
          임계치보다 작으면 중립입니다.
        </p>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="whitespace-nowrap px-3 py-2">지표</th>
                <th className="whitespace-nowrap px-3 py-2">오르면</th>
                <th className="whitespace-nowrap px-3 py-2">판정 방식</th>
                <th className="px-3 py-2">우호 (+1)</th>
                <th className="px-3 py-2">중립 (0)</th>
                <th className="px-3 py-2">비우호 (-1)</th>
              </tr>
            </thead>
            <tbody>
              {INDICATORS.map((i) => {
                const cfg = TREND_CONFIG[i.id];
                const isDiffusion = DIFFUSION_INDEX_IDS.includes(i.id);
                // 전세수급동향지수는 값이 높을수록 전세 수요 우위라 "오르면 좋음"
                const risingGood = isDiffusion || cfg?.polarity === "risingIsBullish";
                let method = "—";
                let good = "—";
                let neutral = "—";
                let bad = "—";
                if (isDiffusion) {
                  method = "절대수준(100 기준선)";
                  good = `${DIFFUSION_BULLISH_MIN} 이상 (전세 수요 우위)`;
                  neutral = `${DIFFUSION_BEARISH_MAX} 초과 ~ ${DIFFUSION_BULLISH_MIN} 미만`;
                  bad = `${DIFFUSION_BEARISH_MAX} 이하`;
                } else if (cfg) {
                  const t = cfg.thresholdPct;
                  const pp = cfg.mode === "pp";
                  const u = pp ? "%p" : "%";
                  method = pp ? `${cfg.lookback ?? 1}개월 전 대비 ±${t}${u}` : `전기 대비 ±${t}${u}`;
                  const up = `+${t}${u} 이상 상승`;
                  const down = `-${t}${u} 이상 하락`;
                  neutral = `변화폭 ${t}${u} 미만`;
                  if (cfg.polarity === "risingIsBullish") {
                    good = up;
                    bad = down;
                  } else {
                    good = down;
                    bad = up;
                  }
                }
                return (
                  <tr key={i.id} className="border-t border-neutral-100">
                    <td className="whitespace-nowrap px-3 py-2">{i.label}</td>
                    <td className={`whitespace-nowrap px-3 py-2 ${risingGood ? "text-emerald-700" : "text-red-700"}`}>
                      {risingGood ? "좋음" : "나쁨"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-neutral-600">{method}</td>
                    <td className="px-3 py-2 text-emerald-700">{good}</td>
                    <td className="px-3 py-2 text-neutral-500">{neutral}</td>
                    <td className="px-3 py-2 text-red-700">{bad}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-600">
          <li>시점이 1개뿐이면 비교할 수 없어 중립으로 두고 &ldquo;히스토리 부족&rdquo;을 표시합니다.</li>
          <li>직전 값이 0이면(예: 입주가구수가 0인 달) 변화율을 못 구하므로 증감 방향만 보고 판정합니다.</li>
          <li>
            거래량·미분양만 1년치 데이터로 백테스트해 조정했고, 나머지 임계치는 방향성 기준의 <strong>잠정값</strong>입니다.
            가격·전세지표는 최근 1년간 하락한 적이 없어 &ldquo;비우호&rdquo; 분기가 실데이터로 검증되지 않았습니다.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">3. 계산식</h2>
        <pre className="rounded-lg border border-neutral-200 bg-neutral-900 p-4 text-xs text-neutral-100 overflow-x-auto">
{`가중점수 = Σ(지표별 점수 × 가중치)              # 범위: -${WEIGHT_SUM} ~ +${WEIGHT_SUM} (가중치 합계)
매수신호지수(0~100) = (가중점수 + ${WEIGHT_SUM}) / ${2 * WEIGHT_SUM} × 100`}
        </pre>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">4. 해석 밴드</h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="px-3 py-2">지수</th>
                <th className="px-3 py-2">해석</th>
                <th className="px-3 py-2">액션 가이드</th>
              </tr>
            </thead>
            <tbody>
              {BANDS.map((b) => (
                <tr key={b.range} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{b.range}</td>
                  <td className="px-3 py-2">{b.label}</td>
                  <td className="px-3 py-2">{b.guidance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">5. 오버라이드 규칙</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          <li>
            선행지표 {LEADING.length}종({LEADING.map((i) => i.label).join(" · ")}) 중 <strong>2개 이상이 동시에 &ldquo;비우호&rdquo;</strong>
            면, 가중합이 높아도 지수 상한을 <strong>60점</strong>으로 캡합니다.
          </li>
          <li>거시 변수 급변(기준금리 급등락, LTV·DSR 규제 발표) 시 자동 산출을 일시 정지하고 수동 검토합니다.</li>
        </ul>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
        이 모델은 개인적 분석 프레임워크이며, 개별 재무 상황을 반영한 투자자문이 아닙니다. 실제 의사결정은
        본인의 자금 계획과 거시 변수를 함께 고려해 판단해야 합니다.
      </section>
    </div>
  );
}
