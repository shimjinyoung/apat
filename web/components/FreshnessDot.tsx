import type { IndicatorId } from "@/lib/indicators";
import { getFreshness } from "@/lib/freshness";
import { Tooltip } from "./Tooltip";

const DOT_STYLE: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

function formatCollectedAt(collectedAt: string): string {
  // DB collected_at은 "YYYY-MM-DD HH:MM:SS"(UTC 아님, 로컬 서버 시각) 형태.
  return collectedAt.slice(0, 16).replace("T", " ");
}

export function FreshnessDot({
  indicatorId,
  asOf,
  collectedAt,
}: {
  indicatorId: IndicatorId;
  asOf: string;
  collectedAt: string;
}) {
  const freshness = getFreshness(indicatorId, asOf);
  const title = `${freshness.label}\n${freshness.reason}\n마지막 배치 수집: ${formatCollectedAt(collectedAt)}`;

  return (
    <Tooltip text={title}>
      <span className="inline-flex cursor-help items-center gap-1" aria-label={freshness.label}>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_STYLE[freshness.level]}`} aria-hidden />
      </span>
    </Tooltip>
  );
}
