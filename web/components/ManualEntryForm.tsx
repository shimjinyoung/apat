"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IndicatorId, IndicatorMeta } from "@/lib/indicators";

function lastDayOfMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${yyyyMm}-${String(last).padStart(2, "0")}`;
}

export function ManualEntryForm({ indicators }: { indicators: IndicatorMeta[] }) {
  const router = useRouter();
  const [indicatorId, setIndicatorId] = useState<IndicatorId | "">(indicators[0]?.id ?? "");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selected = indicators.find((i) => i.id === indicatorId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/manual-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicatorId,
          asOf: lastDayOfMonth(month),
          value: Number(value),
          note,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("done");
        setValue("");
        setNote("");
        router.refresh();
      } else {
        setStatus("error");
        setErrorMessage(data.message ?? "알 수 없는 오류");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">지표</label>
        <select
          value={indicatorId}
          onChange={(e) => setIndicatorId(e.target.value as IndicatorId)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {indicators.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
        {selected && <p className="text-xs text-neutral-500">{selected.description}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">기준월</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          required
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <p className="text-xs text-neutral-500">해당 월의 마지막 날짜로 저장됩니다 ({lastDayOfMonth(month)}).</p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">
          값{selected ? ` (${selected.unit})` : ""}
        </label>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          placeholder="예: 37.1"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700">비고 (선택)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="예: 전월 대비 1.2%p 하락, 뉴스 인용"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={status === "saving"}
        className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {status === "saving" ? "저장 중... (파이프라인 재실행 포함, 최대 3분)" : "저장하고 반영하기"}
      </button>

      {status === "done" && (
        <p className="text-sm text-emerald-700">✅ 저장 완료 — 대시보드에 반영되었습니다.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-700">❌ 저장 실패: {errorMessage}</p>
      )}
    </form>
  );
}
