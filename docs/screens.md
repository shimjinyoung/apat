# 화면 정의서

`/new-screen` 커맨드로 새 화면을 추가할 때 이 표에 먼저 항목을 등록한다.
컬럼 구조는 myDNA §6.2 "화면별 업무 설명" 패턴을 준용한다.

| 번호 | 화면구분 | 화면명 | 목적 | 데이터 소스 | 상태 |
|---|---|---|---|---|---|
| 1 | 대시보드 | 종합 현황 | 게이지 + 지수 히스토리 차트 + 스코어링 표 + 지표 카드 | `web/data/history.generated.json`(실제, 없으면 `sample-readings.ts`로 폴백) | **완료** — `web/app/page.tsx` |
| 2 | 팝업(모달) | 지표별 히스토리 | 카드 클릭 시 화면 안 오버레이로 해당 지표의 전체 시계열 차트 + 의미 설명(코멘트) 표시 | `web/lib/indicators.ts`(description) + `web/data/history.generated.json` | **완료** — `web/components/IndicatorHistoryModal.tsx`. 2026-09-14: 매매가격지수 모달에 한해 "실거래 평균가격(㎡당)" 보조 시리즈를 우측 y축(점선)으로 같이 표시 — `IndicatorCardGrid`가 `secondary` prop으로 전달, 채점 미반영 참고용(docs/scoring-model.md 상단 안내 참고) |
| 3 | 안내 | 해석 방식/계산식 안내 | 스코어링 로직 투명 공개 | scoring-model.md 원문 | **완료** — `web/app/guide/page.tsx` |
| 4 | 관리 | 수동 입력 관리 | 신뢰 가능한 자동 수집 API가 없는 지표(입주물량, `IndicatorMeta.isManual`로 관리)를 폼으로 입력 → 저장 시 파이프라인 자동 재실행 | `data-pipeline/manual_readings.json`(추가/append) | **완료** — `web/app/manual-entry/page.tsx`, `/api/manual-entry`. "서울 아파트 경매 진행건수"는 2026-09-13 태인경매 API, "서울 주택담보대출 연체율"은 같은 날 ECOS API, "낙찰률·낙찰가율"은 같은 날 법원경매정보 공식 API 자동화로 이 화면에서 빠짐 — 이제 입주물량만 남음 |
| 5 | 정보/안내 | 전국 실거래가 추이 | 2006년 실거래가 신고제 시행 이후 **전국** 아파트 실거래가격지수 월간 추이(2006~현재)를 큰 그림으로 보여주고, 시장의 방향이 크게 꺾인 주요 변곡점(금융위기·규제·금리 등) 9개를 마우스오버로 설명. **매수신호지수 스코어링과 무관한 순수 정보/컨텍스트 화면**(서울 단독 10개 지표 채점 체계에 영향 없음) | KOSIS `DT_KAB_11672_S1`(아파트 매매 실거래가격지수, 전국), `web/data/national-price-index.json`(정적 스냅샷) | **완료(2026-09-17)** — `web/app/national-price/page.tsx`, `web/components/NationalPriceChart.tsx`(Recharts), 이벤트 데이터는 `web/lib/national-events.ts`. 네비게이션에 "전국 실거래가 추이" 메뉴 추가. **재수집·스키마 변경 대응(2026-09-29)**: 사용자가 "최신 데이터가 2026-06에서 멈췄다"고 리포트 → 원인은 KOSIS가 이 표의 API 파라미터 요건을 바꾸고(`objL2=ALL`→빈 문자열 필요) 기준시점도 2017.11=100.0→2026.6=100.0으로 재설정한 것으로 확인. 수동 재수집 스크립트(`data_pipeline/national_price_snapshot.py`) 신설, 247개월(2006-01~2026-07) 전체를 새 기준으로 재생성(증분 append 아님), `national-events.ts`의 절댓값 서술도 새 기준으로 갱신(%변화율은 스케일 불변이라 그대로) |
| 6 | 조회 | 아파트 실거래가 검색 | 서울+경기(72개 시/군/구) 중 지역을 선택하고 아파트명을 입력하면 최근 3년(최대 36개월)의 개별 거래금액을 산점도로 표시(Y축=실제 거래금액/억원). **매수신호지수 스코어링과 무관한 조회 전용 화면** | 국토교통부 실거래가 공개시스템 Open API `getRTMSDataSvcAptTradeDev`(지역+월 단위 조회, 아파트명은 클라이언트 측 필터링) | **완료(2026-09-23)** — `web/app/apartment-search/page.tsx`, `web/components/ApartmentSearchForm.tsx`, `web/components/ApartmentTradeChart.tsx`, `web/app/api/apartment-trades/route.ts`(지역코드는 `web/lib/region-codes.ts` 화이트리스트로 검증). 네비게이션에 "아파트 실거래가 검색" 메뉴 추가.
**이식(2026-09-26)**: 최초엔 `execFile`로 로컬 Python 스크립트(`data_pipeline/apartment_search.py`)를 실행해 로컬 전용이었으나, 배포본에서 이 화면이 막혀 있다는 피드백으로 `web/lib/server/apartment-search.ts` 안에서 국토부 API를 순수 `fetch`로 직접 호출하도록 전면 이식(Python 스크립트는 삭제). 지역+월 단위 디스크 캐시는 Next.js `fetch`의 `revalidate: 3600`으로 대체, 36개월 조회는 `Promise.all`로 병렬화. 이제 로컬·배포 구분 없이 항상 동작(`docs/decisions/0003-vercel-deployment.md` 후속 참고). `web/`에도 `MOLIT_SERVICE_KEY` 환경변수를 별도로 설정해야 함(로컬은 `web/.env.local`, 배포는 Vercel 프로젝트 설정). Y축은 최초 ㎡당가로 구현했다가 사용자 피드백으로 실제 거래금액으로 변경, 전용면적별 색상 구분(다른 평형이 섞이면 가격 수준 자체가 달라 보임)은 유지하되 평형별 월평균 추세선은 의미가 없다는 피드백으로 제거(2026-09-23). **버그 수정(2026-09-23)**: 거래가 촘촘히 몰린 최근 구간에서 점에 정확히 마우스를 올려도 툴팁이 안 뜨는 문제 발견 — recharts 기본 `<Tooltip>`이 커서 위치 기준 "가장 가까운 점"을 축 단위로 찾는 방식이라 밀집 구간에서 근접점 탐색이 실패하는 것으로 재현·확인. recharts `<Tooltip>` 대신 각 점(`<circle>`)에 직접 `onMouseEnter`/`onMouseLeave`를 달아 컴포넌트 자체 상태로 툴팁을 그리는 방식으로 교체 |
| 7 | 정보/안내 | 수도권 주택가격전망 CSI | 한국은행 소비자동향조사의 주택가격전망CSI(100 기준선)를 서울·경기·인천 3개 선으로 표시. **매수신호지수 스코어링과 무관한 참고용 화면** | 한국은행 ECOS 소비자동향조사(서울=511Y002 전국기준표, 경기·인천=511Y004 지역별표) — 두 표의 지역 구분 체계가 달라 "수도권" 합산 수치는 없음, 3개 지역을 나란히 표시하기로 사용자와 합의 | **완료(2026-09-29)** — `web/app/csi-trend/page.tsx`, `web/components/CsiTrendChart.tsx`(Recharts). 원자료는 `data_pipeline/sources/ecos_csi.py`가 매일 배치(`run.py`)에서 최근 6개월을 조회해 최신값만 upsert, 초기 히스토리(2013-01~현재)는 1회성 백필 스크립트로 495건 시딩. `AuxSeriesId`(`csi_housing_seoul/gyeonggi/incheon`)로 `web/lib/raw-readings.ts`에 등록(`INDICATORS` 스코어링 목록에는 없음). 네비게이션에 "수도권 주택가격전망 CSI" 메뉴 추가 |

