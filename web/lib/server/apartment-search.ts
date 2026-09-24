// 서버 전용 헬퍼 — /api/apartment-trades가 사용.
// 사용자가 지역코드·아파트명을 입력하므로 execFile + 인자 배열을 써서 셸 인터폴레이션을 피한다
// (run-pipeline.ts의 exec()는 고정 경로만 실행해 안전하지만, 여긴 사용자 입력이 있어 다른 방식이 필요).
import { execFile } from "node:child_process";
import path from "node:path";
import { isKnownRegionCode } from "@/lib/region-codes";

const PIPELINE_DIR = path.join(process.cwd(), "..", "data-pipeline");
const PYTHON_PATH = path.join(PIPELINE_DIR, ".venv", "Scripts", "python.exe");

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

export function searchApartmentTrades(
  regionCode: string,
  name: string,
): Promise<{ ok: true; trades: ApartmentTrade[] } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    if (!isKnownRegionCode(regionCode)) {
      resolve({ ok: false, message: "알 수 없는 지역코드입니다." });
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 30) {
      resolve({ ok: false, message: "아파트명을 1~30자로 입력해 주세요." });
      return;
    }

    execFile(
      PYTHON_PATH,
      ["-m", "data_pipeline.apartment_search", "--region", regionCode, "--name", trimmedName, "--months", "36"],
      { cwd: PIPELINE_DIR, timeout: 60 * 1000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          let message = error.message;
          try {
            const parsed = JSON.parse(stderr.trim());
            if (parsed.error) message = parsed.error;
          } catch {
            // stderr가 JSON이 아니면 원본 에러 메시지 사용
          }
          resolve({ ok: false, message });
          return;
        }
        try {
          const trades = JSON.parse(stdout.trim()) as ApartmentTrade[];
          resolve({ ok: true, trades });
        } catch {
          resolve({ ok: false, message: "응답을 해석하지 못했습니다." });
        }
      },
    );
  });
}
