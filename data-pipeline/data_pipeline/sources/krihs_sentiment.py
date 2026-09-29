"""주택시장 소비심리지수 — 국토연구원 「부동산시장 소비자심리조사」(KOSIS 경유). (2026-09-29 추가, 사용자 요청)

**참고용 표시 시리즈**(채점 미반영) — 화면 7(주택구입 심리 분석) 하단 전용.

한국은행 소비자동향조사의 주택가격전망CSI(§ecos_csi.py)와 달리, 이 지수는 국토연구원이
직접 "수도권"(서울+인천+경기)을 하나로 묶은 공식 수치를 제공한다 — KOSIS 검색으로
`orgId=390, tblId=DT_39002_02`("주택시장 소비심리지수") 표를 확인, 시도별 분류(`obj_l1`)에
C1="K02"/C1_NM="수도권" 행이 실제로 존재함을 라이브 호출로 검증했다(2026-09-29).

- 0~200 사이 값, 100 초과 시 "전월 대비 가격상승·거래증가 응답자가 많음"을 의미(ITEM03 근거)
- obj_l1 코드: K01=전국, K02=수도권 (복수 선택은 KOSIS 관례대로 `+`로 구분: `K01+K02`)
- obj_l2는 반드시 빈 문자열이어야 한다(national_price_snapshot.py와 동일한 이슈 — 이 표도
  2단계 분류라 objL2="ALL"을 주면 err21이 난다)
- 발표 시차 약 1~2개월(LST_CHN_DE 기준)
"""

from __future__ import annotations

from ..models import Reading
from .kosis_client import fetch_parameter_data

ORG_ID = "390"
TBL_ID = "DT_39002_02"
SOURCE_NAME = "KOSIS(국가통계포털) 경유 국토연구원 부동산시장 소비자심리조사(주택시장)"
SOURCE_URL = "https://kosis.kr/statHtml/statHtml.do?orgId=390&tblId=DT_39002_02"

SERIES = {
    "housing_sentiment_national": {"c1": "K01", "region_label": "전국"},
    "housing_sentiment_capital": {"c1": "K02", "region_label": "수도권"},
}


def _to_readings(rows: list[dict]) -> list[Reading]:
    by_c1 = {s["c1"]: indicator_id for indicator_id, s in SERIES.items()}
    readings = []
    for r in rows:
        indicator_id = by_c1.get(r.get("C1"))
        if indicator_id is None:
            continue
        prd_de = r["PRD_DE"]
        region_label = SERIES[indicator_id]["region_label"]
        readings.append(
            Reading(
                indicator_id=indicator_id,
                as_of=f"{prd_de[:4]}-{prd_de[4:6]}-01",
                value=float(r["DT"]),
                source_name=SOURCE_NAME,
                source_url=SOURCE_URL,
                note=f"{prd_de[:4]}-{prd_de[4:6]} 주택시장 소비심리지수({region_label}). 참고용 표시 지표 — 채점 미반영.",
            )
        )
    return readings


def fetch_history(months: int = 200) -> list[Reading]:
    rows = fetch_parameter_data(ORG_ID, TBL_ID, itm_id="ALL", obj_l1="K01+K02", obj_l2="", prd_se="M", new_est_prd_cnt=months)
    return _to_readings(rows)


def fetch() -> list[Reading]:
    """최근 6개월을 조회해 각 시리즈의 최신 1건씩(발표 시차 대비)."""
    rows = fetch_parameter_data(
        ORG_ID, TBL_ID, itm_id="ALL", obj_l1="K01+K02", obj_l2="", prd_se="M", new_est_prd_cnt=6
    )
    readings = _to_readings(rows)
    latest: dict[str, Reading] = {}
    for r in readings:
        if r.indicator_id not in latest or r.as_of > latest[r.indicator_id].as_of:
            latest[r.indicator_id] = r
    if not latest:
        raise RuntimeError("국토연구원 주택시장 소비심리지수 응답이 비어 있습니다.")
    return list(latest.values())
