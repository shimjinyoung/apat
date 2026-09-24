"""공용 데이터 모델.

이 모듈은 '원자료(raw value)'만 다룬다. -1/0/+1 채점(스코어링)은 여기서 하지 않는다.
CLAUDE.md 불변식 §1-3: 스코어링 계산은 web/lib/scoring.ts 단일 모듈에서만 수행한다.
파이프라인의 책임은 "출처가 명확한 값을 정확히 수집해 저장"하는 것까지다.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Reading:
    indicator_id: str  # web/lib/indicators.ts 의 IndicatorId 와 반드시 일치
    as_of: str  # ISO 날짜 (YYYY-MM-DD), 통계 기준일
    value: float
    source_name: str
    source_url: str
    note: str = ""
