"""과거 1년치 데이터 백필.

사용법:
    .venv/Scripts/python.exe -m data_pipeline.backfill

경매 3종(낙찰률·낙찰가율·물건비중)과 입주물량은 자동수집이 불가능해 백필 대상에서 제외한다
(사용자 결정, 2026-09-11) — 이 4개는 오늘 이후 수동 입력이 쌓이는 대로 히스토리가 생긴다.

거래량은 월당 25회(서울 25개 구) API 호출이 필요해 12개월이면 300회 호출된다 — 시간이 좀 걸린다.
"""

from __future__ import annotations

from . import db
from .models import Reading
from .sources import kosis_jeonse, kosis_price_index, kosis_unsold, molit_trade_volume


def run() -> None:
    conn = db.connect()
    total_saved = 0

    jobs = [
        ("국토부 실거래가(거래량) 12개월", lambda: molit_trade_volume.fetch_history(months=12)),
        ("KOSIS 미분양(서울) 12개월", lambda: kosis_unsold.fetch_history(months=12)),
        ("KOSIS 주간 매매가격지수 52주", lambda: kosis_price_index.fetch_history(weeks=52)),
        ("KOSIS 주간 전세가격지수 52주", lambda: kosis_jeonse.fetch_price_index_history(weeks=52)),
        ("KOSIS 전세수급동향 12개월", lambda: kosis_jeonse.fetch_supply_demand_history(months=12)),
    ]

    for label, fetch_fn in jobs:
        print(f"[RUN] {label} 수집 시작...")
        try:
            readings: list[Reading] = fetch_fn()
        except Exception as exc:  # noqa: BLE001
            print(f"[SKIP] {label}: {exc}")
            continue

        if not readings:
            print(f"[EMPTY] {label}")
            continue

        saved = db.upsert_readings(conn, readings)
        total_saved += saved
        print(f"[OK] {label}: {saved}건 저장 (기간 {min(r.as_of for r in readings)} ~ {max(r.as_of for r in readings)})")

    print(f"백필 총 {total_saved}건 저장 완료 → {db.DEFAULT_DB_PATH}")
    conn.close()


if __name__ == "__main__":
    run()
