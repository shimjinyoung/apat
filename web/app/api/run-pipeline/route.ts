// 대시보드의 "지금 수집 실행" 버튼이 호출하는 API — data-pipeline/run_daily.bat을 실행한다.
//
// ⚠️ 로컬 전용 기능이다. 이 앱을 Vercel 등 서버리스에 배포하면 Python/배치 파일이 없어 동작하지 않는다
// (CLAUDE.md §3 "배포(예정)" 참고 — 배포 시점에 이 라우트를 어떻게 할지 별도 결정 필요, docs/decisions/ 기록 대상).
// 사용자 입력을 셸에 그대로 넘기지 않고 고정 경로만 실행하므로 인젝션 위험은 없다.

import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/server/run-pipeline";
import { isLocalExecAvailable } from "@/lib/deploy-env";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isLocalExecAvailable) {
    return NextResponse.json({ ok: false, message: "이 기능은 로컬 환경에서만 사용할 수 있습니다." }, { status: 501 });
  }
  const result = await runPipeline();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
