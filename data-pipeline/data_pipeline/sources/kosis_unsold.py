"""서울 미분양 현황(월간) — KOSIS 경유 (국토교통부 원자료).

2026-09-10 사용자가 KOSIS 표 화면에서 OPENAPI URL생성으로 뽑아준 예시 덕에
`Param/statisticsParameterData.do` + `objL1/objL2="ALL"` 조합이 정확한 호출 방식임을 확인했고,
그 방식으로 애초에 추측했던 `tblId=DT_MLTM_2082`("시·군·구별 미분양현황")를 재시도한 결과
**월간(PRD_SE=M) 데이터가 실제로 존재**함을 확인했다.
(반면 "미분양현황_종합"(DT_MLTM_2086)은 연말 12월 기준 스냅샷만 제공 — kosis_unsold_annual 로
이름 붙이지 않고 이 표로 교체한 이유.)

- orgId=116(국토교통부), tblId=DT_MLTM_2082, itmId=ALL
- C1(시도)="서울", C2(시군구)="계" → 서울시 전체 미분양 월간 합계

⚠️ 범위를 "전국"이 아니라 "서울"로 좁혔다 — 이 프로젝트의 다른 지표(낙찰률·매매가격지수·거래량·
전세가율 등)가 전부 "서울" 기준이라 지표 체계 일관성상 이쪽이 맞다(docs/scoring-model.md 갱신 필요).
⚠️ 이 표는 "준공후 미분양" 구분이 없다 — 시군구별 총계만 제공. 준공후 구분이 필요해지면
별도 표를 추가로 찾아야 한다(TODO).
"""

from __future__ import annotations

from ..models import Reading
from .kosis_client import fetch_parameter_data

INDICATOR_ID = "unsold_housing"
ORG_ID = "116"
TBL_ID = "DT_MLTM_2082"
REGION_NAME = "서울"
SOURCE_NAME = "KOSIS(국가통계포털) 경유 국토교통부 시·군·구별 미분양현황"
SOURCE_URL = "https://kosis.kr/statHtml/statHtml.do?orgId=116&tblId=DT_MLTM_2082"

# 서울(C1)/계(C2) 전용 분류코드. objL1/objL2를 ALL로 두고 여러 달을 요청하면
# "40,000셀 초과" 오류가 난다(전국 시군구 × 전체 기간 조합이 너무 큼) — 2026-09-11 확인.
# 특정 코드로 좁혀서 요청량을 줄인다.
SEOUL_C1_CODE = "13102871087A.0002"
TOTAL_C2_CODE = "13102871087B.0001"


def _to_readings(rows: list[dict]) -> list[Reading]:
    totals = [r for r in rows if r.get("C1_NM") == REGION_NAME and r.get("C2_NM") == "계"]
    readings = []
    for r in totals:
        prd_de = r["PRD_DE"]  # YYYYMM
        as_of = f"{prd_de[:4]}-{prd_de[4:6]}-01"
        readings.append(
            Reading(
                indicator_id=INDICATOR_ID,
                as_of=as_of,
                value=float(r["DT"]),
                source_name=SOURCE_NAME,
                source_url=SOURCE_URL,
                note="서울시 전체(25개 구 합계), 월간. 준공후 미분양 구분은 이 표에 없음",
            )
        )
    return readings


def fetch() -> list[Reading]:
    rows = fetch_parameter_data(
        ORG_ID, TBL_ID, itm_id="ALL", obj_l1=SEOUL_C1_CODE, obj_l2=TOTAL_C2_CODE, prd_se="M", new_est_prd_cnt=3
    )
    readings = _to_readings(rows)
    if not readings:
        raise RuntimeError(f"KOSIS 미분양 응답에서 '{REGION_NAME}/계' 행을 찾지 못했습니다.")
    return [max(readings, key=lambda r: r.as_of)]


def fetch_history(months: int = 12) -> list[Reading]:
    rows = fetch_parameter_data(
        ORG_ID,
        TBL_ID,
        itm_id="ALL",
        obj_l1=SEOUL_C1_CODE,
        obj_l2=TOTAL_C2_CODE,
        prd_se="M",
        new_est_prd_cnt=months,
    )
    return _to_readings(rows)
