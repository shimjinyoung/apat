# 문서 목차

이 폴더는 [CLAUDE.md](../CLAUDE.md)(지도)가 가리키는 상세 문서를 담는다.
새 문서를 추가하면 이 표와 CLAUDE.md §4에 한 줄씩 등록한다.

| 문서 | 내용 | 상태 |
|---|---|---|
| [architecture.md](architecture.md) | 시스템 구조: 수집 → 저장 → 스코어링 → 화면 | 뼈대 |
| [data-sources.md](data-sources.md) | 9개 지표별 출처·주기·접근 방식 | 초안(1차 리서치 반영) |
| [scoring-model.md](scoring-model.md) | 스코어링 가중치·채점기준·해석 밴드 | 초안(대화 기반 확정 전) |
| [screens.md](screens.md) | 화면 정의서 | 뼈대(화면 미정) |
| [setup.md](setup.md) | 로컬 개발 환경 셋업 | 뼈대(코드 착수 전) |
| [decisions/](decisions/) | 기술 의사결정 기록(ADR) | 0001, 0002 작성됨 |

## 문서 작성 규칙
- 상태는 `뼈대`(구조만) → `초안`(내용 있으나 미검증) → `확정`(사용자 검토 완료) 3단계로 표기한다.
- myDNA 산출물 규약(History 블록)까지는 강제하지 않지만, 큰 변경 시 파일 하단에 갱신 이력을 남긴다.
