"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { RawReading } from "@/lib/raw-readings";

export interface SecondarySeries {
  data: RawReading[];
  label: string;
  unit: string;
  color: string;
  /** true면 주 시리즈와 같은 Y축·같은 스케일로 그린다(단위가 같은 시리즈용, 예: 기준금리 vs 대출금리) */
  sharedAxis?: boolean;
}

interface MergedPoint {
  asOf: string;
  value?: number;
  secondaryValue?: number;
}

function mergeSeries(primary: RawReading[], secondary: RawReading[]): MergedPoint[] {
  const byDate = new Map<string, MergedPoint>();
  for (const r of primary) {
    byDate.set(r.asOf, { ...(byDate.get(r.asOf) ?? { asOf: r.asOf }), asOf: r.asOf, value: r.value });
  }
  for (const r of secondary) {
    byDate.set(r.asOf, { ...(byDate.get(r.asOf) ?? { asOf: r.asOf }), asOf: r.asOf, secondaryValue: r.value });
  }
  return [...byDate.values()].sort((a, b) => a.asOf.localeCompare(b.asOf));
}

/** 지표 카드와 히스토리 모달이 함께 쓰는 시계열 차트. compact=true면 카드 안에 넣는 작은 버전. */
export function IndicatorTrendChart({
  history,
  label,
  unit,
  secondary,
  compact = false,
}: {
  history: RawReading[];
  label: string;
  unit: string;
  secondary?: SecondarySeries;
  compact?: boolean;
}) {
  const sorted = [...history].sort((a, b) => a.asOf.localeCompare(b.asOf));

  if (sorted.length < 2) {
    return (
      <p className="text-sm text-neutral-400">
        히스토리가 아직 부족합니다({sorted.length}개 시점). 매일 배치가 쌓이면 차트가 표시됩니다.
      </p>
    );
  }

  const chartData: MergedPoint[] = secondary?.data.length
    ? mergeSeries(sorted, secondary.data)
    : sorted.map((r) => ({ asOf: r.asOf, value: r.value }));
  const hasSecondary = !!secondary?.data.length;
  const separateAxis = hasSecondary && !secondary?.sharedAxis;
  const fontSize = compact ? 10 : 11;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <XAxis
          dataKey="asOf"
          tick={{ fontSize }}
          tickFormatter={(v: string) => v.slice(2)}
          minTickGap={compact ? 28 : 20}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize }}
          width={compact ? 52 : 64}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        {separateAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize }}
            width={compact ? 46 : 56}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
        )}
        <Tooltip
          formatter={(value, name) => [
            Number(value).toLocaleString(),
            name === "secondaryValue" ? `${secondary?.label}(${secondary?.unit})` : unit,
          ]}
          labelFormatter={(l) => `기준일 ${l}`}
        />
        {hasSecondary && (
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(v) => (v === "value" ? label : (secondary?.label ?? ""))}
          />
        )}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="value"
          stroke="#2563eb"
          strokeWidth={2}
          dot={sorted.length <= 20}
          connectNulls
        />
        {hasSecondary && secondary && (
          <Line
            yAxisId={secondary.sharedAxis ? "left" : "right"}
            type="monotone"
            dataKey="secondaryValue"
            stroke={secondary.color}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={secondary.data.length <= 20}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
