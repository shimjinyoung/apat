"""SQLite 저장 계층.

지표별 시계열 원자료를 저장한다. 스키마는 CLAUDE.md 불변식 §1-2
("모든 값은 출처와 함께 저장")를 그대로 반영한다.
"""

import sqlite3
from pathlib import Path

from .models import Reading

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "aptprice.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS readings (
    indicator_id TEXT NOT NULL,
    as_of        TEXT NOT NULL,
    value        REAL NOT NULL,
    source_name  TEXT NOT NULL,
    source_url   TEXT NOT NULL,
    note         TEXT DEFAULT '',
    collected_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    PRIMARY KEY (indicator_id, as_of)
);
"""


def connect(db_path: Path = DEFAULT_DB_PATH) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute(SCHEMA)
    return conn


def upsert_readings(conn: sqlite3.Connection, readings: list[Reading]) -> int:
    """동일 (indicator_id, as_of)가 이미 있으면 덮어쓴다 (재수집 시 최신값 유지)."""
    # collected_at을 INSERT에서 명시적으로 채운다 — 기존에 만들어진 DB 파일은 테이블 생성 시점의
    # 컬럼 DEFAULT(과거 UTC 버전)가 이미 고정돼 있어, SCHEMA 문자열만 고쳐서는 새 행에 반영되지
    # 않는다(CREATE TABLE IF NOT EXISTS는 기존 테이블을 건드리지 않음).
    conn.executemany(
        """
        INSERT INTO readings (indicator_id, as_of, value, source_name, source_url, note, collected_at)
        VALUES (:indicator_id, :as_of, :value, :source_name, :source_url, :note, datetime('now','localtime'))
        ON CONFLICT(indicator_id, as_of) DO UPDATE SET
            value=excluded.value,
            source_name=excluded.source_name,
            source_url=excluded.source_url,
            note=excluded.note,
            collected_at=datetime('now','localtime')
        """,
        [r.__dict__ for r in readings],
    )
    conn.commit()
    return len(readings)


def latest_readings(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    """지표별 가장 최근 as_of 값 1건씩 조회 (대시보드 연동용)."""
    conn.row_factory = sqlite3.Row
    return conn.execute(
        """
        SELECT r.* FROM readings r
        INNER JOIN (
            SELECT indicator_id, MAX(as_of) AS max_as_of
            FROM readings GROUP BY indicator_id
        ) latest ON r.indicator_id = latest.indicator_id AND r.as_of = latest.max_as_of
        """
    ).fetchall()
