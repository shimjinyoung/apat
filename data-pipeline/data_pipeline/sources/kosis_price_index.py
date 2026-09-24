"""서울 아파트 주간 매매가격지수 — KOSIS 경유 (한국부동산원 원자료).

2026-09-10 사용자가 KOSIS에서 직접 찾아준 표: "주간 아파트 매매가격지수"
(주간아파트가격동향조사, 기준주 2026.7.6=100.0). 실시간에 가깝게 갱신됨을 확인.

- orgId=408, tblId=DT_304004_WEEK_002_C, itmId=T001+(매매가격지수), objL1=ALL(지역)
- C1_NM="서울" 행 사용.

⚠️ 2026-09-11 저장 방식 변경: 이전에는 "전주 대비 %"만 계산해서 저장했으나,
   1년치 히스토리·차트를 제대로 보여주려면 **지수 값 자체(레벨)**를 저장해야 한다(사용자 결정).
   전주 대비 %는 이제 web/lib/classify.ts가 연속된 두 레벨을 비교해서 계산한다.
"""

from __future__ import annotations

from ..models import Reading
from .kosis_client import fetch_parameter_data

INDICATOR_ID = "price_index_weekly"
ORG_ID = "408"
TBL_ID = "DT_304004_WEEK_002_C"
REGION_NAME = "서울"
SOURCE_NAME = "KOSIS(국가통계포털) 경유 한국부동산원 주간 아파트 매매가격지수"
SOURCE_URL = "https://kosis.kr/statHtml/statHtml.do?orgId=408&tblId=DT_304004_WEEK_002_C"


def _to_readings(rows: list[dict]) -> list[Reading]:
    seoul = [r for r in rows if r.get("C1_NM") == REGION_NAME]
    readings = []
    for r in seoul:
        prd_de = r["PRD_DE"]  # YYYYMMDD
        as_of = f"{prd_de[:4]}-{prd_de[4:6]}-{prd_de[6:8]}"
        readings.append(
            Reading(
                indicator_id=INDICATOR_ID,
                as_of=as_of,
                value=float(r["DT"]),
                source_name=SOURCE_NAME,
                source_url=SOURCE_URL,
                note="지수 (기준주 2026.7.6=100.0)",
            )
        )
    return readings


def fetch() -> list[Reading]:
    """최신 시점 1건만."""
    rows = fetch_parameter_data(
        ORG_ID, TBL_ID, itm_id="T001+", obj_l1="ALL", obj_l2="", prd_se="D", new_est_prd_cnt=1
    )
    readings = _to_readings(rows)
    if not readings:
        raise RuntimeError("KOSIS 주간 매매가격지수 응답에서 '서울' 행을 찾지 못했습니다.")
    return [max(readings, key=lambda r: r.as_of)]


def fetch_history(weeks: int = 52) -> list[Reading]:
    """백필용 — 최근 N주 전체를 반환."""
    rows = fetch_parameter_data(
        ORG_ID, TBL_ID, itm_id="T001+", obj_l1="ALL", obj_l2="", prd_se="D", new_est_prd_cnt=weeks
    )
    return _to_readings(rows)
