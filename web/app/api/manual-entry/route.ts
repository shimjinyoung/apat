// "수동 입력" 화면(app/manual-entry)이 호출하는 API.
// manual_readings.json에 새 시점 값을 추가(append)하고 파이프라인을 재실행해 즉시 반영한다.
//
// ⚠️ 로컬 전용(run-pipeline과 동일한 이유). manual_readings.json은 시점별로 계속 누적되는
// 로그 형태다 — 같은 지표를 여러 번 다른 as_of로 추가하면 히스토리가 쌓인다.

import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/server/run-pipeline";
import { INDICATORS, type IndicatorId } from "@/lib/indicators";
import { isLocalExecAvailable } from "@/lib/deploy-env";

export const dynamic = "force-dynamic";

const MANUAL_FILE = path.join(process.cwd(), "..", "data-pipeline", "manual_readings.json");

interface ManualEntry {
  indicator_id: string;
  as_of: string;
  value: number;
  source_name: string;
  source_url: string;
  note: string;
}

export async function POST(request: Request) {
  if (!isLocalExecAvailable) {
    return NextResponse.json({ ok: false, message: "이 기능은 로컬 환경에서만 사용할 수 있습니다." }, { status: 501 });
  }
  const body = await request.json();
  const indicatorId = body.indicatorId as IndicatorId;
  const asOf = body.asOf as string;
  const value = Number(body.value);
  const note = (body.note as string) || "";

  const indicator = INDICATORS.find((i) => i.id === indicatorId && i.isManual);
  if (!indicator) {
    return NextResponse.json({ ok: false, message: "수동 입력을 지원하지 않는 지표입니다." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    return NextResponse.json({ ok: false, message: "기준일 형식이 올바르지 않습니다(YYYY-MM-DD)." }, { status: 400 });
  }
  if (Number.isNaN(value)) {
    return NextResponse.json({ ok: false, message: "값이 숫자가 아닙니다." }, { status: 400 });
  }

  const raw = await fs.readFile(MANUAL_FILE, "utf-8");
  const entries: ManualEntry[] = JSON.parse(raw);

  entries.push({
    indicator_id: indicatorId,
    as_of: asOf,
    value,
    source_name: `${indicator.sourceName} (대시보드 수동 입력)`,
    source_url: indicator.sourceUrl,
    note: note || "대시보드 수동 입력 화면을 통해 등록됨",
  });

  await fs.writeFile(MANUAL_FILE, JSON.stringify(entries, null, 2) + "\n", "utf-8");

  const result = await runPipeline();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
