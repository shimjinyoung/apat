"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import type { RawReading } from "@/lib/raw-readings";

interface Point {
  asOf: string;
  national?: number;
  capital?: number;
}

function mergeSeries(national: RawReading[], capital: RawReading[]): Point[] {
  const byDate = new Map<string, Point>();
  for (const r of national) byDate.set(r.asOf, { ...(byDate.get(r.asOf) ?? { asOf: r.asOf }), asOf: r.asOf, national: r.value });
  for (const r of capital) byDate.set(r.asOf, { ...(byDate.get(r.asOf) ?? { asOf: r.asOf }), asOf: r.asOf, capital: r.value });
  return [...byDate.values()].sort((a, b) => a.asOf.localeCompare(b.asOf));
}

export function HousingSentimentChart({ national, capital }: { national: RawReading[]; capital: RawReading[] }) {
  const data = mergeSeries(national, capital);

  if (data.length < 2) {
    return <p className="text-sm text-neutral-400">히스토리가 아직 부족합니다({data.length}개 시점).</p>;
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <XAxis dataKey="asOf" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(2, 7)} minTickGap={32} />
          <YAxis tick={{ fontSize: 11 }} width={40} domain={["auto", "auto"]} />
          <Tooltip labelFormatter={(l) => `기준월 ${l}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => ({ national: "전국", capital: "수도권" })[v as string] ?? v} />
          <ReferenceLine y={100} stroke="#52514e" strokeWidth={1.5} strokeDasharray="6 4" />
          <Line type="monotone" dataKey="national" stroke="#4a3aa7" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="capital" stroke="#e34948" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-neutral-400">
        점선 = 기준선 100(위=가격상승·거래증가 응답 우세) · &quot;수도권&quot;은 국토연구원이 직접
        발표하는 공식 통합 수치(서울+인천+경기)
      </p>
    </div>
  );
}
