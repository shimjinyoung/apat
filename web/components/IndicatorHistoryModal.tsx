"use client";

import type { IndicatorMeta } from "@/lib/indicators";
import type { RawReading } from "@/lib/raw-readings";
import { IndicatorTrendChart, type SecondarySeries } from "./IndicatorTrendChart";

export function IndicatorHistoryModal({
  indicator,
  history,
  secondary,
  onClose,
}: {
  indicator: IndicatorMeta;
  history: RawReading[];
  secondary?: SecondarySeries;
  onClose: () => void;
}) {
  const sorted = [...history].sort((a, b) => a.asOf.localeCompare(b.asOf));
  const latest = sorted[sorted.length - 1];
  const latestSecondary = secondary?.data.length
    ? [...secondary.data].sort((a, b) => a.asOf.localeCompare(b.asOf)).at(-1)
    : undefined;


  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold">{indicator.label}</h2>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-sm text-neutral-600">{indicator.description}</p>

        <div className="mt-4 h-56 w-full">
          <IndicatorTrendChart history={sorted} label={indicator.label} unit={indicator.unit} secondary={secondary} />
        </div>

        {latest && (
          <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm">
            <div className="font-medium">
              최신값: {latest.value.toLocaleString()} {indicator.unit} ({latest.asOf})
            </div>
            <p className="mt-1 text-neutral-500">{latest.note}</p>
            {secondary && latestSecondary && (
              <p className="mt-2 border-t border-neutral-200 pt-2 text-neutral-600">
                <span className="font-medium" style={{ color: secondary.color }}>
                  {secondary.label}:
                </span>{" "}
                {latestSecondary.value.toLocaleString()} {secondary.unit} ({latestSecondary.asOf}) — 참고용, 채점 미반영
              </p>
            )}
          </div>
        )}

        <a
          href={indicator.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 text-xs text-blue-600 hover:underline"
        >
          출처: {indicator.sourceName} ↗
        </a>
        {secondary && latestSecondary && (
          <a
            href={latestSecondary.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 text-xs text-blue-600 hover:underline"
          >
            {secondary.label} 출처: {latestSecondary.sourceName} ↗
          </a>
        )}
      </div>
    </div>
  );
}
