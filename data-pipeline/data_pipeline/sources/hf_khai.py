"""주택구입부담지수(K-HAI) — 한국주택금융공사 HOUSTAT(주택금융통계시스템) Open API. (2026-10-01 추가, 사용자 요청)

**참고용 표시 시리즈**(채점 미반영) — 화면 7("주택구입 심리 분석") 전용.

K-HAI = 대출상환가능소득 / 중위가구소득 × 100. 100을 기준으로 **높을수록** 중위소득가구가
표준대출로 중위가격 주택을 구입할 때의 **대출상환 부담이 크다**(주택구입이 어려운 상황)는
뜻 — CSI·소비심리지수와 달리 "낮을수록 좋은" 방향이 반대인 지표다.

**분기 단위**로만 발표된다(월간 아님).

**"수도권"(서울+인천+경기) 단일 공식 수치는 여기도 없다** — HOUSTAT의 "지역별비교" 차트가
17개 광역지자체(서울/부산/대구/인천/광주/대전/울산/세종/경기/강원/...)를 개별적으로만
제공함을 직접 확인했다(2026-10-01, 브라우저로 houstat.hf.go.kr 접속해 실제 차트·네트워크
요청 확인). ECOS 주택가격전망CSI(ecos_csi.py)와 같은 이유로 서울·경기·인천 3개 시리즈를
합산 없이 나란히 표시한다.

통계표ID·지역 코드는 브라우저 네트워크 탭으로 houstat.hf.go.kr의 실제 내부 API 호출
(`themeStatPage.do`)을 가로채 확인한 뒤, 공개 Open API(`SttsApiTblData.do`)로 같은 값이
나오는지 재검증했다(2026-10-01) — 추측 금지 원칙 유지.

⚠️ houstat.hf.go.kr은 이 세션 기준 연결이 불안정했다(타임아웃 빈발) — 재시도 로직을 넣었다.
"""

from __future__ import annotations

import time
from datetime import date

import httpx

from ..config import HF_API_KEY, require
from ..models import Reading

BASE_URL = "https://houstat.hf.go.kr/research/openapi/SttsApiTblData.do"
STATBL_ID = "T186503126543136"  # 주택구입부담지수(K-HAI)
SOURCE_NAME = "한국주택금융공사 HOUSTAT(주택금융통계시스템) 주택구입부담지수(K-HAI)"
SOURCE_URL = "https://houstat.hf.go.kr/research/portal/theme/indexStatKHAIPage.do"

# ITM_DATANO — houstat.hf.go.kr 브라우저 네트워크 탭에서 실측 확인(2026-10-01)
SERIES = {
    "khai_seoul": {"itm_datano": 10002, "region_label": "서울"},
    "khai_gyeonggi": {"itm_datano": 10009, "region_label": "경기"},
    "khai_incheon": {"itm_datano": 10005, "region_label": "인천"},
}

_QUARTER_END_MONTH_DAY = {"01": "03-31", "02": "06-30", "03": "09-30", "04": "12-31"}


def _as_of(wrttime: str) -> str:
    year, q = wrttime[:4], wrttime[4:6]
    return f"{year}-{_QUARTER_END_MONTH_DAY[q]}"


def _fetch_quarter_raw(wrttime: str, key: str, attempts: int = 3) -> list[dict]:
    params = {
        "KEY": key,
        "STATBL_ID": STATBL_ID,
        "DTACYCLE_CD": "QY",
        "WRTTIME_IDTFR_ID": wrttime,
        "Type": "json",
        "pSize": 50,
    }
    last_exc: Exception | None = None
    for i in range(attempts):
        try:
            resp = httpx.get(BASE_URL, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()
            body = data.get("SttsApiTblData", [])
            rows = next((b["row"] for b in body if "row" in b), [])
            return rows
        except Exception as exc:  # noqa: BLE001 - 이 사이트가 이 세션 기준 연결이 불안정해 재시도
            last_exc = exc
            if i < attempts - 1:
                time.sleep(2 * (i + 1))
    raise RuntimeError(f"HOUSTAT API 호출 실패({wrttime}, {attempts}회 재시도): {last_exc}")


def _to_readings(wrttime: str, rows: list[dict]) -> list[Reading]:
    by_datano = {s["itm_datano"]: indicator_id for indicator_id, s in SERIES.items()}
    as_of = _as_of(wrttime)
    readings = []
    for r in rows:
        indicator_id = by_datano.get(r.get("ITM_DATANO"))
        if indicator_id is None:
            continue
        region_label = SERIES[indicator_id]["region_label"]
        readings.append(
            Reading(
                indicator_id=indicator_id,
                as_of=as_of,
                value=float(r["DTA_VAL"]),
                source_name=SOURCE_NAME,
                source_url=SOURCE_URL,
                note=f"{wrttime[:4]}년 {int(wrttime[4:6])}분기 주택구입부담지수({region_label}). "
                "참고용 표시 지표 — 채점 미반영. 100 초과=대출상환 부담 큼.",
            )
        )
    return readings


def _quarters_back(count: int) -> list[str]:
    """최근 분기부터 거꾸로 count개 분기의 WRTTIME_IDTFR_ID 목록(과거→최신 순)."""
    today = date.today()
    y, q = today.year, (today.month - 1) // 3 + 1
    out = []
    for _ in range(count):
        out.append(f"{y}{q:02d}")
        q -= 1
        if q < 1:
            q, y = 4, y - 1
    return list(reversed(out))


def fetch_history(quarters: int = 60) -> list[Reading]:
    key = require(HF_API_KEY, "HF_API_KEY", "https://houstat.hf.go.kr/research/portal/openapi/openApiIntroPage.do")
    out: list[Reading] = []
    for wrttime in _quarters_back(quarters):
        rows = _fetch_quarter_raw(wrttime, key)
        out.extend(_to_readings(wrttime, rows))
    return out


def fetch() -> list[Reading]:
    """최근 3개 분기를 조회해 각 시리즈의 최신 1건씩(발표 시차 대비)."""
    key = require(HF_API_KEY, "HF_API_KEY", "https://houstat.hf.go.kr/research/portal/openapi/openApiIntroPage.do")
    readings: list[Reading] = []
    for wrttime in _quarters_back(3):
        rows = _fetch_quarter_raw(wrttime, key)
        readings.extend(_to_readings(wrttime, rows))
    latest: dict[str, Reading] = {}
    for r in readings:
        if r.indicator_id not in latest or r.as_of > latest[r.indicator_id].as_of:
            latest[r.indicator_id] = r
    if not latest:
        raise RuntimeError("HOUSTAT K-HAI 응답이 비어 있습니다.")
    return list(latest.values())
