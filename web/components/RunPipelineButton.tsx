"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tooltip } from "./Tooltip";

type Status = "idle" | "running" | "done" | "error";

export function RunPipelineButton({ available = true }: { available?: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setStatus("running");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/run-pipeline", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setStatus("done");
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

  if (!available) {
    return (
      <span className="whitespace-nowrap rounded-lg bg-neutral-100 px-4 py-2 text-xs text-neutral-500">
        🔒 로컬 전용 기능
      </span>
    );
  }

  return (
    <div className="flex flex-shrink-0 flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={status === "running"}
        className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {status === "running" ? "실행 중... (최대 3분)" : "🔄 지금 수집 실행"}
      </button>
      {status === "done" && <span className="text-[11px] text-emerald-700">완료 — 최신 데이터로 갱신됨</span>}
      {status === "error" && (
        <Tooltip text={errorMessage ?? "알 수 없는 오류"}>
          <span className="text-[11px] text-red-700">
            실행 실패 — 로컬 서버에서만 동작합니다(data-pipeline/logs/pipeline.log 확인)
          </span>
        </Tooltip>
      )}
    </div>
  );
}
