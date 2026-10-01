"""파이프라인 실행 진입점.

사용법:
    .venv/Scripts/python.exe -m data_pipeline.run

각 수집기를 개별적으로 실행하고, 하나가 실패해도(예: API 키 미설정) 나머지는 계속 진행한다.
결과는 data/aptprice.db(SQLite)에 저장된다.
"""

from __future__ import annotations

from . import db
from .models import Reading
from .sources import (
    courtauction_stats,
    ecos_csi,
    ecos_delinquency,
    ecos_rates,
    hf_khai,
    kosis_avg_price,
    kosis_jeonse,
    kosis_price_index,
    kosis_unsold,
    krihs_sentiment,
    manual,
    molit_trade_volume,
    taein_auction,
)


def run() -> None:
    conn = db.connect()
    total_saved = 0

    collectors = [
        ("국토부 실거래가(거래량)", molit_trade_volume.fetch),
        ("KOSIS 미분양", kosis_unsold.fetch),
        ("KOSIS 주간 매매가격지수", kosis_price_index.fetch),
        ("KOSIS 아파트 실거래 평균가격(참고용)", kosis_avg_price.fetch),
        ("KOSIS 주간 전세가격지수", kosis_jeonse.fetch_price_index),
        ("KOSIS 전세수급동향", kosis_jeonse.fetch_supply_demand),
        ("태인경매 아파트 경매건수", taein_auction.fetch),
        ("ECOS 서울 주택담보대출 연체율", ecos_delinquency.fetch),
        ("ECOS 주담대 금리·기준금리", ecos_rates.fetch),
        ("ECOS 주택가격전망CSI(서울·경기·인천)", ecos_csi.fetch),
        ("국토연구원 주택시장 소비심리지수(전국·수도권)", krihs_sentiment.fetch),
        ("한국주택금융공사 주택구입부담지수(서울·경기·인천)", hf_khai.fetch),
        ("법원경매정보 낙찰률·낙찰가율", courtauction_stats.fetch),
        ("수동 입력(입주물량)", manual.fetch),
    ]

    for label, fetch_fn in collectors:
        try:
            readings: list[Reading] = fetch_fn()
        except Exception as exc:  # noqa: BLE001 - 개별 수집기 실패가 전체를 막지 않게 함
            print(f"[SKIP] {label}: {exc}")
            continue

        if not readings:
            print(f"[EMPTY] {label}: 수집된 값 없음")
            continue

        saved = db.upsert_readings(conn, readings)
        total_saved += saved
        print(f"[OK] {label}: {saved}건 저장")

    print(f"총 {total_saved}건 저장 완료 → {db.DEFAULT_DB_PATH}")
    conn.close()


if __name__ == "__main__":
    run()
