# 아키텍처

## 전체 흐름
```
[데이터 수집 (data-pipeline/, Python)]
   ├─ data_pipeline/run.py       — 매일 배치(최신 1시점만 수집·upsert)
   └─ data_pipeline/backfill.py  — 최초 1회, 과거 1년치 일괄 수집(수동 실행, API 5종만 대상)
   대상: 국토부 실거래가(거래량) · KOSIS 미분양(월간,서울) ·
         KOSIS 주간 매매가격지수 · KOSIS 주간 전세가격지수 · KOSIS 전세수급동향지수 ·
         태인경매 아파트 경매 진행건수(월간 백필 불가, API가 롤링 조회만 지원) ·
         manual_readings.json(낙찰률·낙찰가율·입주물량, 뉴스 웹검색으로 일부 백필)
        │
        ▼ Windows 작업 스케줄러(AptPriceTrend_DailyPipeline)가 매일 08:00 run_daily.bat 실행
[저장소: SQLite (data-pipeline/data/aptprice.db) → readings 테이블
 (지표ID, 기준일, 값, 출처명, 출처URL, 비고, 수집시각)]
        │
        ├─ export_json.py    → web/data/latest-readings.generated.json (최신 1건/지표)
        └─ export_history.py → web/data/history.generated.json (전체 시계열/지표)
        │  (둘 다 원자료만 내보냄, 채점 없음 — git에는 커밋 안 됨)
        ▼
[채점: web/lib/classify.ts — docs/scoring-model.md §2 를 코드로 구현]
   → 지표별 -1/0/+1 채점을 두 방식으로 수행:
     A) 추세 채점(전기 대비 %): 거래량·미분양·매매가격지수·전세가격지수·낙찰률·낙찰가율·
        아파트비중·입주물량 — 히스토리 2개 이상 필요(이전 값이 0이면 %대신 증감 방향으로 판단)
     B) 절대수준 채점(100 기준선): 전세수급동향지수
     시계열이 1개뿐인 지표는 중립(0)+needsHistory 플래그+사유 문구로 정직하게 표시
   → buildScoreHistory(): 매매가격지수의 주간 시점을 타임라인 삼아 "그 시점까지의 데이터만으로"
     매번 재계산 → 종합 지수의 과거 추이(스코어 히스토리) 생성
        │
        ▼
[스코어링 엔진: web/lib/scoring.ts — docs/scoring-model.md §3~5 의 단일 구현체]
   → 가중합 → 0~100 지수 → 밴드 해석 → 오버라이드(캡) 적용
        │
        ▼
[프론트엔드: Next.js 대시보드 (web/app/page.tsx)]
   ├─ 종합 매수신호지수 게이지 + 지수 히스토리 라인차트(ScoreHistoryChart)
   ├─ 지표별 스코어링 표(ScoringTable, 카테고리 rowSpan 병합)
   ├─ 카테고리별 지표 카드(IndicatorCardGrid, 클릭 가능)
   ├─ 카드 클릭 → 히스토리 모달(IndicatorHistoryModal, 화면 안 오버레이)
   │  : 해당 지표 전체 시계열 차트 + "지표가 의미하는 바" 설명(indicators.ts의 description)
   ├─ "지금 수집 실행" 버튼(RunPipelineButton) → /api/run-pipeline → run_daily.bat 즉시 실행
   └─ /manual-entry 화면 → /api/manual-entry → manual_readings.json에 append 후 파이프라인 재실행
   history.generated.json 있으면 실제 데이터, 없으면 sample-readings.ts로 자동 폴백(배너로 구분)
```

## 데이터 수집·백필 현황 (2026-09-13)
| 지표 | 상태 | 히스토리 |
|---|---|---|
| 매매거래량 | API 검증 완료 | 12개월 백필 완료 |
| 서울 미분양(월간) | API 검증 완료 | 12개월 백필 완료 |
| 서울 주간 매매가격지수 | API 검증 완료, 레벨 값 저장 | 52주 백필 완료 |
| 서울 주간 전세가격지수 | API 검증 완료, 레벨 값 저장 | 52주 백필 완료 |
| 전세수급동향지수 | API 검증 완료 | 12개월 백필 완료 |
| 서울 아파트 경매 진행건수 | **API 검증 완료(2026-09-13, 태인경매)** | 1건(오늘 시작, API 특성상 과거 백필 불가) |
| 낙찰률 / 낙찰가율 | 수동 입력 | 12개월 웹검색 백필 완료(참고용, 지지옥션 원자료 아님) |
| 서울 아파트 월간 입주가구수 | 수동 입력, **2026-09-13 지표 재정의**(연간 전망치→월간 실적) | 6개월(정의 일관된 서울 단독 수치만) |

## 레이어별 책임 (구현 자유, 이 경계만 유지)
- **data-pipeline/**: 외부 API/수동 입력에서 원자료를 가져와 SQLite에 적재. **채점·스코어링 로직을 여기 넣지 않는다** — 원자료(레벨 값) + 출처만 책임진다.
- **저장소(SQLite)**: 원자료 + 출처 메타데이터 보관. `(indicator_id, as_of)`가 PK라 재실행해도 같은 시점은 덮어쓰기만 된다.
- **채점(`web/lib/classify.ts`) + 스코어링(`web/lib/scoring.ts`)**: 순수 계산 로직. 원자료 시계열을 -1/0/+1로 바꾸는 것부터 가중합·밴드 해석까지 이 두 모듈에서만 수행(불변식 §1-3).
- **프론트엔드**: 표시만 담당. 계산은 채점/스코어링 모듈 호출로 위임. 인터랙션(카드 클릭·모달·수동입력 폼)은 클라이언트 컴포넌트로 분리하고 데이터 로딩은 서버 컴포넌트(`page.tsx`)가 담당. `/api/run-pipeline`, `/api/manual-entry`는 로컬 Python 배치를 직접 실행하므로 **로컬 전용**(Vercel 등 배포 시 재설계 필요).

## 확인 필요
- 낙찰률·낙찰가율·입주물량은 여전히 수동 입력이라 사용자가 주기적으로 갱신해야 추세 채점이 계속 유지된다.
- 배치 실행 주체(로컬 작업 스케줄러 vs GitHub Actions vs Vercel Cron)는 로컬 스케줄러로 확정(docs/setup.md) — PC가 꺼져 있으면 그날은 건너뜀.
- `classify.ts`의 채점 임계치는 API 5종만 1차 백테스트를 거쳤고(docs/scoring-model.md §6), 나머지(낙찰률·낙찰가율·아파트비중·입주물량)는 데이터 부족으로 잠정치 상태.
- 태인경매 API로 낙찰률·낙찰가율까지 자동화할지는 미결(방법론이 지지옥션과 달라 수치가 다름) — docs/setup.md TODO 참고.
