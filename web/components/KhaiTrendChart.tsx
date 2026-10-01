"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import type { RawReading } from "@/lib/raw-readings";

interface Point {
  asOf: string;
  seoul?: number;
  gyeonggi?: number;
  incheon?: number;
}

function mergeSeries(seoul: RawReading[], gyeonggi: RawReading[], incheon: RawReading[]): Point[] {
  const byDate = new Map<string, Point>();
  for (const r of seoul) byDate.set(r.asOf, { ...(byDate.get(r.asOf) ?? { asOf: r.asOf }), asOf: r.asOf, seoul: r.value });
  for (const r of gyeonggi) byDate.set(r.asOf, { ...(byDate.get(r.asOf) ?? { asOf: r.asOf }), asOf: r.asOf, gyeonggi: r.value });
  for (const r of incheon) byDate.set(r.asOf, { ...(byDate.get(r.asOf) ?? { asOf: r.asOf }), asOf: r.asOf, incheon: r.value });
  return [...byDate.values()].sort((a, b) => a.asOf.localeCompare(b.asOf));
}

export function KhaiTrendChart({
  seoul,
  gyeonggi,
  incheon,
}: {
  seoul: RawReading[];
  gyeonggi: RawReading[];
  incheon: RawReading[];
}) {
  const data = mergeSeries(seoul, gyeonggi, incheon);

  if (data.length < 2) {
    return <p className="text-sm text-neutral-400">히스토리가 아직 부족합니다({data.length}개 시점).</p>;
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <XAxis dataKey="asOf" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(2, 7)} minTickGap={32} />
          <YAxis tick={{ fontSize: 11 }} width={40} domain={["auto", "auto"]} />
          <Tooltip labelFormatter={(l) => `기준분기 ${l}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => ({ seoul: "서울", gyeonggi: "경기", incheon: "인천" })[v as string] ?? v} />
          <ReferenceLine y={100} stroke="#c3c2b7" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="seoul" stroke="#2a78d6" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="gyeonggi" stroke="#eb6834" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="incheon" stroke="#1baf7a" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-neutral-400">
        점선 = 기준선 100(위=대출상환 부담 큼=주택구입 어려움) · &quot;수도권&quot; 단일 공식 수치는
        없어 서울·경기·인천 3개 지역을 나란히 표시 · 분기 단위 발표
      </p>
    </div>
  );
}
