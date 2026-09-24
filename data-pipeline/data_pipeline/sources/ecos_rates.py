"""금리 — 한국은행 ECOS Open API. (2026-09-22 추가, 사용자 결정)

- `mortgage_rate`: 예금은행 주택담보대출 금리(신규취급액 기준, 연 %) — **채점 지표**.
  STAT_CODE=121Y006 ("1.3.3.2.1. 예금은행 대출금리(신규취급액 기준)"), ITEM_CODE1=BECBLA0302.
- `base_rate`: 한국은행 기준금리(연 %) — **참고용 표시 시리즈**(채점 미반영, 카드 차트 보조축).
  STAT_CODE=722Y001 ("1.3.1. 한국은행 기준금리 및 여수신금리"), ITEM_CODE1=0101000, 월간 조회.

통계코드는 ECOS 메타데이터 API(StatisticTableList/StatisticItemList)로 실제 조회해 확정했고,
StatisticSearch 실호출값(2026-07 주담대 4.48%, 2026-08 기준금리 3.00%)을 확인했다.
기준금리는 계단식이라 직전 달 대비로는 거의 항상 보합 → 채점은 대출금리로 한다.
발표 시차: 기준금리는 당월, 대출금리는 약 1개월.
"""

from __future__ import annotations

from datetime import date

import httpx

from ..config import ECOS_API_KEY, require
from ..models import Reading

SERIES = {
    "mortgage_rate": {
        "stat": "121Y006",
        "item": "BECBLA0302",
        "source_name": "한국은행 ECOS 예금은행 대출금리(신규취급액, 주택담보대출)",
        "source_url": "https://ecos.bok.or.kr/#/SearchStat",
        "note": "예금은행 주택담보대출 신규취급액 기준 가중평균금리(연 %)",
    },
    "base_rate": {
        "stat": "722Y001",
        "item": "0101000",
        "source_name": "한국은행 ECOS 한국은행 기준금리",
        "source_url": "https://ecos.bok.or.kr/#/SearchStat",
        "note": "한국은행 기준금리(월말 기준, 연 %) — 참고용, 채점 미반영",
    },
}


def _fetch_rows(stat: str, item: str, start: str, end: str) -> list[dict]:
    key = require(ECOS_API_KEY, "ECOS_API_KEY", "https://ecos.bok.or.kr/api/")
    url = f"https://ecos.bok.or.kr/api/StatisticSearch/{key}/json/kr/1/200/{stat}/M/{start}/{end}/{item}"
    resp = httpx.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if "RESULT" in data:
        raise RuntimeError(f"ECOS API 오류: {data['RESULT']}")
    return data.get("StatisticSearch", {}).get("row", [])


def _to_readings(indicator_id: str, rows: list[dict]) -> list[Reading]:
    s = SERIES[indicator_id]
    return [
        Reading(
            indicator_id=indicator_id,
            as_of=f"{r['TIME'][:4]}-{r['TIME'][4:6]}-01",
            value=float(r["DATA_VALUE"]),
            source_name=s["source_name"],
            source_url=s["source_url"],
            note=f"{r['TIME'][:4]}-{r['TIME'][4:6]} {s['note']}",
        )
        for r in rows
    ]


def fetch_history(start_yyyymm: str, end_yyyymm: str) -> list[Reading]:
    out: list[Reading] = []
    for indicator_id, s in SERIES.items():
        out.extend(_to_readings(indicator_id, _fetch_rows(s["stat"], s["item"], start_yyyymm, end_yyyymm)))
    return out


def fetch() -> list[Reading]:
    """최근 6개월을 조회해 각 시리즈의 최신 1건씩(발표 시차 때문에 당월 값이 없을 수 있음)."""
    today = date.today()
    y, m = today.year, today.month - 5
    if m < 1:
        y, m = y - 1, m + 12
    readings = fetch_history(f"{y}{m:02d}", f"{today.year}{today.month:02d}")
    latest: dict[str, Reading] = {}
    for r in readings:
        if r.indicator_id not in latest or r.as_of > latest[r.indicator_id].as_of:
            latest[r.indicator_id] = r
    if not latest:
        raise RuntimeError("ECOS 금리 응답이 비어 있습니다.")
    return list(latest.values())
