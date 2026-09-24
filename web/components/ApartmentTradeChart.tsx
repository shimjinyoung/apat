"use client";

import { useState } from "react";
import { Scatter, ComposedChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import type { ApartmentTrade } from "@/lib/server/apartment-search";

const toTime = (d: string) => Date.parse(`${d}T00:00:00`);

interface Point {
  t: number;
  date: string;
  dealAmount: number; // 만원, Y축 값
  pricePerSqm: number | null;
  area: number;
  areaRounded: number;
  floor: string;
}

interface AreaLegendEntry {
  areaLabel: string; // 반올림한 전용면적(예: "84㎡") — 범례용
  color: string;
  count: number;
}

interface Hovered {
  point: Point;
  x: number;
  y: number;
}

// 평형별로 구분 가능한 색상 팔레트(6개 넘으면 순환)
const PALETTE = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];

function colorForArea(areaRounded: number, order: number[]): string {
  return PALETTE[order.indexOf(areaRounded) % PALETTE.length];
}

// 같은 단지라도 전용면적이 섞여 있으면(예: 84㎡ vs 59㎡) 거래가격 자체 수준이 달라 보인다 —
// 반올림한 면적 단위로 색상을 구분해서 범례를 만든다.
function buildLegend(points: Point[]): AreaLegendEntry[] {
  const order = [...new Set(points.map((p) => p.areaRounded))].sort((a, b) => a - b);
  const counts = new Map<number, number>();
  for (const p of points) counts.set(p.areaRounded, (counts.get(p.areaRounded) ?? 0) + 1);
  return order.map((rounded) => ({
    areaLabel: `${rounded}㎡`,
    color: colorForArea(rounded, order),
    count: counts.get(rounded) ?? 0,
  }));
}

export function ApartmentTradeChart({ trades }: { trades: ApartmentTrade[] }) {
  const [hovered, setHovered] = useState<Hovered | null>(null);

  const points: Point[] = trades.map((t) => ({
    t: toTime(t.date),
    date: t.date,
    dealAmount: t.dealAmountManwon,
    pricePerSqm: t.pricePerSqmManwon,
    area: t.excluUseAreaSqm,
    areaRounded: Math.round(t.excluUseAreaSqm),
    floor: t.floor,
  }));

  if (points.length === 0) {
    return <p className="text-sm text-neutral-400">최근 3년 내 일치하는 거래가 없습니다.</p>;
  }

  const areaOrder = [...new Set(points.map((p) => p.areaRounded))].sort((a, b) => a - b);
  const legend = buildLegend(points);

  return (
    <div className="w-full">
      <div className="relative h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => new Date(v).toISOString().slice(0, 7)}
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              width={64}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => (v / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
              label={{ value: "억원", position: "insideTopLeft", fontSize: 11, dy: -4 }}
            />
            {/*
              recharts의 기본 <Tooltip>은 커서 위치에서 "가장 가까운 점"을 축 단위로 찾는 방식이라,
              거래가 촘촘히 몰린 구간(최근 몇 달치)에서 점을 정확히 짚어도 툴팁이 아예 안 뜨는 경우가
              있었다(2026-09-23 사용자 리포트로 재현·확인). 대신 각 점(circle)에 직접
              onMouseEnter/Leave를 달아 hover 상태를 관리 — 점 hit-test 방식이라 밀집 구간에서도 안정적이다.
            */}
            <Scatter
              data={points}
              dataKey="dealAmount"
              fillOpacity={0.55}
              shape={(props: unknown) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: Point };
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={colorForArea(payload.areaRounded, areaOrder)}
                    fillOpacity={0.55}
                    onMouseEnter={() => setHovered({ point: payload, x: cx, y: cy })}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded border border-neutral-200 bg-white p-2 text-xs shadow"
            style={{ left: hovered.x, top: hovered.y - 8 }}
          >
            <p>{hovered.point.date}</p>
            <p>
              {hovered.point.dealAmount.toLocaleString()}만원 · 전용 {hovered.point.area}㎡ · {hovered.point.floor}층
            </p>
            {hovered.point.pricePerSqm !== null && <p>{hovered.point.pricePerSqm.toLocaleString()}만원/㎡</p>}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
        {legend.map((g) => (
          <span key={g.areaLabel} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
            전용 {g.areaLabel}({g.count}건)
          </span>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-neutral-400">
        점 = 개별 거래(실제 거래금액) · 전용면적이 다르면 거래금액 수준 자체가 달라 평형별로 색을 분리해
        표시 · 매수신호지수 스코어링과 무관한 조회 전용 화면
      </p>
    </div>
  );
}
