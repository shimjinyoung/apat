import type { SignalScore } from "@/lib/scoring";

const STYLE: Record<SignalScore, { label: string; className: string }> = {
  [-1]: { label: "비우호", className: "bg-red-100 text-red-700" },
  [0]: { label: "중립", className: "bg-neutral-100 text-neutral-600" },
  [1]: { label: "우호", className: "bg-emerald-100 text-emerald-700" },
};

export function SignalBadge({ score }: { score: SignalScore }) {
  const s = STYLE[score];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}
