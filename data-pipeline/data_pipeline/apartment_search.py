"""아파트 실거래가 검색 — 화면 6("아파트 실거래가 검색") 전용 CLI 스크립트.

data_pipeline.run(매일 배치)에는 포함되지 않는다. web/app/api/apartment-trades가 사용자가
검색 버튼을 누를 때마다 이 스크립트를 자식 프로세스로 실행해 결과를 JSON으로 받는다.
스코어링과 무관한 조회 전용 기능이라 서울 10개 지표 채점 로직(classify.ts)과는 완전히 분리돼 있다.

사용법:
    .venv/Scripts/python.exe -m data_pipeline.apartment_search --region 11650 --name 서초대우 --months 36

동작:
1. 국토부 실거래가 Open API(molit_trade_volume.py와 동일 엔드포인트)를 지정한 법정동코드로
   최근 N개월(기본 36 = 3년)치 조회한다.
2. 응답을 지역코드+월 단위로 data/molit_cache/에 캐싱한다 — 같은 지역에서 다른 아파트를
   검색할 때 API를 다시 부르지 않기 위함(이 API는 아파트명 검색을 지원하지 않고 지역+월
   단위로만 조회되므로, 지역 전체 원자료를 캐싱해두는 게 합리적).
3. 캐시(또는 새로 받은 원자료)에서 aptNm에 검색어가 포함된 거래만 걸러 표준 필드로 정리해
   JSON 배열을 표준출력으로 낸다.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from urllib.parse import unquote
from xml.etree import ElementTree

import httpx

from .config import MOLIT_SERVICE_KEY, require

SERVICE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"
CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "molit_cache"


def _shift_month(year: int, month: int, offset: int) -> tuple[int, int]:
    total = (year * 12 + (month - 1)) - offset
    return total // 12, total % 12 + 1


def _cache_path(region_code: str, deal_ymd: str) -> Path:
    return CACHE_DIR / f"{region_code}-{deal_ymd}.json"


def _parse_items(xml_text: str) -> list[dict]:
    root = ElementTree.fromstring(xml_text)
    result_code = root.findtext(".//resultCode")
    if result_code not in (None, "00", "000"):
        msg = root.findtext(".//resultMsg")
        raise RuntimeError(f"MOLIT API 오류: {result_code} {msg}")

    rows = []
    for item in root.findall(".//item"):
        rows.append({child.tag: (child.text or "").strip() for child in item})
    return rows


def _fetch_month_raw(client: httpx.Client, region_code: str, deal_ymd: str, service_key: str) -> list[dict]:
    """캐시가 있으면 그대로 쓰고, 없으면 호출 후 캐싱한다."""
    cache_file = _cache_path(region_code, deal_ymd)
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    all_rows: list[dict] = []
    page_no = 1
    while True:
        resp = client.get(
            SERVICE_URL,
            params={
                "serviceKey": service_key,
                "LAWD_CD": region_code,
                "DEAL_YMD": deal_ymd,
                "pageNo": page_no,
                "numOfRows": 1000,
            },
            timeout=20,
        )
        resp.raise_for_status()
        rows = _parse_items(resp.text)
        all_rows.extend(rows)
        if len(rows) < 1000:
            break
        page_no += 1

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(all_rows, ensure_ascii=False), encoding="utf-8")
    return all_rows


def _to_trade(row: dict) -> dict:
    amount_manwon = int(row["dealAmount"].replace(",", ""))
    area = float(row["excluUseAr"])
    y, m, d = int(row["dealYear"]), int(row["dealMonth"]), int(row["dealDay"])
    return {
        "aptName": row["aptNm"],
        "dong": row.get("umdNm", ""),
        "date": f"{y:04d}-{m:02d}-{d:02d}",
        "dealAmountManwon": amount_manwon,
        "excluUseAreaSqm": area,
        "pricePerSqmManwon": round(amount_manwon / area, 1) if area else None,
        "floor": row.get("floor", ""),
        "buildYear": row.get("buildYear", ""),
    }


def search(region_code: str, name: str, months: int) -> list[dict]:
    key = require(MOLIT_SERVICE_KEY, "MOLIT_SERVICE_KEY", "https://www.data.go.kr/data/15126468/openapi.do")
    service_key = unquote(key)

    today = date.today()
    base_year, base_month = _shift_month(today.year, today.month, 0)  # 당월 포함(신고 지연으로 비어있을 수 있음)

    needle = name.strip().lower()
    trades: list[dict] = []
    with httpx.Client() as client:
        for offset in range(months):
            y, m = _shift_month(base_year, base_month, offset)
            deal_ymd = f"{y}{m:02d}"
            rows = _fetch_month_raw(client, region_code, deal_ymd, service_key)
            for row in rows:
                if needle in row.get("aptNm", "").lower():
                    trades.append(_to_trade(row))

    trades.sort(key=lambda t: t["date"])
    return trades


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", required=True, help="법정동코드 5자리")
    parser.add_argument("--name", required=True, help="아파트명(부분일치)")
    parser.add_argument("--months", type=int, default=36)
    args = parser.parse_args()

    if not (args.region.isdigit() and len(args.region) == 5):
        print(json.dumps({"error": "invalid region code"}), file=sys.stderr)
        sys.exit(1)

    try:
        trades = search(args.region, args.name, args.months)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)

    print(json.dumps(trades, ensure_ascii=False))


if __name__ == "__main__":
    main()
