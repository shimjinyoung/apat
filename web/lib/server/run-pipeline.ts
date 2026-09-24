// 서버 전용 헬퍼 — data-pipeline/run_daily.bat 실행을 감싼다.
// /api/run-pipeline, /api/manual-entry 두 라우트가 공유한다.
import { exec } from "node:child_process";
import path from "node:path";

const BATCH_PATH = path.join(process.cwd(), "..", "data-pipeline", "run_daily.bat");

export function runPipeline(): Promise<{ ok: boolean; message?: string }> {
  return new Promise((resolve) => {
    exec(`"${BATCH_PATH}"`, { timeout: 3 * 60 * 1000 }, (error) => {
      if (error) {
        resolve({ ok: false, message: error.message });
        return;
      }
      resolve({ ok: true });
    });
  });
}
