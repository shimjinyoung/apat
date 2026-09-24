"""서울 아파트 매매 실거래 평균가격(㎡당) — KOSIS 경유 (한국부동산원 원자료).

2026-09-14 추가. **스코어링에 참여하지 않는 참고용 표시 지표**다(불변식 §1-1의 9(10)개
채점 지표 체계와는 별개 — `web/lib/indicators.ts`의 `INDICATORS` 배열에는 넣지 않는다).
"서울 아파트 주간 매매가격지수"(지수, 기준=100)만으로는 실제 체감 가격이 안 와닿는다는
사용자 요청으로, 지수 옆에 같이 보여줄 "㎡당 실거래 평균가격(만원)"을 자동 수집한다.

- orgId=408, tblId=DT_KAB_11672_S15("아파트 매매 실거래 평균가격"), 단위 만원/㎡, 월간
- ⚠️ 이 표는 `objL2`를 다른 KOSIS 표처럼 "ALL"로 채우면 err21(잘못된 요청 파라미터)이
  난다 — 반드시 **빈 문자열**이어야 한다. itmId="ALL"(또는 "T001", 이 표엔 "가격" 단일
  항목만 있음). C1_NM="서울" 행 사용 — 실제 호출 결과를 KOSIS UI 화면에 뜨는 값과
  대조해 일치함을 확인했다(2026-01 화면 1,549.2 ≈ API 1,549.1638...).
- 실거래 신고 특성상 최신월은 아직 신고가 덜 끝나 낮게 잡히는 경향이 있다(거래량 지표와
  동일한 이슈, docs/data-sources.md 참고) — 그대로 저장하고 화면에서 참고용으로만 쓴다.
"""

from __future__ import annotations

from ..models import Reading
from .kosis_client import fetch_parameter_data

INDICATOR_ID = "price_avg_per_sqm"
ORG_ID = "408"
TBL_ID = "DT_KAB_11672_S15"
REGION_NAME = "서울"
SOURCE_NAME = "KOSIS(국가통계포털) 경유 한국부동산원 아파트 매매 실거래 평균가격"
SOURCE_URL = "https://kosis.kr/statHtml/statHtml.do?orgId=408&tblId=DT_KAB_11672_S15"


def _to_readings(rows: list[dict]) -> list[Reading]:
    seoul = [r for r in rows if r.get("C1_NM") == REGION_NAME]
    readings = []
    for r in seoul:
        prd_de = r["PRD_DE"]  # YYYYMM
        as_of = f"{prd_de[:4]}-{prd_de[4:6]}-01"
        readings.append(
            Reading(
                indicator_id=INDICATOR_ID,
                as_of=as_of,
                value=round(float(r["DT"]), 1),
                source_name=SOURCE_NAME,
                source_url=SOURCE_URL,
                note=f"{prd_de[:4]}-{prd_de[4:6]} 서울 아파트 실거래 평균가격(㎡당 만원). 참고용 표시 지표 — 채점 미반영.",
            )
        )
    return readings


def fetch() -> list[Reading]:
    """최신 시점 1건만."""
    rows = fetch_parameter_data(
        ORG_ID, TBL_ID, itm_id="ALL", obj_l1="ALL", obj_l2="", prd_se="M", new_est_prd_cnt=1
    )
    readings = _to_readings(rows)
    if not readings:
        raise RuntimeError("KOSIS 아파트 실거래 평균가격 응답에서 '서울' 행을 찾지 못했습니다.")
    return [max(readings, key=lambda r: r.as_of)]


def fetch_history(months: int = 12) -> list[Reading]:
    """백필용 — 최근 N개월 전체를 반환."""
    rows = fetch_parameter_data(
        ORG_ID, TBL_ID, itm_id="ALL", obj_l1="ALL", obj_l2="", prd_se="M", new_est_prd_cnt=months
    )
    return _to_readings(rows)
