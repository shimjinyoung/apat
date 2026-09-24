"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import nationalIndexRaw from "@/data/national-price-index.json";
import { NATIONAL_PRICE_EVENTS } from "@/lib/national-events";

interface Point {
  prd: string; // YYYYMM
  value: number;
}

const DATA = nationalIndexRaw as Point[];

function fmtDate(prd: string): string {
  return `${prd.slice(0, 4)}년 ${parseInt(prd.slice(4, 6), 10)}월`;
}

// 짝수년 1월만 x축 눈금으로 — 246개 월 전체를 다 찍으면 겹친다
const YEAR_TICKS = DATA.filter((d) => d.prd.endsWith("01") && parseInt(d.prd.slice(0, 4), 10) % 2 === 0).map(
  (d) => d.prd
);

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const idx = DATA.findIndex((d) => d.prd === point.prd);
  const prev = idx > 0 ? DATA[idx - 1].value : point.value;
  const chg = ((point.value - prev) / prev) * 100;
  const event = NATIONAL_PRICE_EVENTS.find((e) => e.prd === point.prd);

  return (
    <div className="max-w-[260px] rounded-lg bg-neutral-900 px-3 py-2.5 text-xs text-white shadow-lg">
      <div className="text-neutral-400">{fmtDate(point.prd)}</div>
      <div className="text-base font-semibold">{point.value.toFixed(1)}</div>
      <div className={chg >= 0 ? "text-emerald-400" : "text-red-400"}>
        {chg >= 0 ? "+" : ""}
        {chg.toFixed(1)}% (전월비)
      </div>
      {event && (
        <>
          <div className="mt-1.5 border-t border-neutral-700 pt-1.5 font-semibold text-amber-400">
            ● {event.title}
          </div>
          <p className="mt-0.5 leading-relaxed text-neutral-300">{event.desc}</p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "up" | "down" }) {
  return (
    <div className="flex flex-col gap-1 bg-white p-3">
      <span className="text-xs text-neutral-500">{label}</span>
      <span
        className={`text-xl font-semibold ${tone === "up" ? "text-emerald-700" : tone === "down" ? "text-red-700" : ""}`}
      >
        {value}
      </span>
      {note && <span className="text-[11px] text-neutral-400">{note}</span>}
    </div>
  );
}

export function NationalPriceChart() {
  const first = DATA[0];
  const last = DATA[DATA.length - 1];
  const peak = DATA.reduce((a, b) => (b.value > a.value ? b : a));
  const totalChg = ((last.value - first.value) / first.value) * 100;
  const vsPeak = ((last.value - peak.value) / peak.value) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 sm:grid-cols-4">
        <Stat label={`최신 지수 (${fmtDate(last.prd)})`} value={last.value.toFixed(1)} />
        <Stat
          label="조사 시작 대비"
          value={`+${totalChg.toFixed(0)}%`}
          note={`${fmtDate(first.prd)} = ${first.value.toFixed(1)}`}
          tone="up"
        />
        <Stat
          label="역대 최고치 대비"
          value={`${vsPeak.toFixed(1)}%`}
          note={`${fmtDate(peak.prd)} 고점 ${peak.value.toFixed(1)}`}
          tone={vsPeak < 0 ? "down" : "up"}
        />
        <Stat label="주요 변곡점" value={`${NATIONAL_PRICE_EVENTS.length}개`} note="위기·규제·금리 국면 전환" />
      </div>

      <div className="h-[420px] w-full rounded-lg border border-neutral-200 bg-white p-3 pr-5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={DATA} margin={{ top: 24, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="#e5e5e5" vertical={false} />
            <XAxis dataKey="prd" ticks={YEAR_TICKS} tickFormatter={(v: string) => v.slice(0, 4)} tick={{ fontSize: 11 }} />
            <YAxis domain={[50, 155]} tick={{ fontSize: 11 }} width={36} />
            <ReferenceLine
              y={100}
              stroke="#a3a3a3"
              strokeDasharray="3 4"
              label={{ value: "기준 100 (2017.11)", position: "insideTopRight", fontSize: 10, fill: "#a3a3a3" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            {NATIONAL_PRICE_EVENTS.map((ev) => {
              const point = DATA.find((d) => d.prd === ev.prd);
              if (!point) return null;
              return (
                <ReferenceDot
                  key={ev.prd}
                  x={ev.prd}
                  y={point.value}
                  r={5}
                  fill="#c2410c"
                  stroke="#fff"
                  strokeWidth={1.5}
                  label={{ value: ev.tag, position: "top", fontSize: 10, fill: "#78716c" }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="rounded-lg border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">주요 변곡점 9개 한눈에 보기</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="whitespace-nowrap px-2 py-1">시점</th>
                <th className="whitespace-nowrap px-2 py-1">지수</th>
                <th className="whitespace-nowrap px-2 py-1">사건</th>
                <th className="px-2 py-1">설명</th>
              </tr>
            </thead>
            <tbody>
              {NATIONAL_PRICE_EVENTS.map((ev) => {
                const point = DATA.find((d) => d.prd === ev.prd);
                return (
                  <tr key={ev.prd} className="border-t border-neutral-100">
                    <td className="whitespace-nowrap px-2 py-2 text-neutral-400">{fmtDate(ev.prd)}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono">{point?.value.toFixed(1)}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium">{ev.title}</td>
                    <td className="px-2 py-2 text-neutral-600">{ev.desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
