"""서울 아파트 경매 진행건수 — 태인경매(taein.co.kr) 낙찰통계 API.

2026-09-13 확인: taein.co.kr의 robots.txt는 `/auction/statistics/`를 막지 않는다
(다른 몇몇 상세페이지만 Disallow) — 불변식 §1-5 위반 아님, 자동 수집 가능.

taein.co.kr의 "낙찰통계" 화면(지역+용도+기간 필터)이 내부적으로 호출하는 JSON API를
그대로 사용한다. 페이지의 공개 JS 파일(main_stat.js)에서 요청 파라미터(cmd/addr1/yongdo/term)를
확인하고, 실제 호출로 응답 형식을 검증했다.

⚠️ **지표 재정의(2026-09-13, 사용자 결정)**: 처음엔 "전체 경매물건 중 아파트 비중(%)"으로
   구현했으나, "전체" 분모에 토지·차량·공장 등 주택시장과 무관한 항목이 섞여 있어 노이즈가 컸다.
   대신 **서울 아파트 경매 진행건수(절대량)** 자체를 지표로 쓴다 — 건수가 늘면 부실(대출 연체·
   강제매각) 확산 신호(비우호), 정점 찍고 줄면 부실 정리 마무리 신호(우호). indicator_id도
   `auction_apt_share`에서 `auction_case_count`로 변경(이 지표는 오늘 막 만들어져 히스토리가
   1건뿐이라 이름을 바꿔도 하위호환 부담이 없음).

⚠️ 이 API는 "최근 N개월 롤링" 조회만 지원하고 특정 과거 달을 지정할 수 없다 — 그래서 과거
백필은 불가능하고, 오늘부터 매일 수집해 히스토리를 쌓는다(as_of=수집일).
"""

from __future__ import annotations

from datetime import date

import httpx

from ..models import Reading

QUERY_URL = "https://www.taein.co.kr/auction/statistics/include/mainQuery.php"
INDICATOR_ID = "auction_case_count"
SOURCE_NAME = "태인경매 낙찰통계(최근 1개월 롤링)"
SOURCE_URL = "https://www.taein.co.kr/auction/statistics/main_stat.php"

HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded;",
    "User-Agent": "Mozilla/5.0 (compatible; aptprice-trend-bot/1.0)",
}


def fetch() -> list[Reading]:
    with httpx.Client() as client:
        resp = client.post(
            QUERY_URL,
            data={"cmd": "sch_nak_summary", "addr1": "서울", "yongdo": "01", "term": "1"},
            headers=HEADERS,
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()

    if data.get("rtn_code") != "OK":
        raise RuntimeError(f"태인경매 API 오류: {data}")

    apt_count = int(data["result"]["ingcnt"].replace(",", ""))
    as_of = date.today().isoformat()

    return [
        Reading(
            indicator_id=INDICATOR_ID,
            as_of=as_of,
            value=float(apt_count),
            source_name=SOURCE_NAME,
            source_url=SOURCE_URL,
            note="최근 1개월 롤링 기준 서울 아파트 경매 진행건수",
        )
    ]
