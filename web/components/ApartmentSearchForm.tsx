"use client";

import { useState } from "react";
import { REGION_GROUPS } from "@/lib/region-codes";
import type { ApartmentTrade } from "@/lib/server/apartment-search";
import { ApartmentTradeChart } from "./ApartmentTradeChart";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; trades: ApartmentTrade[] };

export function ApartmentSearchForm() {
  const [region, setRegion] = useState(REGION_GROUPS[0].regions[0].code);
  const [name, setName] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setState({ status: "loading" });
    try {
      const params = new URLSearchParams({ region, name: name.trim() });
      const res = await fetch(`/api/apartment-trades?${params}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState({ status: "error", message: data.message ?? "조회에 실패했습니다." });
        return;
      }
      setState({ status: "done", trades: data.trades });
    } catch {
      setState({ status: "error", message: "네트워크 오류가 발생했습니다." });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          지역
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {REGION_GROUPS.map((group) => (
              <optgroup key={group.province} label={group.province}>
                {group.regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          아파트명(부분 검색 가능)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 래미안"
            maxLength={30}
            className="w-56 rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={state.status === "loading" || !name.trim()}
          className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {state.status === "loading" ? "조회 중..." : "조회"}
        </button>
      </form>

      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}

      {state.status === "done" && (
        <>
          <p className="text-sm text-neutral-500">
            최근 3년(최대 36개월) 기준 {state.trades.length}건 조회됨
          </p>
          <ApartmentTradeChart trades={state.trades} />
        </>
      )}

      {state.status === "idle" && (
        <p className="text-sm text-neutral-400">
          지역을 선택하고 아파트명을 입력한 뒤 조회하세요. 국토교통부 실거래가 API를 지역+월 단위로
          최근 36개월간 조회해 아파트명이 일치하는 거래만 걸러 보여줍니다(첫 조회는 다소 시간이 걸릴 수 있습니다).
        </p>
      )}
    </div>
  );
}
