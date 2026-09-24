"""서울 아파트 매매거래량 — 국토부 실거래가 Open API (공공데이터포털).

API: getRTMSDataSvcAptTradeDev (data.go.kr "국토교통부_아파트매매 실거래 상세 자료")
공식 신청처: https://www.data.go.kr/data/15126468/openapi.do
서비스 URL: https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev

⚠️ 구 도메인(openapi.molit.go.kr)은 2026-09-10 진단 결과 DNS가 127.0.0.1로 반환되어
   더 이상 살아있지 않음을 확인 — data.go.kr이 통합 게이트웨이(apis.data.go.kr)로 이전한
   것으로 보임. 반드시 위 apis.data.go.kr 주소를 사용할 것.

⚠️ serviceKey는 본인이 data.go.kr에서 직접 회원가입 후 발급받아 .env(MOLIT_SERVICE_KEY)에 넣어야 한다.
   (CLAUDE.md 프로젝트 금지 사항: Claude가 대신 계정을 만들 수 없음)

서울 25개 구의 법정동코드(앞 5자리, LAWD_CD)로 각각 조회한 뒤 건수를 합산해
"서울 전체 아파트 매매거래량"을 만든다.
"""

from __future__ import annotations

from datetime import date
from urllib.parse import unquote
from xml.etree import ElementTree

import httpx

from ..config import MOLIT_SERVICE_KEY, require
from ..models import Reading

SERVICE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"

# 서울 25개 자치구 법정동코드(5자리). 출처: 행정표준코드관리시스템(code.go.kr) 법정동코드
# ⚠️ 파이프라인 최초 가동 전, code.go.kr에서 최신 코드로 한 번 대조 확인 권장.
SEOUL_GU_CODES: dict[str, str] = {
    "종로구": "11110", "중구": "11140", "용산구": "11170", "성동구": "11200",
    "광진구": "11215", "동대문구": "11230", "중랑구": "11260", "성북구": "11290",
    "강북구": "11305", "도봉구": "11320", "노원구": "11350", "은평구": "11380",
    "서대문구": "11410", "마포구": "11440", "양천구": "11470", "강서구": "11500",
    "구로구": "11530", "금천구": "11545", "영등포구": "11560", "동작구": "11590",
    "관악구": "11620", "서초구": "11650", "강남구": "11680", "송파구": "11710",
    "강동구": "11740",
}

INDICATOR_ID = "trade_volume"


def _count_trades_for_gu(client: httpx.Client, lawd_cd: str, deal_ymd: str, service_key: str) -> int:
    all_rows = 0
    page_no = 1
    while True:
        resp = client.get(
            SERVICE_URL,
            params={
                "serviceKey": service_key,
                "LAWD_CD": lawd_cd,
                "DEAL_YMD": deal_ymd,
                "pageNo": page_no,
                "numOfRows": 1000,
            },
            timeout=20,
        )
        resp.raise_for_status()
        root = ElementTree.fromstring(resp.text)

        result_code = root.findtext(".//resultCode")
        if result_code not in (None, "00", "000"):
            msg = root.findtext(".//resultMsg")
            raise RuntimeError(f"MOLIT API 오류(LAWD_CD={lawd_cd}): {result_code} {msg}")

        items = root.findall(".//item")
        all_rows += len(items)

        total_count = int(root.findtext(".//totalCount", default="0") or 0)
        if page_no * 1000 >= total_count:
            break
        page_no += 1

    return all_rows


def fetch(deal_ymd: str | None = None) -> list[Reading]:
    """deal_ymd: YYYYMM. 생략 시 전월(직전 달)을 사용한다 (당월은 신고 기한 미도래로 불완전)."""
    raw_key = require(
        MOLIT_SERVICE_KEY,
        "MOLIT_SERVICE_KEY",
        "https://www.data.go.kr/data/15126468/openapi.do",
    )
    # data.go.kr는 "Encoding"/"Decoding" 두 버전의 키를 함께 발급하는데, httpx가 쿼리스트링을
    # 만들 때 값을 다시 인코딩하므로 Encoding 버전을 그대로 쓰면 이중 인코딩되어 403이 난다.
    # unquote로 먼저 원문으로 되돌려 두면 어느 버전을 넣어도 안전하다.
    service_key = unquote(raw_key)

    if deal_ymd is None:
        today = date.today()
        prev_month = today.month - 1 or 12
        prev_year = today.year if today.month > 1 else today.year - 1
        deal_ymd = f"{prev_year}{prev_month:02d}"

    total = 0
    with httpx.Client() as client:
        for gu_code in SEOUL_GU_CODES.values():
            total += _count_trades_for_gu(client, gu_code, deal_ymd, service_key)

    as_of = f"{deal_ymd[:4]}-{deal_ymd[4:6]}-01"
    return [
        Reading(
            indicator_id=INDICATOR_ID,
            as_of=as_of,
            value=float(total),
            source_name="국토부 실거래가 Open API (data.go.kr)",
            source_url="https://www.data.go.kr/data/15126468/openapi.do",
            note=f"서울 25개 구 합산, 신고 기준월 {deal_ymd} (신고기한 30일 유의)",
        )
    ]


def _shift_month(year: int, month: int, offset: int) -> tuple[int, int]:
    total = (year * 12 + (month - 1)) - offset
    return total // 12, total % 12 + 1


def fetch_history(months: int = 12) -> list[Reading]:
    """백필용 — 최근 N개월 전체(전월부터 역순 N개월)를 반환. 월당 25회 API 호출이 필요해 다소 느리다."""
    today = date.today()
    base_year, base_month = _shift_month(today.year, today.month, 1)  # 전월부터 시작

    readings: list[Reading] = []
    for offset in range(months):
        y, m = _shift_month(base_year, base_month, offset)
        deal_ymd = f"{y}{m:02d}"
        readings.extend(fetch(deal_ymd))
    return readings
