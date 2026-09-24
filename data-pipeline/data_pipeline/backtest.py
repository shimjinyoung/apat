"""채점 임계치 백테스트 — 분석 전용 스크립트.

⚠️ 이 파일은 web/lib/classify.ts의 채점 로직을 다시 구현하지 않는다(불변식 §1-3 유지).
   여기서는 "임계치를 얼마로 잡아야 적절한가"를 판단하기 위한 순수 통계 분석만 한다.
   결론이 나오면 그 수치를 classify.ts에 수동으로 반영한다 — 이 스크립트가 운영 경로의
   일부가 되는 게 아니라 일회성(또는 주기적) 캘리브레이션 도구다.

사용법:
    .venv/Scripts/python.exe -m data_pipeline.backtest
"""

from __future__ import annotations

import statistics as st
from dataclasses import dataclass

from . import db


@dataclass
class Series:
    indicator_id: str
    dates: list[str]
    values: list[float]


def load_series(conn, indicator_id: str) -> Series:
    rows = conn.execute(
        "SELECT as_of, value FROM readings WHERE indicator_id=? ORDER BY as_of", (indicator_id,)
    ).fetchall()
    return Series(indicator_id, [r[0] for r in rows], [r[1] for r in rows])


def pct_changes(series: Series) -> list[float]:
    changes = []
    for prev, cur in zip(series.values, series.values[1:]):
        if prev != 0:
            changes.append((cur - prev) / prev * 100)
    return changes


def describe(label: str, values: list[float]) -> None:
    if not values:
        print(f"{label}: 데이터 없음")
        return
    print(
        f"{label}: n={len(values)}  min={min(values):.3f}  max={max(values):.3f}  "
        f"mean={st.mean(values):.3f}  median={st.median(values):.3f}  "
        f"stdev={st.pstdev(values):.3f}"
    )


def signal_distribution(changes: list[float], threshold: float) -> dict[str, int]:
    bullish = sum(1 for c in changes if c >= threshold)
    bearish = sum(1 for c in changes if c <= -threshold)
    neutral = len(changes) - bullish - bearish
    return {"bullish(+1)": bullish, "neutral(0)": neutral, "bearish(-1)": bearish}


def forward_hit_rate(signal_changes: list[float], threshold: float, target_series: Series, lag: int) -> tuple[int, int]:
    """signal_changes[i]가 threshold 이상/이하로 방향이 갈린 시점에서, lag기간 뒤 target_series가
    같은 방향으로 움직였는지(적중) 세어본다. (target_series는 signal과 같은 시점 배열이어야 함 — 여기선
    price_index_weekly를 기준으로 인덱스를 맞춰 호출한다.)
    """
    hits, total = 0, 0
    for i, c in enumerate(signal_changes):
        if abs(c) < threshold:
            continue
        target_idx = i + 1 + lag  # target_series.values는 changes보다 1개 더 김(레벨 시리즈)
        if target_idx >= len(target_series.values):
            continue
        base_idx = i + 1
        forward_return = (target_series.values[target_idx] - target_series.values[base_idx]) / target_series.values[base_idx]
        predicted_bullish = c > 0
        actual_bullish = forward_return > 0
        total += 1
        if predicted_bullish == actual_bullish:
            hits += 1
    return hits, total


def run() -> None:
    conn = db.connect()

    price = load_series(conn, "price_index_weekly")
    jeonse = load_series(conn, "jeonse_ratio")
    trade = load_series(conn, "trade_volume")
    unsold = load_series(conn, "unsold_housing")
    supply_demand = load_series(conn, "jeonse_supply_demand_index")

    print("=" * 70)
    print("1. 원자료 개수/기간")
    for s in [price, jeonse, trade, unsold, supply_demand]:
        print(f"  {s.indicator_id}: {len(s.values)}개 ({s.dates[0] if s.dates else '-'} ~ {s.dates[-1] if s.dates else '-'})")

    print("\n" + "=" * 70)
    print("2. 기간별 변화율(%) 분포 — 현재 classify.ts 임계치와 비교용")
    price_wow = pct_changes(price)
    jeonse_wow = pct_changes(jeonse)
    trade_mom = pct_changes(trade)
    unsold_mom = pct_changes(unsold)
    describe("매매가격지수 WoW%", price_wow)
    describe("전세가격지수 WoW%", jeonse_wow)
    describe("거래량 MoM%", trade_mom)
    describe("미분양 MoM%", unsold_mom)
    describe("전세수급동향지수 레벨", supply_demand.values)

    print("\n" + "=" * 70)
    print("3. 현재 임계치로 신호 분포가 어떻게 나뉘는지 (너무 자주/드물게 0이면 임계치 재조정 필요)")
    print("  매매가격지수(임계 0.05%):", signal_distribution(price_wow, 0.05))
    print("  전세가격지수(임계 0.05%):", signal_distribution(jeonse_wow, 0.05))
    print("  거래량(임계 5%):", signal_distribution(trade_mom, 5))
    print("  미분양(임계 3%, 극성 반대라 부호만 참고):", signal_distribution(unsold_mom, 3))

    print("\n" + "=" * 70)
    print("4. 대안 임계치 후보(표준편차의 절반) 신호 분포")
    price_alt = st.pstdev(price_wow) / 2 if price_wow else 0
    jeonse_alt = st.pstdev(jeonse_wow) / 2 if jeonse_wow else 0
    trade_alt = st.pstdev(trade_mom) / 2 if trade_mom else 0
    unsold_alt = st.pstdev(unsold_mom) / 2 if unsold_mom else 0
    print(f"  매매가격지수(대안 임계 {price_alt:.3f}%):", signal_distribution(price_wow, price_alt))
    print(f"  전세가격지수(대안 임계 {jeonse_alt:.3f}%):", signal_distribution(jeonse_wow, jeonse_alt))
    print(f"  거래량(대안 임계 {trade_alt:.3f}%):", signal_distribution(trade_mom, trade_alt))
    print(f"  미분양(대안 임계 {unsold_alt:.3f}%):", signal_distribution(unsold_mom, unsold_alt))

    print("\n" + "=" * 70)
    print("5. 선행성 검증 — 거래량/전세가격지수 신호가 4주/8주 뒤 매매가격지수 방향을 맞히는 비율")
    print("   (⚠ 데이터가 1년(52주)뿐이라 표본이 적음 — 참고용, 확정 근거로 쓰기엔 이름)")
    for lag_weeks, label in [(4, "4주"), (8, "8주")]:
        h, t = forward_hit_rate(jeonse_wow, 0.05, price, lag_weeks)
        rate = f"{h}/{t} ({h/t*100:.0f}%)" if t else "표본 없음"
        print(f"  전세가격지수 신호 → {label} 뒤 매매가격지수 방향 적중: {rate}")

    conn.close()


if __name__ == "__main__":
    run()
