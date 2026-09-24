import Link from "next/link";
import { INDICATORS } from "@/lib/indicators";
import { loadHistory } from "@/lib/raw-readings";
import { ManualEntryForm } from "@/components/ManualEntryForm";
import { isLocalExecAvailable } from "@/lib/deploy-env";

export default function ManualEntryPage() {
  const manualIndicators = INDICATORS.filter((i) => i.isManual);
  const history = loadHistory();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">수동 입력 관리</h1>
        <p className="mt-2 text-sm text-neutral-600">
          아래 {manualIndicators.length}개 지표는 robots.txt 차단 또는 신뢰 가능한 단일 API 부재로 자동수집이 안 됩니다
          (자세한 내용은{" "}
          <Link href="/guide" className="underline">
            해석 방식 안내
          </Link>
          ). 매달 공식 발표/뉴스를 보고 값을 입력해주세요. 저장하면 파이프라인이 자동으로
          재실행되어 대시보드에 바로 반영됩니다(최대 3분).
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr>
              <th className="whitespace-nowrap px-3 py-2">지표</th>
              <th className="whitespace-nowrap px-3 py-2">최신값</th>
              <th className="whitespace-nowrap px-3 py-2">기준일</th>
              <th className="whitespace-nowrap px-3 py-2">누적 시점 수</th>
            </tr>
          </thead>
          <tbody>
            {manualIndicators.map((indicator) => {
              const rows = (history?.[indicator.id] ?? []).slice().sort((a, b) => a.asOf.localeCompare(b.asOf));
              const latest = rows[rows.length - 1];
              return (
                <tr key={indicator.id} className="border-t border-neutral-100">
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{indicator.label}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {latest ? `${latest.value.toLocaleString()} ${indicator.unit}` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-400">{latest?.asOf ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{rows.length}개</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isLocalExecAvailable ? (
        <ManualEntryForm indicators={manualIndicators} />
      ) : (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
          🔒 이 배포본에서는 입력할 수 없습니다 — 값 저장 후 파이프라인 재실행이 로컬 환경에서만
          동작하는 기능이라, 로컬에서 실행 중인 앱에서 입력해주세요.
        </p>
      )}
    </div>
  );
}
