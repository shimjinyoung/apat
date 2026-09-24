"""수동 입력 지표 리더.

아래 지표는 신뢰할 만한 단일 자동 수집 API가 없어 사람이 공식 발표 자료를 보고
`manual_readings.json`에 직접 기록하면, 이 모듈이 그대로 읽어 DB에 반영한다.

- 입주(예정)물량: 국토부 승인통계와 민간 리서치(부동산R114 등)가 기준이 달라
  자동 집계가 부정확할 위험이 커서 수동 기록으로 시작.

⚠️ 2026-09-13: 낙찰률·낙찰가율은 지지옥션(ggi.co.kr) robots.txt 차단으로 여기서 수동
관리했었으나, 법원경매정보(courtauction.go.kr) 공식 API를 발견해 `courtauction_stats.py`로
자동화 전환했다(지표 재정의, 사용자 결정). 이 파일에서는 더 이상 다루지 않는다.
"""

from __future__ import annotations

import json
from pathlib import Path

from ..models import Reading

MANUAL_FILE = Path(__file__).resolve().parent.parent.parent / "manual_readings.json"


def fetch() -> list[Reading]:
    if not MANUAL_FILE.exists():
        return []

    entries = json.loads(MANUAL_FILE.read_text(encoding="utf-8"))
    return [
        Reading(
            indicator_id=e["indicator_id"],
            as_of=e["as_of"],
            value=e["value"],
            source_name=e["source_name"],
            source_url=e["source_url"],
            note=e.get("note", "수동 입력"),
        )
        for e in entries
    ]
