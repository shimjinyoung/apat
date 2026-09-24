"""DB의 최신 지표값을 JSON으로 내보낸다 — 프론트엔드(web/)가 읽는 임시 다리 역할.

사용법:
    .venv/Scripts/python.exe -m data_pipeline.export_json

출력: web/data/latest-readings.generated.json
이 파일은 -1/0/+1 채점을 포함하지 않는다(원자료만). 채점/집계는 web/lib/scoring.ts에서 한다
(CLAUDE.md 불변식 §1-3).
"""

from __future__ import annotations

import json
from pathlib import Path

from . import db

OUTPUT_PATH = Path(__file__).resolve().parent.parent.parent / "web" / "data" / "latest-readings.generated.json"


def export() -> None:
    conn = db.connect()
    rows = db.latest_readings(conn)

    payload = [
        {
            "indicatorId": r["indicator_id"],
            "asOf": r["as_of"],
            "value": r["value"],
            "sourceName": r["source_name"],
            "sourceUrl": r["source_url"],
            "note": r["note"],
            "collectedAt": r["collected_at"],
        }
        for r in rows
    ]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(payload)}개 지표 → {OUTPUT_PATH}")
    conn.close()


if __name__ == "__main__":
    export()
