"""KOSIS(국가통계포털) OpenAPI 공용 클라이언트.

가입/키 발급: https://kosis.kr/openapi (회원가입 → Open API 활용신청 → 마이페이지에서 인증키 확인)

⚠️ 2026-09-10에 실제 KOSIS 표 화면의 "OPENAPI URL생성" 기능으로 검증한 결과, 통계자료 조회는
   `statisticsData.do`가 아니라 **`Param/statisticsParameterData.do`**를 써야 하며,
   `itmId`/`objL1`/`objL2`를 빈 문자열이 아니라 **"ALL"**로 채워야 정상 동작한다.
   (처음에 statisticsData.do + 빈 objL1로 시도했다가 "필수요청변수값이 누락되었습니다" 오류가
   계속 났던 이유가 이것이었음 — 반드시 대상 표의 KOSIS 화면에서 URL생성 기능으로 실제 예시를
   먼저 뽑아본 뒤 구현할 것. 파라미터를 추측해서 채우지 않는다.)

새 통계표를 연동하려면 KOSIS 표 화면 상단의 "OPENAPI" 버튼 → URL생성 모달에서
orgId/tblId/itmId/objL1~8/prdSe 조합을 그대로 확인해 아래 함수에 넘긴다.
"""

from __future__ import annotations

import httpx

from ..config import KOSIS_API_KEY, require

PARAM_DATA_URL = "https://kosis.kr/openapi/Param/statisticsParameterData.do"


def fetch_parameter_data(
    org_id: str,
    tbl_id: str,
    itm_id: str = "ALL",
    obj_l1: str = "ALL",
    obj_l2: str = "ALL",
    *,
    prd_se: str = "M",  # M=월, Y=년, Q=분기 — 표마다 지원 주기가 다르니 KOSIS 화면에서 확인
    new_est_prd_cnt: int = 3,
) -> list[dict]:
    """최근 N개 시점 데이터를 조회한다 (KOSIS 표 화면 기본 URL생성 방식과 동일)."""
    api_key = require(KOSIS_API_KEY, "KOSIS_API_KEY", "https://kosis.kr/openapi")

    params = {
        "method": "getList",
        "apiKey": api_key,
        "itmId": itm_id,
        "objL1": obj_l1,
        "objL2": obj_l2,
        "objL3": "",
        "objL4": "",
        "objL5": "",
        "objL6": "",
        "objL7": "",
        "objL8": "",
        "format": "json",
        "jsonVD": "Y",
        "prdSe": prd_se,
        "newEstPrdCnt": new_est_prd_cnt,
        "orgId": org_id,
        "tblId": tbl_id,
    }
    resp = httpx.get(PARAM_DATA_URL, params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    if isinstance(data, dict) and "err" in data:
        raise RuntimeError(f"KOSIS API 오류(orgId={org_id}, tblId={tbl_id}): {data}")

    return data
