# 아파트 매수 타이밍 판단 앱 — CLAUDE.md

> 이 파일은 **지도(map)**다. 매뉴얼이 아니다.
> "9개 지표를 통합 조회하고, 가중 스코어링으로 매수 타이밍 국면을 판단한다"는 목적 외에
> 세부 규칙은 전부 `docs/`와 `.claude/commands/`에 있다. 여기서는 그것들의 위치만 안내한다.

## 0. 한 줄 정의
부동산 경매·가격·거래·전세·공급 9개 지표를 자동 수집 → 가중 스코어링(0~100점) →
대시보드로 시각화해 "지금이 매수를 검토할 국면인지"를 정량적으로 보여주는 개인 프로젝트.

## 1. 불변식 (Invariants — 반드시 지킬 것, 구현 방법은 자유)

이 아래 항목은 **어떻게 구현하든 상관없지만 절대 깨서는 안 되는 규칙**이다.
새 기능을 추가하거나 리팩터링할 때, 먼저 이 목록에 위배되지 않는지 확인한다.

1. **9개 지표 체계는 `docs/scoring-model.md`가 유일한 원천(single source of truth)**이다.
   지표 추가/삭제/가중치 변경은 코드에서 임의로 하지 않고, 이 문서를 먼저 갱신한다.
2. **모든 수치·지표 값은 출처 링크를 함께 저장한다.** 출처 없는 하드코딩 금지.
   출처 목록은 `docs/data-sources.md`.
3. **스코어링 계산 로직은 프론트엔드/백엔드 어디에 있든 단일 함수(또는 단일 모듈)로만 존재**해야 한다.
   같은 계산식이 두 곳에 중복 구현되는 것 금지 — GAP·밴드 기준이 벌어지면 신뢰도가 무너짐.
4. **`.env`, `.env.*` 파일은 Claude가 직접 열람·수정·커밋하지 않는다.** (`.claude/hooks` 강제)
5. **원본 데이터 API/스크래핑 대상 사이트의 이용약관·robots.txt를 벗어나는 방식(로그인 우회, 과도한 트래픽 등)으로 수집하지 않는다.**
6. **화면을 새로 추가할 때는 `docs/screens.md`에 화면 정의를 먼저 남긴다.** (`/new-screen` 참조)
7. **git 커밋/배포는 사용자가 명시적으로 요청했을 때만 실행한다.** (하네스 공통 원칙, 이 프로젝트도 예외 없음)

## 2. 구현 자유 영역
아래는 담당자(Claude 포함) 재량으로 결정한다. 다만 결정하면 `docs/decisions/`에 짧게 기록한다(ADR).
- 컴포넌트/폴더 구조, 상태관리 방식, 차트 라이브러리 선택
- 데이터 수집 스크립트의 언어·라이브러리 세부 선택 (단, §1-5 준수)
- DB 스키마 세부 설계 (단, §1-2 출처 필드 포함 필수)
- 테스트 프레임워크, 린트/포맷 도구

## 3. 기술 스택 (요약 — 상세 근거는 `docs/decisions/0001-tech-stack.md`)
| 레이어 | 선택 | 비고 |
|---|---|---|
| 프론트엔드 | Next.js (App Router) + TypeScript + Tailwind CSS | 대시보드/차트 렌더링 |
| 차트 | Recharts | 시계열·게이지 표현 |
| 데이터 수집 | Python (requests/httpx + BeautifulSoup + pandas) | `data-pipeline/` |
| 저장소 | SQLite (MVP) → 필요 시 Postgres | 지표별 시계열 + 출처 메타 |
| 배포(예정) | Vercel(프론트) + 별도 스케줄러(수집 배치) | 확정 전, ADR 참고 |

## 4. 문서 지도 (`docs/`)
| 문서 | 내용 |
|---|---|
| [docs/README.md](docs/README.md) | 문서 전체 목차 |
| [docs/architecture.md](docs/architecture.md) | 시스템 구조 (수집→저장→스코어링→화면) |
| [docs/data-sources.md](docs/data-sources.md) | 9개 지표별 출처 사이트, 수집 주기, 접근 방식 |
| [docs/scoring-model.md](docs/scoring-model.md) | 스코어링 가중치·채점기준·해석 밴드 (단일 진실 소스) |
| [docs/screens.md](docs/screens.md) | 화면 정의서 (신규 화면은 여기 먼저 등록) |
| [docs/decisions/](docs/decisions/) | 기술적 의사결정 기록(ADR) |
| [docs/setup.md](docs/setup.md) | 로컬 개발 환경 셋업 가이드 |

## 5. Skills (슬래시 커맨드, `.claude/commands/`)
| 커맨드 | 용도 |
|---|---|
| `/commit` | 변경사항 검토 후 관례에 맞는 메시지로 커밋 (사용자 승인 필요) |
| `/review` | 불변식 위반·중복 로직·데이터 출처 누락 여부 중심 코드 리뷰 |
| `/deploy` | 배포 전 체크리스트 확인 후 배포 절차 안내 (실배포는 승인 필요) |
| `/cleanup` | 미사용 코드·의존성·브랜치 정리 |
| `/new-screen` | 신규 화면 추가 표준 절차 (화면정의→스캐폴딩→데이터연결) |

## 6. Hooks (`.claude/settings.json`, `.claude/hooks/`)
| 훅 | 시점 | 역할 |
|---|---|---|
| `guard-protected-paths.sh` | PreToolUse (Edit/Write) | `.env`, 네이티브 폴더, `node_modules`/`.git`/빌드 산출물 수정 차단 |
| `format-on-save.sh` | PostToolUse (Edit/Write) | 저장 시 Prettier(JS/TS/CSS/MD) / Ruff·Black(Python) 자동 포맷 |
| `session-summary.sh` | Stop | 세션 종료 시 `git status` 기반 변경 요약 출력 |

## 7. 이 프로젝트의 위치 (참고)
개인 프로젝트로, `D:\DNA\myDNA.md`의 5개 업무 트랙(PiMS/강의/온톨로지/AIDD)과는 별개다.
단, 지표 판단 시 정량 근거 우선·임계치+GAP 방식의 사고방식은 동일하게 적용한다.

---
*최초 작성: 2026-09-10 · 이 문서가 200줄을 넘어가면 내용을 줄이지 말고 `docs/`로 옮길 것.*
