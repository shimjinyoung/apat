export function ScoreGauge({ index, bandLabel }: { index: number; bandLabel: string }) {
  const pct = Math.max(0, Math.min(100, index));
  const color =
    pct < 30 ? "#dc2626" : pct < 50 ? "#f59e0b" : pct < 70 ? "#eab308" : pct < 85 ? "#16a34a" : "#7c3aed";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative h-40 w-40 rounded-full flex items-center justify-center"
        style={{
          background: `conic-gradient(${color} ${pct * 3.6}deg, #e5e7eb 0deg)`,
        }}
      >
        <div className="h-32 w-32 rounded-full bg-white flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {pct.toFixed(0)}
          </span>
          <span className="text-xs text-neutral-500">/ 100</span>
        </div>
      </div>
      <div className="text-sm font-medium" style={{ color }}>
        {bandLabel}
      </div>
    </div>
  );
}
