"""수집기(Collector) 공통 인터페이스.

새 지표를 추가할 때는 이 Protocol을 만족하는 `fetch()`만 구현하면 된다.
(CLAUDE.md 불변식 §1-5: 이용약관·robots.txt를 벗어나는 수집 금지 — 새 수집기 작성 전
반드시 대상 사이트의 robots.txt와 이용약관을 확인할 것. docs/data-sources.md에 확인 결과를 기록한다.)
"""

from typing import Protocol

from ..models import Reading


class Collector(Protocol):
    name: str

    def fetch(self) -> list[Reading]: ...
