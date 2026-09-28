"""주택가격전망 소비자동향지수(CSI) — 한국은행 ECOS 소비자동향조사. (2026-09-29 추가, 사용자 요청)

**참고용 표시 시리즈**(채점 미반영) — 화면 7(수도권 주택가격전망 CSI) 전용.

**"수도권"(서울+인천+경기) 단일 공식 수치는 ECOS에 없다** — 지역 구분이 서로 다른 두 표에
쪼개져 있어 직접 합산할 방법이 없다(2026-09-28 확인):
- `511Y002`(전국 기준 표): 전국/서울/6대광역시/기타도시 — 경기·인천 자체가 없음
- `511Y004`(지역별 표): 부산·대구경북·인천·...·경기·... 13개 지역 — **서울이 아예 없음**
  (전국 지표에 이미 잡힌다고 보고 별도 추적 안 하는 것으로 보임)

그래서 "수도권"을 근사하기 위해 서로 다른 두 표에서 세 지역을 따로 가져와 **합산하지 않고
3개 시리즈로 나란히 표시**하기로 사용자와 합의(대안 검토는 docs/decisions/ 참고).
"""

from __future__ import annotations

from datetime import date

import httpx

from ..config import ECOS_API_KEY, require
from ..models import Reading

ITEM_CODE1 = "FMFB"  # 주택가격전망CSI

SERIES = {
    "csi_housing_seoul": {
        "stat": "511Y002",
        "item2": "F0001",
        "source_name": "한국은행 ECOS 소비자동향조사(전국 기준, 서울)",
        "source_url": "https://ecos.bok.or.kr/#/SearchStat",
        "note": "주택가격전망CSI(서울) — 참고용, 채점 미반영",
    },
    "csi_housing_gyeonggi": {
        "stat": "511Y004",
        "item2": "Z21",
        "source_name": "한국은행 ECOS 소비자동향조사(지역별, 경기)",
        "source_url": "https://ecos.bok.or.kr/#/SearchStat",
        "note": "주택가격전망CSI(경기) — 참고용, 채점 미반영",
    },
    "csi_housing_incheon": {
        "stat": "511Y004",
        "item2": "Z19",
        "source_name": "한국은행 ECOS 소비자동향조사(지역별, 인천)",
        "source_url": "https://ecos.bok.or.kr/#/SearchStat",
        "note": "주택가격전망CSI(인천) — 참고용, 채점 미반영",
    },
}


def _fetch_rows(stat: str, item2: str, start: str, end: str) -> list[dict]:
    key = require(ECOS_API_KEY, "ECOS_API_KEY", "https://ecos.bok.or.kr/api/")
    url = f"https://ecos.bok.or.kr/api/StatisticSearch/{key}/json/kr/1/1000/{stat}/M/{start}/{end}/{ITEM_CODE1}/{item2}"
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
        out.extend(_to_readings(indicator_id, _fetch_rows(s["stat"], s["item2"], start_yyyymm, end_yyyymm)))
    return out


def fetch() -> list[Reading]:
    """최근 6개월을 조회해 각 시리즈의 최신 1건씩(발표 시차 대비)."""
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
        raise RuntimeError("ECOS 주택가격전망CSI 응답이 비어 있습니다.")
    return list(latest.values())
