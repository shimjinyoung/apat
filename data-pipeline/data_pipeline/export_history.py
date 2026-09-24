"""DB의 지표별 전체 시계열을 JSON으로 내보낸다 — 프론트엔드 차트/히스토리 모달용.

사용법:
    .venv/Scripts/python.exe -m data_pipeline.export_history

출력: web/data/history.generated.json
{ "<indicator_id>": [ {asOf, value, sourceName, sourceUrl, note, collectedAt}, ... 시간순 정렬 ... ], ... }

이 파일도 -1/0/+1 채점을 포함하지 않는다(원자료만). 채점/집계는 web/lib/classify.ts,scoring.ts에서 한다.
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from . import db

OUTPUT_PATH = Path(__file__).resolve().parent.parent.parent / "web" / "data" / "history.generated.json"


def export() -> None:
    conn = db.connect()
    conn.row_factory = None  # 기본 튜플로 조회 (latest_readings와 달리 sqlite3.Row 불필요)
    rows = conn.execute(
        "SELECT indicator_id, as_of, value, source_name, source_url, note, collected_at "
        "FROM readings ORDER BY indicator_id, as_of"
    ).fetchall()

    by_indicator: dict[str, list[dict]] = defaultdict(list)
    for indicator_id, as_of, value, source_name, source_url, note, collected_at in rows:
        by_indicator[indicator_id].append(
            {
                "asOf": as_of,
                "value": value,
                "sourceName": source_name,
                "sourceUrl": source_url,
                "note": note,
                "collectedAt": collected_at,
            }
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(by_indicator, ensure_ascii=False, indent=2), encoding="utf-8")

    total = sum(len(v) for v in by_indicator.values())
    print(f"{len(by_indicator)}개 지표, 총 {total}행 → {OUTPUT_PATH}")
    conn.close()


if __name__ == "__main__":
    export()
