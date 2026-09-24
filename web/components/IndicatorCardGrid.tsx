"use client";

import { useState } from "react";
import { INDICATORS, type Category, type IndicatorId } from "@/lib/indicators";
import type { ClassifiedReading } from "@/lib/classify";
import type { RawReading } from "@/lib/raw-readings";
import { SignalBadge } from "./SignalBadge";
import { FreshnessDot } from "./FreshnessDot";
import { Tooltip } from "./Tooltip";
import { IndicatorHistoryModal } from "./IndicatorHistoryModal";
import { IndicatorTrendChart, type SecondarySeries } from "./IndicatorTrendChart";

const CATEGORIES: Category[] = ["가격", "거래", "금리", "경매", "전세", "공급", "위험"];

// 매매가격지수 차트에는 참고용 실거래 평균가격(㎡당)을 보조축으로 같이 그린다(채점 미반영)
function secondaryFor(id: IndicatorId, historyMap: Record<string, RawReading[]>): SecondarySeries | undefined {
  if (id === "mortgage_rate") {
    return { data: historyMap["base_rate"] ?? [], label: "한국은행 기준금리", unit: "%", color: "#f59e0b", sharedAxis: true };
  }
  if (id !== "price_index_weekly") return undefined;
  return { data: historyMap["price_avg_per_sqm"] ?? [], label: "실거래 평균가격", unit: "만원/㎡", color: "#f59e0b" };
}

export function IndicatorCardGrid({
  readings,
  historyMap,
}: {
  readings: ClassifiedReading[];
  historyMap: Record<string, RawReading[]>;
}) {
  const [openId, setOpenId] = useState<IndicatorId | null>(null);
  const readingMap = new Map(readings.map((r) => [r.indicatorId, r]));
  const openIndicator = INDICATORS.find((i) => i.id === openId) ?? null;

  return (
    <>
      {CATEGORIES.map((category) => (
        <section
          key={category}
          className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-5"
        >
          <h2 className="text-base font-semibold text-neutral-800">{category}</h2>
          <div className="grid grid-cols-1 gap-3">
            {INDICATORS.filter((i) => i.category === category).map((indicator) => {
              const reading = readingMap.get(indicator.id);
              return (
                <button
                  key={indicator.id}
                  onClick={() => setOpenId(indicator.id)}
                  className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-left transition hover:border-neutral-300 hover:shadow-sm md:flex-row md:items-stretch"
                >
                  <div className="flex flex-col gap-1 md:w-80 md:shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      {reading ? (
                        <FreshnessDot
                          indicatorId={indicator.id}
                          asOf={reading.asOf}
                          collectedAt={reading.collectedAt}
                        />
                      ) : (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-200" aria-hidden />
                      )}
                      {indicator.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {reading?.needsHistory && (
                        <Tooltip text={reading.historyReason ?? "히스토리가 부족합니다."}>
                          <span className="cursor-help rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                            히스토리 부족
                          </span>
                        </Tooltip>
                      )}
                      {reading && <SignalBadge score={reading.score} />}
                    </div>
                  </div>
                  {reading ? (
                    <>
                      <div className="text-2xl font-semibold">
                        <span className="text-red-800/70">{reading.value.toLocaleString()}</span>
                        <span className="ml-1 text-sm font-normal text-neutral-500">{indicator.unit}</span>
                      </div>
                      <p className="text-xs text-neutral-500">{reading.note}</p>
                      <p className="text-[11px] text-neutral-400">
                        원본 소스 날짜 <span className="underline decoration-dotted underline-offset-2">{reading.asOf}</span>
                      </p>
                      <p className="text-[11px] text-neutral-300">
                        마지막 배치 수집 {reading.collectedAt.slice(0, 16).replace("T", " ")}
                      </p>
                      {reading.needsHistory && reading.historyReason && (
                        <p className="text-[11px] text-neutral-400">ℹ️ {reading.historyReason}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-neutral-400">데이터 없음</p>
                  )}
                  <span className="mt-1 text-xs text-blue-600">설명·출처 자세히 →</span>
                  </div>
                  <div className="h-48 min-w-0 flex-1 md:h-auto md:min-h-44">
                    <IndicatorTrendChart
                      history={historyMap[indicator.id] ?? []}
                      label={indicator.label}
                      unit={indicator.unit}
                      secondary={secondaryFor(indicator.id, historyMap)}
                      compact
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {openIndicator && (
        <IndicatorHistoryModal
          indicator={openIndicator}
          history={historyMap[openIndicator.id] ?? []}
          secondary={secondaryFor(openIndicator.id, historyMap)}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
