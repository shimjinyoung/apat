"""서울 아파트 전세시장 지표 2종 — KOSIS 경유 (한국부동산원 원자료).

## 1) 전세가격지수 → fetch_price_index() / fetch_price_index_history() (jeonse_ratio 자리 대신 사용)
"주간 아파트 전세가격지수" (매매가격지수와 동일 구조).
- orgId=408, tblId=DT_304004_WEEK_004_C, itmId=T001+, objL1=ALL

⚠️ **지표 재정의**: 원래 잡았던 "전세가율"(전세가/매매가 비율, %)은 KOSIS에 해당 표가 없어서
   확인하지 못했다. 대신 매매가격지수와 동일한 방식의 "전세가격지수" 레벨로 대체(사용자 확정,
   docs/scoring-model.md §7 참고). 전주 대비 %는 web/lib/classify.ts가 연속된 레벨을 비교해서 계산.

## 2) 전세수급동향(지수) → fetch_supply_demand() / fetch_supply_demand_history()
"주요지역별 전세수급동향" — 100 기준선 diffusion index.
- orgId=408, tblId=DT_40803_N0009, itmId=index+, objL1=ALL(주택유형), objL2=ALL(지역)
- C1_NM="아파트" & C2_NM="서울" 행 사용. **월간**, 발표 시차 약 1개월.
"""

from __future__ import annotations

from ..models import Reading
from .kosis_client import fetch_parameter_data

ORG_ID = "408"
REGION_NAME = "서울"

JEONSE_INDEX_INDICATOR_ID = "jeonse_ratio"  # TODO: ID 자체도 jeonse_price_index 등으로 개명 검토
JEONSE_INDEX_TBL_ID = "DT_304004_WEEK_004_C"
JEONSE_INDEX_SOURCE_NAME = "KOSIS(국가통계포털) 경유 한국부동산원 주간 아파트 전세가격지수"
JEONSE_INDEX_SOURCE_URL = "https://kosis.kr/statHtml/statHtml.do?orgId=408&tblId=DT_304004_WEEK_004_C"

SUPPLY_DEMAND_INDICATOR_ID = "jeonse_supply_demand_index"
SUPPLY_DEMAND_TBL_ID = "DT_40803_N0009"
SUPPLY_DEMAND_SOURCE_NAME = "KOSIS(국가통계포털) 경유 한국부동산원 전세수급동향"
SUPPLY_DEMAND_SOURCE_URL = "https://kosis.kr/statHtml/statHtml.do?orgId=408&tblId=DT_40803_N0009"


def _price_index_readings(rows: list[dict]) -> list[Reading]:
    seoul = [r for r in rows if r.get("C1_NM") == REGION_NAME]
    readings = []
    for r in seoul:
        prd_de = r["PRD_DE"]  # YYYYMMDD
        as_of = f"{prd_de[:4]}-{prd_de[4:6]}-{prd_de[6:8]}"
        readings.append(
            Reading(
                indicator_id=JEONSE_INDEX_INDICATOR_ID,
                as_of=as_of,
                value=float(r["DT"]),
                source_name=JEONSE_INDEX_SOURCE_NAME,
                source_url=JEONSE_INDEX_SOURCE_URL,
                note="전세가격지수 (기준주 2026.7.6=100.0) — 원래 '전세가율' 대신 대체",
            )
        )
    return readings


def fetch_price_index() -> list[Reading]:
    rows = fetch_parameter_data(
        ORG_ID, JEONSE_INDEX_TBL_ID, itm_id="T001+", obj_l1="ALL", obj_l2="", prd_se="D", new_est_prd_cnt=1
    )
    readings = _price_index_readings(rows)
    if not readings:
        raise RuntimeError("KOSIS 주간 전세가격지수 응답에서 '서울' 행을 찾지 못했습니다.")
    return [max(readings, key=lambda r: r.as_of)]


def fetch_price_index_history(weeks: int = 52) -> list[Reading]:
    rows = fetch_parameter_data(
        ORG_ID,
        JEONSE_INDEX_TBL_ID,
        itm_id="T001+",
        obj_l1="ALL",
        obj_l2="",
        prd_se="D",
        new_est_prd_cnt=weeks,
    )
    return _price_index_readings(rows)


def _supply_demand_readings(rows: list[dict]) -> list[Reading]:
    seoul_apt = [r for r in rows if r.get("C1_NM") == "아파트" and r.get("C2_NM") == REGION_NAME]
    readings = []
    for r in seoul_apt:
        prd_de = r["PRD_DE"]  # YYYYMM
        as_of = f"{prd_de[:4]}-{prd_de[4:6]}-01"
        readings.append(
            Reading(
                indicator_id=SUPPLY_DEMAND_INDICATOR_ID,
                as_of=as_of,
                value=float(r["DT"]),
                source_name=SUPPLY_DEMAND_SOURCE_NAME,
                source_url=SUPPLY_DEMAND_SOURCE_URL,
                note="100 기준선 diffusion index, 100 초과=전세 수요 우위(품귀). 월간, 약 1개월 발표 시차",
            )
        )
    return readings


def fetch_supply_demand() -> list[Reading]:
    rows = fetch_parameter_data(
        ORG_ID, SUPPLY_DEMAND_TBL_ID, itm_id="index+", obj_l1="ALL", obj_l2="ALL", prd_se="M", new_est_prd_cnt=1
    )
    readings = _supply_demand_readings(rows)
    if not readings:
        raise RuntimeError("KOSIS 전세수급동향 응답에서 '아파트/서울' 행을 찾지 못했습니다.")
    return [max(readings, key=lambda r: r.as_of)]


def fetch_supply_demand_history(months: int = 12) -> list[Reading]:
    rows = fetch_parameter_data(
        ORG_ID,
        SUPPLY_DEMAND_TBL_ID,
        itm_id="index+",
        obj_l1="ALL",
        obj_l2="ALL",
        prd_se="M",
        new_est_prd_cnt=months,
    )
    return _supply_demand_readings(rows)
