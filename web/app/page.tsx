import Link from "next/link";
import { computeScore } from "@/lib/scoring";
import { SAMPLE_READINGS } from "@/data/sample-readings";
import { loadHistory, type RawReading, type SeriesId } from "@/lib/raw-readings";
import { classifyLatest, buildScoreHistory, type ClassifiedReading } from "@/lib/classify";
import { INDICATORS } from "@/lib/indicators";
import { ScoreGauge } from "@/components/ScoreGauge";
import { ScoreHistoryChart } from "@/components/ScoreHistoryChart";
import { ScoringTable } from "@/components/ScoringTable";
import { IndicatorCardGrid } from "@/components/IndicatorCardGrid";
import { RunPipelineButton } from "@/components/RunPipelineButton";
import { isLocalExecAvailable } from "@/lib/deploy-env";

function sampleHistoryMap(): Record<string, RawReading[]> {
  const map: Record<string, RawReading[]> = {};
  for (const r of SAMPLE_READINGS) {
    map[r.indicatorId] = [
      {
        indicatorId: r.indicatorId,
        asOf: r.asOf,
        value: r.value,
        sourceName: "",
        sourceUrl: "",
        note: r.note ?? "",
        collectedAt: r.asOf,
      },
    ];
  }
  return map;
}

export default function DashboardPage() {
  const history = loadHistory();
  const usingRealData = history !== null;

  const historyMap: Record<SeriesId, RawReading[]> = usingRealData
    ? (history as Record<SeriesId, RawReading[]>)
    : (sampleHistoryMap() as Record<SeriesId, RawReading[]>);

  const readings: ClassifiedReading[] = classifyLatest(historyMap);
  const scoreHistory = buildScoreHistory(historyMap);
  const result = computeScore(readings);

  const latestCollected = usingRealData
    ? Object.values(historyMap)
        .flat()
        .reduce((max, r) => (r.asOf > max ? r.asOf : max), "")
    : null;

  return (
    <div className="flex flex-col gap-8">
      {usingRealData ? (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            ✅ <strong>실제 파이프라인 데이터</strong>입니다 (최신 시점: {latestCollected}). 카드를
            클릭하면 지표별 추이를 볼 수 있습니다. 계산식은{" "}
            <Link href="/guide" className="underline">
              해석 방식 안내
            </Link>
            에서 확인하세요. 매일 08:00 자동 실행되지만, PC가 꺼져 있었다면 아래 버튼으로 직접 갱신할 수 있습니다.
          </div>
          <RunPipelineButton available={isLocalExecAvailable} />
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            ⚠️ 현재 화면은 <strong>샘플 데이터</strong>입니다.{" "}
            {isLocalExecAvailable
              ? "아래 버튼을 눌러 파이프라인을 실행하면 실제 데이터로 바뀝니다."
              : "이 배포본은 로컬에서 커밋한 데이터 스냅샷을 보여줍니다."}
          </div>
          <RunPipelineButton available={isLocalExecAvailable} />
        </div>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">종합 매수신호지수</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {INDICATORS.length}개 지표 가중합 기반 · {result.capped && "선행지표 경고로 상한 캡 적용됨"}
            </p>
            <p className="mt-3 text-sm text-neutral-700">{result.band.guidance}</p>
          </div>
          <ScoreGauge index={result.index} bandLabel={result.band.label} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-neutral-600">지수 히스토리 (최근 1년, 주간)</h3>
          <ScoreHistoryChart points={scoreHistory} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-800">지표별 스코어링 현황</h2>
        <ScoringTable readings={readings} />
      </section>

      <IndicatorCardGrid readings={readings} historyMap={historyMap} />
    </div>
  );
}
