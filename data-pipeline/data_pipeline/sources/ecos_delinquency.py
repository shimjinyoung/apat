"""서울 주택담보대출 연체율 — 한국은행 ECOS Open API.

2026-09-13 확인: ECOS는 공식 Open API를 제공(회원가입 후 무료 인증키 발급)해 robots.txt
이슈 자체가 없다(불변식 §1-5 해당 없음). 통계표 코드는 KOSIS 때와 동일한 원칙으로 —
추측하지 않고 ECOS의 메타데이터 API(StatisticTableList/StatisticItemList)로 직접 조회해
확정했다:
  - STAT_CODE = 141Y005 ("1.2.3.7. 예금은행 지역별 연체율")
  - ITEM_CODE1(계정항목) = R5AB0C ("주택관련대출 연체율(전체1M)")
  - ITEM_CODE2(지역코드) = A00 ("서울")
  - ITEM_CODE3(보고기관) = 0960 ("국내은행(수출입은행 포함)")

⚠️ "수도권"(서울+인천+경기) 통합 수치는 이 표에 없다 — 서울/인천/경기가 시·도별로 각각
   별도 행으로만 제공되고, 합산하려면 대출잔액 가중평균이 필요한데 그 가중치 데이터가 없어
   직접 계산이 불가능하다. 다른 9개 지표와 일관되게 서울 단독 값만 사용한다(사용자 확정).

⚠️ 월간 통계지만 확정치 반영에 시차가 있다 — 실제 조회해보니 조회 시점(2026-09-13) 기준
   가장 최근 데이터가 2026-06(3개월 전)이었다. 최신월 요청 시 데이터가 없을 수 있어
   최근 6개월을 조회해 그중 가장 최신 값을 쓴다.
"""

from __future__ import annotations

import httpx

from ..config import ECOS_API_KEY, require
from ..models import Reading

STAT_CODE = "141Y005"
ITEM_CODE1 = "R5AB0C"  # 주택관련대출 연체율(전체1M)
ITEM_CODE2 = "A00"  # 서울
ITEM_CODE3 = "0960"  # 국내은행(수출입은행 포함)
INDICATOR_ID = "mortgage_delinquency"
SOURCE_NAME = "한국은행 ECOS 예금은행 지역별 연체율(주택관련대출, 서울)"
SOURCE_URL = "https://ecos.bok.or.kr/#/SearchStat"


def _yyyymm(s: str) -> str:
    return f"{s[:4]}-{s[4:6]}-01"


def _fetch_rows(start: str, end: str) -> list[dict]:
    key = require(ECOS_API_KEY, "ECOS_API_KEY", "https://ecos.bok.or.kr/api/")
    url = (
        f"https://ecos.bok.or.kr/api/StatisticSearch/{key}/json/kr/1/100/"
        f"{STAT_CODE}/M/{start}/{end}/{ITEM_CODE1}/{ITEM_CODE2}/{ITEM_CODE3}"
    )
    resp = httpx.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if "RESULT" in data:
        # ECOS는 에러도 200 OK로 반환하고 본문에 RESULT.CODE/MESSAGE를 담는다.
        raise RuntimeError(f"ECOS API 오류: {data['RESULT']}")

    return data.get("StatisticSearch", {}).get("row", [])


def _to_readings(rows: list[dict]) -> list[Reading]:
    return [
        Reading(
            indicator_id=INDICATOR_ID,
            as_of=_yyyymm(r["TIME"]),
            value=float(r["DATA_VALUE"]),
            source_name=SOURCE_NAME,
            source_url=SOURCE_URL,
            note="서울 지역 국내은행 주택관련대출 연체율(1개월 이상 연체 기준, %)",
        )
        for r in rows
    ]


def fetch() -> list[Reading]:
    """최신 시점 1건만. ECOS 갱신 시차(약 2~3개월)를 감안해 최근 6개월을 조회 후 가장 최신값을 취한다."""
    from datetime import date

    today = date.today()
    start = f"{today.year - 1}{today.month:02d}"
    end = f"{today.year}{today.month:02d}"
    rows = _fetch_rows(start, end)
    readings = _to_readings(rows)
    if not readings:
        raise RuntimeError("ECOS 응답에서 서울 주택관련대출 연체율 데이터를 찾지 못했습니다.")
    return [max(readings, key=lambda r: r.as_of)]


def fetch_history(start_yyyymm: str, end_yyyymm: str) -> list[Reading]:
    """백필용 — 지정 구간 전체를 반환 (예: start_yyyymm='202409', end_yyyymm='202609')."""
    rows = _fetch_rows(start_yyyymm, end_yyyymm)
    return _to_readings(rows)