## 화면 4(수동 입력 관리) 참고 (2026-09-11)
- `/api/manual-entry`가 `manual_readings.json`에 새 시점을 append하고 `run_daily.bat`을 재실행한다.
  같은 지표를 여러 번 다른 기준월로 입력하면 시계열이 그대로 쌓인다(덮어쓰기 아님).
- ⚠️ 로컬 전용 — `/api/run-pipeline`과 동일하게 로컬 Python 배치를 직접 실행하는 방식이라
  Vercel 등 서버리스 배포 시 별도 설계가 필요하다(docs/architecture.md 참고).

## 화면 1(대시보드) 구성 요소 (2026-09-11 기준)
- 데이터 상태 배너 (실제 데이터 / 샘플 폴백 구분)
- 종합 매수신호지수 게이지 (`ScoreGauge`)
- 지수 히스토리 라인차트, 해석 밴드 배경색 표시 (`ScoreHistoryChart`) — 매매가격지수의 주간 시점을 타임라인으로 삼아 매 시점 재현 채점
- 지표별 스코어링 표 (`ScoringTable`) — 카테고리·가중치·현재값·원본 소스 날짜·채점·최신성(신호등)·데이터 소스
- 카테고리별 지표 카드 (`IndicatorCardGrid`) — 2026-09-22부터 카드마다 한 줄씩, 왼쪽에 현재값·채점·소스 날짜, 오른쪽에 시계열 차트(`IndicatorTrendChart`, 모달과 공용)를 함께 표시해 모달을 열지 않고도 추이를 한눈에 확인. 클릭 시 화면 2(히스토리 모달)에서 설명·출처 확인
- **최신성 신호등**(`FreshnessDot`, 2026-09-13 추가) — 지표별 정상 발표 주기(`lib/freshness.ts`) 대비 원본 소스 날짜가 얼마나 지났는지 🟢/🟡/🔴로 표시. 배치 자체가 도는지가 아니라 **원본 소스가 실제로 갱신됐는지**를 보여준다(매일 배치는 정상 실행돼도 KOSIS 등 소스가 아직 새 값을 안 내면 🔴로 뜬다 — 실제로 미분양·전세수급동향지수가 이 방식으로 지연 발견됨). 카드/표 모두 툴팁에 "마지막 배치 수집 시각"(`collectedAt`, DB `collected_at`)도 같이 보여줘 배치 자체의 정상 동작 여부는 이 값으로 별도 확인 가능

## 반응형 확인 (2026-09-11, 모바일 프리셋 375×812)
- 헤더 네비게이션 줄바꿈, 카드 1열 스택, 스코어링 표는 `overflow-x-auto`로 가로 스크롤 — 정상 확인
- 히스토리 모달은 모바일에서 화면 하단 바텀시트 형태(`items-end` + `rounded-t-2xl`)로 전환

## 화면 추가 시 필수 기재 항목
- 화면명 / 목적 / 접근 경로(URL)
- 사용하는 지표(및 출처 문서 링크)
- 반응형 고려사항(모바일 여부)
- 에러/빈 상태(데이터 미수집 시) 처리 방식
