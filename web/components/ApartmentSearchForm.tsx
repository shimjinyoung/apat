"use client";

import { useEffect, useState } from "react";
import { REGION_GROUPS } from "@/lib/region-codes";
import type { ApartmentTrade } from "@/lib/server/apartment-search";
import { ApartmentTradeChart } from "./ApartmentTradeChart";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; trades: ApartmentTrade[] };

const DEFAULT_REGION = "41595"; // 경기도 화성시 병점구
const DEFAULT_NAME = "에스케이뷰파크";
const FAV_STORAGE_KEY = "apt-search-favorites-v1";
const MAX_FAVS = 5;

interface Favorite {
  region: string;
  aptName: string;
}

interface Candidate {
  key: string;
  aptName: string;
  dong: string;
  count: number;
  minArea: number;
  maxArea: number;
  lastDate: string;
  trades: ApartmentTrade[];
}

// 단지 구분 키: 아파트명 + 법정동 (같은 이름이 다른 동에 있을 수 있음)
function groupCandidates(trades: ApartmentTrade[]): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const t of trades) {
    const key = `${t.aptName}|${t.dong}`;
    const area = Math.round(t.excluUseAreaSqm);
    const c = map.get(key);
    if (!c) {
      map.set(key, { key, aptName: t.aptName, dong: t.dong, count: 1, minArea: area, maxArea: area, lastDate: t.date, trades: [t] });
    } else {
      c.count++;
      c.minArea = Math.min(c.minArea, area);
      c.maxArea = Math.max(c.maxArea, area);
      if (t.date > c.lastDate) c.lastDate = t.date;
      c.trades.push(t);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

// 평형(전용면적 반올림)별 최고가와 해당 거래일 — 차트 범례와 동일한 평형 기준
function MaxPriceTable({ trades }: { trades: ApartmentTrade[] }) {
  const byArea = new Map<number, { max: ApartmentTrade; count: number }>();
  for (const t of trades) {
    const area = Math.round(t.excluUseAreaSqm);
    const cur = byArea.get(area);
    if (!cur) {
      byArea.set(area, { max: t, count: 1 });
    } else {
      cur.count++;
      // 동가일 때는 더 최근 거래를 최고가 사례로 표시
      if (
        t.dealAmountManwon > cur.max.dealAmountManwon ||
        (t.dealAmountManwon === cur.max.dealAmountManwon && t.date > cur.max.date)
      ) {
        cur.max = t;
      }
    }
  }
  const rows = [...byArea.entries()].sort((a, b) => a[0] - b[0]);
  const fmtEok = (manwon: number) => `${(manwon / 10000).toFixed(2)}억`;

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-medium">평형별 최고가 (최근 3년)</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-xs text-neutral-500">
              <th className="py-1.5 pr-3 font-medium">전용면적</th>
              <th className="py-1.5 pr-3 text-right font-medium">최고가</th>
              <th className="py-1.5 pr-3 font-medium">거래일</th>
              <th className="py-1.5 pr-3 font-medium">층</th>
              <th className="py-1.5 text-right font-medium">거래 건수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([area, { max, count }]) => (
              <tr key={area} className="border-b border-neutral-100">
                <td className="py-1.5 pr-3">{area}㎡</td>
                <td className="py-1.5 pr-3 text-right font-semibold text-red-600">
                  {fmtEok(max.dealAmountManwon)}
                  <span className="ml-1 text-xs font-normal text-neutral-400">
                    ({max.dealAmountManwon.toLocaleString()}만원)
                  </span>
                </td>
                <td className="py-1.5 pr-3">{max.date}</td>
                <td className="py-1.5 pr-3">{max.floor}층</td>
                <td className="py-1.5 text-right text-neutral-500">{count}건</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultView({
  trades,
  selectedKey,
  onSelect,
  isFavorite,
  onToggleFavorite,
}: {
  trades: ApartmentTrade[];
  selectedKey: string | null;
  onSelect: (k: string | null) => void;
  isFavorite: (aptName: string) => boolean;
  onToggleFavorite: (aptName: string) => void;
}) {
  const candidates = groupCandidates(trades);
  if (candidates.length === 0) {
    return <p className="text-sm text-neutral-500">조건에 맞는 거래가 없습니다.</p>;
  }
  const selected =
    candidates.length === 1 ? candidates[0] : candidates.find((c) => c.key === selectedKey) ?? null;

  if (!selected) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-neutral-500">
          {candidates.length}개 단지가 검색되었습니다. 조회할 단지를 선택하세요.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {candidates.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => onSelect(c.key)}
                className="w-full rounded border border-neutral-300 px-3 py-2 text-left text-sm hover:border-indigo-500 hover:bg-indigo-50"
              >
                <span className="font-medium">{c.aptName}</span>
                <span className="ml-1 text-neutral-500">({c.dong})</span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {c.count}건 · 전용 {c.minArea === c.maxArea ? `${c.minArea}㎡` : `${c.minArea}~${c.maxArea}㎡`} · 최근 거래 {c.lastDate}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded bg-indigo-600 px-2.5 py-1 font-semibold text-white">
          {selected.aptName} <span className="font-normal text-indigo-100">({selected.dong})</span>
        </span>
        <span className="text-neutral-500">최근 3년(최대 36개월) 기준 {selected.count}건</span>
        <button
          type="button"
          onClick={() => onToggleFavorite(selected.aptName)}
          className="rounded border border-amber-400 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-50"
        >
          {isFavorite(selected.aptName) ? "★ 즐겨찾기 해제" : "☆ 즐겨찾기 추가"}
        </button>
        {candidates.length > 1 && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100"
          >
            다른 단지 선택
          </button>
        )}
      </div>
      <ApartmentTradeChart trades={selected.trades} />
      <MaxPriceTable trades={selected.trades} />
    </>
  );
}

const ALL_REGIONS = REGION_GROUPS.flatMap((g) =>
  g.regions.map((r) => ({ code: r.code, full: `${g.province} ${r.label}` })),
);

// 입력하면 지역 목록이 자동 필터링되는 선택 박스 (공백 무시, 부분 일치)
function RegionCombobox({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const current = ALL_REGIONS.find((r) => r.code === value);
  const [text, setText] = useState(current?.full ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // 외부(즐겨찾기 선택 등)에서 지역이 바뀌면 입력창 표시도 동기화
  useEffect(() => {
    setText(ALL_REGIONS.find((r) => r.code === value)?.full ?? "");
  }, [value]);

  const q = text.replace(/\s/g, "").toLowerCase();
  const filtered =
    !q || text === current?.full
      ? ALL_REGIONS
      : ALL_REGIONS.filter((r) => r.full.replace(/\s/g, "").toLowerCase().includes(q));

  function pick(code: string) {
    const r = ALL_REGIONS.find((x) => x.code === code);
    if (!r) return;
    onChange(code);
    setText(r.full);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && filtered[active]) {
      e.preventDefault();
      pick(filtered[active].code);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-1 text-sm">
      <label htmlFor="region-input">지역(입력해서 검색)</label>
      <input
        id="region-input"
        value={text}
        autoComplete="off"
        placeholder="예: 화성, 강남"
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => {
          // 목록 클릭이 먼저 처리되도록 지연 후 닫고, 확정되지 않은 입력은 현재 선택값으로 복원
          setTimeout(() => {
            setOpen(false);
            setText(ALL_REGIONS.find((r) => r.code === value)?.full ?? "");
          }, 150);
        }}
        onKeyDown={onKeyDown}
        className="w-56 rounded border border-neutral-300 px-2 py-1.5 text-sm"
      />
      {open && (
        <ul className="absolute left-0 top-full z-10 mt-1 max-h-60 w-56 overflow-auto rounded border border-neutral-300 bg-white shadow">
          {filtered.length === 0 && <li className="px-2 py-1.5 text-neutral-400">일치하는 지역이 없습니다</li>}
          {filtered.map((r, i) => (
            <li
              key={r.code}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(r.code);
              }}
              className={`cursor-pointer px-2 py-1.5 ${i === active ? "bg-indigo-50" : ""} ${r.code === value ? "font-medium" : ""}`}
            >
              {r.full}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ApartmentSearchForm() {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [name, setName] = useState(DEFAULT_NAME);
  const [state, setState] = useState<State>({ status: "idle" });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  async function search(regionCode: string, aptName: string) {
    const q = aptName.trim();
    if (!q) return;
    setState({ status: "loading" });
    setSelectedKey(null);
    try {
      const params = new URLSearchParams({ region: regionCode, name: q });
      const res = await fetch(`/api/apartment-trades?${params}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState({ status: "error", message: data.message ?? "조회에 실패했습니다." });
        return;
      }
      const trades = data.trades as ApartmentTrade[];
      // 입력한 이름과 정확히 일치하는 단지가 하나뿐이면 자동 선택
      const exact = groupCandidates(trades).filter((c) => c.aptName === q);
      if (exact.length === 1) setSelectedKey(exact[0].key);
      setState({ status: "done", trades });
    } catch {
      setState({ status: "error", message: "네트워크 오류가 발생했습니다." });
    }
  }

  // 즐겨찾기: 브라우저(localStorage)에 기기별 저장, 최대 5개
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [favsLoaded, setFavsLoaded] = useState(false);
  const [favMsg, setFavMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_STORAGE_KEY);
      if (raw === null) {
        setFavs([{ region: DEFAULT_REGION, aptName: DEFAULT_NAME }]);
      } else {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavs(
            parsed
              .filter((f) => f && typeof f.region === "string" && typeof f.aptName === "string")
              .filter((f) => ALL_REGIONS.some((r) => r.code === f.region))
              .slice(0, MAX_FAVS),
          );
        }
      }
    } catch {
      /* 저장소 접근 불가 시 즐겨찾기 없이 동작 */
    }
    setFavsLoaded(true);
  }, []);

  useEffect(() => {
    if (!favsLoaded) return;
    try {
      localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(favs));
    } catch {
      /* ignore */
    }
  }, [favs, favsLoaded]);

  const isFavorite = (aptName: string) => favs.some((f) => f.region === region && f.aptName === aptName);

  function toggleFavorite(aptName: string) {
    setFavMsg(null);
    if (isFavorite(aptName)) {
      setFavs(favs.filter((f) => !(f.region === region && f.aptName === aptName)));
    } else if (favs.length >= MAX_FAVS) {
      setFavMsg(`즐겨찾기는 최대 ${MAX_FAVS}개까지 지정할 수 있습니다. 기존 항목을 삭제한 뒤 추가하세요.`);
    } else {
      setFavs([...favs, { region, aptName }]);
    }
  }

  function selectFavorite(f: Favorite) {
    setFavMsg(null);
    setRegion(f.region);
    setName(f.aptName);
    void search(f.region, f.aptName);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void search(region, name);
  }

  // 화면 진입 시 기본값(병점구 · 에스케이뷰파크)으로 자동 조회
  useEffect(() => {
    void search(DEFAULT_REGION, DEFAULT_NAME);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm">
          ★ 즐겨찾기 <span className="text-xs text-neutral-400">({favs.length}/{MAX_FAVS} · 이 기기 브라우저에 저장)</span>
        </span>
        {favs.length === 0 ? (
          <p className="text-xs text-neutral-400">단지를 조회한 뒤 &quot;☆ 즐겨찾기 추가&quot;를 누르면 여기에 표시됩니다.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {favs.map((f) => {
              const label = ALL_REGIONS.find((r) => r.code === f.region)?.full.replace("경기도 ", "").replace("서울특별시 ", "") ?? "";
              const active = f.region === region && f.aptName === name.trim();
              return (
                <li
                  key={`${f.region}|${f.aptName}`}
                  className={`flex items-center rounded-full border text-sm ${active ? "border-amber-500 bg-amber-100" : "border-amber-300 bg-amber-50"}`}
                >
                  <button type="button" onClick={() => selectFavorite(f)} className="py-1 pl-3 pr-1.5 hover:underline">
                    {f.aptName} <span className="text-xs text-neutral-500">{label}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${f.aptName} 즐겨찾기 삭제`}
                    onClick={() => setFavs(favs.filter((x) => x !== f))}
                    className="py-1 pl-0.5 pr-2.5 text-neutral-400 hover:text-red-600"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {favMsg && <p className="text-xs text-red-600">{favMsg}</p>}
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <RegionCombobox value={region} onChange={setRegion} />
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
        <ResultView
          trades={state.trades}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
        />
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
