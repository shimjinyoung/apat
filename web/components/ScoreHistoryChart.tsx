"use client";

import type { Key } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from "recharts";
import type { ScoreHistoryPoint } from "@/lib/classify";

// 이 사이트가 실제로 지수를 측정(파이프라인 첫 실행)하기 시작한 날. 이전 구간은 백필/재현값이다.
const MEASUREMENT_START = "2026-09-10";

const toTime = (d: string) => Date.parse(`${d}T00:00:00`);

export function ScoreHistoryChart({ points }: { points: ScoreHistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-neutral-400">
        지수 히스토리를 그리려면 최소 2개 시점이 필요합니다. 데이터가 더 쌓이면 표시됩니다.
      </p>
    );
  }

  // 측정 시작일은 주간 시점 사이에 끼므로 카테고리 축으로는 정확한 위치에 못 그린다 → 시간 축(숫자)으로 그린다.
  const data = points.map((p) => ({ ...p, t: toTime(p.asOf) }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 22, right: 8, left: 4, bottom: 0 }}>
          {/* 해석 밴드 배경 (docs/scoring-model.md §4) */}
          <ReferenceArea y1={0} y2={30} fill="#fee2e2" fillOpacity={0.5} />
          <ReferenceArea y1={30} y2={50} fill="#fef3c7" fillOpacity={0.5} />
          <ReferenceArea y1={50} y2={70} fill="#fef9c3" fillOpacity={0.5} />
          <ReferenceArea y1={70} y2={85} fill="#dcfce7" fillOpacity={0.5} />
          <ReferenceArea y1={85} y2={100} fill="#ede9fe" fillOpacity={0.5} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => new Date(v).toISOString().slice(5, 10)}
            minTickGap={24}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} />
          <Tooltip
            formatter={(value, name) => [String(value), name === "leadingIndex" ? "선행지표 지수(참고)" : "매수신호지수"]}
            labelFormatter={(_label, payload) => {
              const p = payload?.[0]?.payload as ScoreHistoryPoint | undefined;
              if (!p) return "";
              return p.isToday ? `오늘(${p.asOf}, 실시간 최신값)` : `기준일 ${p.asOf}`;
            }}
          />
          <ReferenceLine
            x={toTime(MEASUREMENT_START)}
            stroke="#000"
            strokeWidth={1.5}
            label={{ value: `측정 시작 ${MEASUREMENT_START.slice(5)}`, position: "top", fontSize: 11, fill: "#000" }}
          />
          <Line
            type="monotone"
            dataKey="leadingIndex"
            stroke="#f59e0b"
            strokeWidth={1.75}
            strokeDasharray="5 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="index"
            stroke="#4338ca"
            strokeWidth={2}
            dot={(props: unknown) => {
              const { cx, cy, payload, key } = props as {
                cx?: number;
                cy?: number;
                payload?: ScoreHistoryPoint;
                key?: Key;
              };
              if (!payload?.isToday || cx === undefined || cy === undefined) {
                return <g key={key} />;
              }
              return <circle key={key} cx={cx} cy={cy} r={5} fill="#10b981" stroke="#fff" strokeWidth={2} />;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] text-neutral-400">
        <span className="inline-block h-2 w-2 rounded-full border border-white bg-emerald-500" aria-hidden />
        오늘(각 지표 실제 최신값 기준, 대시보드 상단 게이지와 동일)
        <span className="ml-3 inline-block h-3 w-0.5 bg-black" aria-hidden />
        측정 시작일 — 이전 구간은 과거 데이터 기반 재현값
        <span className="ml-3 inline-block h-0 w-4 border-t-2 border-dashed border-amber-500" aria-hidden />
        선행지표 4종만의 지수(참고용, 채점 미반영 · 선행성은 아직 검증되지 않음)
      </p>
    </div>
  );
}
