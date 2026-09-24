import { INDICATORS } from "@/lib/indicators";
import type { ClassifiedReading } from "@/lib/classify";
import { SignalBadge } from "./SignalBadge";
import { FreshnessDot } from "./FreshnessDot";
import { Tooltip } from "./Tooltip";

export function ScoringTable({ readings }: { readings: ClassifiedReading[] }) {
  const map = new Map(readings.map((r) => [r.indicatorId, r]));

  // 같은 카테고리가 연속으로 몇 번 나오는지 세어 첫 행에만 rowSpan으로 병합한다.
  const categoryRowSpan = new Map<number, number>(); // rowIndex -> span (병합 시작 행에만 값 존재)
  INDICATORS.forEach((indicator, idx) => {
    const prev = INDICATORS[idx - 1];
    if (prev && prev.category === indicator.category) return; // 병합될 행 — 표시 안 함
    let span = 1;
    while (INDICATORS[idx + span] && INDICATORS[idx + span].category === indicator.category) span++;
    categoryRowSpan.set(idx, span);
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-neutral-50 text-left">
          <tr>
            <th className="whitespace-nowrap px-3 py-2">카테고리</th>
            <th className="whitespace-nowrap px-3 py-2">지표</th>
            <th className="whitespace-nowrap px-3 py-2">가중치</th>
            <th className="whitespace-nowrap px-3 py-2">현재값</th>
            <th className="whitespace-nowrap px-3 py-2">원본 소스 날짜</th>
            <th className="whitespace-nowrap px-3 py-2">채점</th>
            <th className="whitespace-nowrap px-3 py-2">
              <Tooltip text="원본 소스가 정상 주기대로 갱신되고 있는지(배치 실행 여부와는 별개)">
                <span className="cursor-help underline decoration-dotted underline-offset-4">최신성</span>
              </Tooltip>
            </th>
            <th className="whitespace-nowrap px-3 py-2">데이터 소스</th>
          </tr>
        </thead>
        <tbody>
          {INDICATORS.map((indicator, idx) => {
            const r = map.get(indicator.id);
            const span = categoryRowSpan.get(idx);
            return (
              <tr key={indicator.id} className="border-t border-neutral-100">
                {span !== undefined && (
                  <td
                    className="whitespace-nowrap border-r border-neutral-100 px-3 py-2 align-top text-neutral-500"
                    rowSpan={span}
                  >
                    {indicator.category}
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-2">
                  <Tooltip text={indicator.description}>
                    <span className="cursor-help font-medium underline decoration-dotted decoration-neutral-300 underline-offset-4">
                      {indicator.label}
                    </span>
                  </Tooltip>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{indicator.weight.toFixed(2)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r ? `${r.value.toLocaleString()} ${indicator.unit}` : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-neutral-400">
                  {r ? <span className="underline decoration-dotted underline-offset-2">{r.asOf}</span> : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r ? (
                    <div className="flex items-center gap-1">
                      <SignalBadge score={r.score} />
                      {r.needsHistory && (
                        <Tooltip text={r.historyReason ?? "히스토리가 부족합니다."}>
                          <span className="cursor-help text-[11px] text-neutral-400">(히스토리 부족)</span>
                        </Tooltip>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {r ? <FreshnessDot indicatorId={indicator.id} asOf={r.asOf} collectedAt={r.collectedAt} /> : "—"}
                </td>
                <td className="px-3 py-2">
                  <Tooltip text={indicator.sourceName}>
                    <a
                      href={indicator.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-w-[140px] truncate text-xs text-blue-600 hover:underline"
                    >
                      {indicator.sourceName}
                    </a>
                  </Tooltip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
