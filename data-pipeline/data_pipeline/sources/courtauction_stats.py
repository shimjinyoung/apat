"""서울 아파트 낙찰률·낙찰가율 — 대한민국 법원 법원경매정보(courtauction.go.kr) 공식 API.

2026-09-13 확인: courtauction.go.kr은 robots.txt 자체가 존재하지 않는다(직접 요청 시 진짜 404,
브라우저가 낯선 경로에 보여주는 "시스템 작업 안내"는 WAF의 안내 페이지일 뿐 실제 차단이 아님) —
불변식 §1-5 문제 없음.

"매각통계 > 용도별 매각통계" 화면(서울특별시 + 물건용도=아파트로 조회 시)이 내부적으로 호출하는
JSON API를 그대로 사용한다. XHR을 가로채 실제 요청 바디를 확인했고, 세션 쿠키(GET으로 먼저
부트스트랩 페이지를 열어 JSESSIONID 확보) + 정상적인 브라우저 User-Agent만 있으면 로그인 없이
호출된다(PowerShell로 무상태 재현 검증 완료).

응답의 `lclAuctnGdsUsgCd` 코드로 "아파트" 행(코드 "0")을 정확히 골라낸다 — 이름 문자열 매칭보다
안전하다. `dspslRate`(매각율)=낙찰률, `dspslAmtRate`(매각가율)=낙찰가율로 그대로 매핑된다
(용어 정의가 사이트에 명시: 매각율=(매각건수/경매건수)*100, 매각가율=(매각가/감정가)*100).

⚠️ **지표 재정의(2026-09-13, 사용자 결정)**: 기존에는 지지옥션(ggi.co.kr) 통계를 인용한 뉴스
기사를 웹 검색으로 찾아 수동 입력했다(`manual_readings.json`, 참고용 성격). 이 API로 전환하면서
**대법원 원자료 기준으로 재정의** — 지지옥션 수치(예: 2026-08 37.1%/97%)와 법원 공식치(같은 달
33.5%/95.5%)가 비슷하지만 정확히 같지는 않다(집계 방법론 차이로 추정, 태인경매 vs 지지옥션
사례와 동일한 패턴). 기존 지지옥션 백필값은 폐기하고 이 API로 12개월 재백필한다.

⚠️ 조회 기간은 1년 이내로 제한되며, 월별 합산이 아니라 매번 "그 구간 전체"의 집계이므로
백필 시 반드시 월 단위로 하나씩 개별 호출해야 한다(예: 2025-09~2026-08을 한 번에 조회하면
14개월 누적치가 나와 월별 값을 못 얻는다).
"""

from __future__ import annotations

import calendar
from datetime import date

import httpx

from ..models import Reading

BOOTSTRAP_URL = "https://www.courtauction.go.kr/pgj/index.on?w2xPath=%2Fpgj%2Fui%2Fpgj100%2FPGJ164M01.xml"
STATS_URL = "https://www.courtauction.go.kr/pgj/pgj164/selectRletCortDspslStats.on"
SEOUL_SD_CD = "11"
APARTMENT_USG_CD = "0"

SOURCE_NAME = "대법원 법원경매정보 용도별 매각통계(서울, 아파트)"
SOURCE_URL = BOOTSTRAP_URL

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)


def _client() -> httpx.Client:
    client = httpx.Client(headers={"User-Agent": BROWSER_UA}, timeout=20)
    client.get(BOOTSTRAP_URL)  # 세션 쿠키(JSESSIONID) 확보 — 이게 없으면 500 에러
    return client


def _fetch_month_row(client: httpx.Client, yyyymm: str) -> dict | None:
    resp = client.post(
        STATS_URL,
        json={
            "dma_search": {
                "searchType": "02",
                "cortOfcCd": "B000210",
                "adongSdCd": SEOUL_SD_CD,
                "adongSggCd": "",
                "startDate": yyyymm,
                "endDate": yyyymm,
            }
        },
        headers={
            "Referer": BOOTSTRAP_URL,
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Origin": "https://www.courtauction.go.kr",
        },
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != 200:
        raise RuntimeError(f"법원경매정보 API 오류: {data}")
    rows = data.get("data", {}).get("rletCortDspslStats", []) or []
    return next((r for r in rows if r.get("lclAuctnGdsUsgCd") == APARTMENT_USG_CD), None)


def _month_end(yyyymm: str) -> str:
    y, m = int(yyyymm[:4]), int(yyyymm[4:6])
    last_day = calendar.monthrange(y, m)[1]
    return f"{y}-{m:02d}-{last_day:02d}"


def _to_readings(yyyymm: str, row: dict) -> list[Reading]:
    as_of = _month_end(yyyymm)
    auctn_num = int(row["auctnNum"])
    dspsl_num = int(row["dspslNum"])
    note = f"{yyyymm[:4]}-{yyyymm[4:]} 서울 아파트 경매 {auctn_num}건 중 {dspsl_num}건 매각(법원 공식 집계)"
    return [
        Reading(
            indicator_id="auction_win_rate",
            as_of=as_of,
            value=float(row["dspslRate"]),
            source_name=SOURCE_NAME,
            source_url=SOURCE_URL,
            note=note,
        ),
        Reading(
            indicator_id="auction_win_price_ratio",
            as_of=as_of,
            value=float(row["dspslAmtRate"]),
            source_name=SOURCE_NAME,
            source_url=SOURCE_URL,
            note=note,
        ),
    ]


def _prev_yyyymm(yyyymm: str) -> str:
    y, m = int(yyyymm[:4]), int(yyyymm[4:6])
    if m == 1:
        return f"{y - 1}12"
    return f"{y}{m - 1:02d}"


def fetch() -> list[Reading]:
    """최신 시점 1건만. 이번 달 데이터가 아직 없으면(경매건수 0) 전월로 폴백한다."""
    today = date.today()
    yyyymm = f"{today.year}{today.month:02d}"
    client = _client()
    try:
        row = _fetch_month_row(client, yyyymm)
        if row is None or int(row["auctnNum"]) == 0:
            yyyymm = _prev_yyyymm(yyyymm)
            row = _fetch_month_row(client, yyyymm)
    finally:
        client.close()
    if row is None:
        raise RuntimeError("법원경매정보 응답에서 '아파트' 행을 찾지 못했습니다.")
    return _to_readings(yyyymm, row)


def fetch_history(start_yyyymm: str, end_yyyymm: str) -> list[Reading]:
    """백필용 — start~end 사이 각 달을 개별 호출한다(합산 집계 API라 월별로 따로 조회 필요)."""
    readings: list[Reading] = []
    client = _client()
    try:
        yyyymm = start_yyyymm
        while yyyymm <= end_yyyymm:
            row = _fetch_month_row(client, yyyymm)
            if row is not None and int(row["auctnNum"]) > 0:
                readings.extend(_to_readings(yyyymm, row))
            y, m = int(yyyymm[:4]), int(yyyymm[4:6])
            y, m = (y + 1, 1) if m == 12 else (y, m + 1)
            yyyymm = f"{y}{m:02d}"
    finally:
        client.close()
    return readings
