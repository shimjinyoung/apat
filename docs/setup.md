# 로컬 개발 환경 셋업

## 현재 구성
```
aptprice_trend/
├── web/                 # Next.js 프론트엔드 (스캐폴딩 완료, 샘플 데이터로 동작 확인됨)
│   ├── app/             # App Router 페이지 (/, /guide)
│   ├── components/      # ScoreGauge, SignalBadge 등
│   ├── lib/             # indicators.ts, scoring.ts (단일 진실 소스 구현체)
│   └── data/            # sample-readings.ts (⚠ 샘플, 실제 수집 전 임시 데이터)
├── data-pipeline/       # Python 데이터 수집 (구조 완료, 일부 지표 API 연동 완료)
│   ├── data_pipeline/   # db.py, models.py, sources/*
│   ├── manual_readings.json  # 수동 입력 지표 (경매 3종, 입주물량)
│   └── .venv/           # 가상환경 (커밋 안 됨)
├── docs/
├── .claude/
└── CLAUDE.md
```

## 프론트엔드 실행
```bash
cd web
pnpm install   # 최초 1회
pnpm dev       # http://localhost:3000
```
또는 프로젝트 루트에서 `.claude/launch.json`에 등록된 `aptprice-web` 설정으로 미리보기 실행 가능.

## 확인된 사항 (2026-09-10)
- Next.js 16 + React 19 + Tailwind v4 + TypeScript, `pnpm dev`로 정상 기동, `tsc --noEmit` 통과.
- 대시보드(`/`)·해석 방식 안내(`/guide`) 화면을 브라우저에서 직접 렌더링 확인 완료.
- 표시되는 수치는 전부 `data/sample-readings.ts`의 **샘플 데이터**이며 실제 수집값이 아님.

## 데이터 파이프라인 실행

```bash
cd data-pipeline

# 최초 1회 (Windows, 이 환경에서는 python 대신 아래 전체 경로 사용 필요 —
# Windows Store 실행 별칭이 python/python3 커맨드를 가로채는 문제가 있었음)
"/c/Users/06875/AppData/Local/Python/bin/python.exe" -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt

# API 키 설정 (본인이 직접 발급 — Claude가 대신 가입 불가)
cp .env.example .env
# .env 열어서 MOLIT_SERVICE_KEY, KOSIS_API_KEY 채우기 (Claude는 이 파일을 직접 열람/수정하지 않음)

# 수집 실행 (키 없는 수집기는 자동으로 스킵되고 나머지는 계속 진행됨)
.venv/Scripts/python.exe -m data_pipeline.run

# 최신값을 web/data/latest-readings.generated.json으로 내보내기 (검증용)
.venv/Scripts/python.exe -m data_pipeline.export_json
```

## 확인된 사항 (2026-09-10)
- `data_pipeline.run` 실행 시 API 키가 없는 수집기(거래량, 미분양)는 에러 없이 스킵되고,
  수동 입력(`manual_readings.json`, 4건: 낙찰률/낙찰가율/물건비중/입주물량)은 정상적으로 SQLite에 저장됨을 확인.
- `export_json.py`로 `web/data/latest-readings.generated.json` 생성 확인 (현재는 대시보드에 미연결, 검증용).
- **API 키 등록 후에도 실제 호출 실패** — 아래 "알려진 환경 제약" 참조.

## 환경 제약 이력 (해결됨): 사내망에서 정부 Open API 접근 불가
2026-09-10 최초 진단 시 회사망(SKCC.NET)에서 `openapi.molit.go.kr`가 DNS상 127.0.0.1로 반환되고
`data.go.kr`/`naver.com` 등 국내 사이트가 전부 연결 실패했다. **모바일 핫스팟으로 전환 후 재현되지 않음**
— 사내망의 국내 사이트 직접 접속 제한이 원인이었던 것으로 결론. 이후 진단은 핫스팟 환경 기준.

## 해결된 이슈들 (2026-09-10, 핫스팟 환경에서 진단·해결)

### 1. MOLIT: 구 도메인이 죽어 있었음 → 신규 게이트웨이로 수정 완료
`openapi.molit.go.kr`는 핫스팟에서도, 8.8.8.8/1.1.1.1 DNS로 직접 조회해도 127.0.0.1을 반환 —
사내망 문제가 아니라 **그 도메인 자체가 죽은 것**으로 확인. data.go.kr이 통합 게이트웨이
`apis.data.go.kr`로 이전한 것으로 보여 `molit_trade_volume.py`의 `SERVICE_URL`을
`https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev`로 수정함.

### 2. MOLIT: TLS 인증서 오류 → truststore로 해결 ✅
엔드포인트 수정 후 `SSL: CERTIFICATE_VERIFY_FAILED (self-signed certificate)` 오류가 발생했으나,
`curl`(Windows 자체 인증서 저장소 사용)은 같은 서버에 정상 접속되는 것을 확인 →
**data.go.kr이 Python의 certifi 기본 CA 번들에는 없지만 Windows OS 신뢰 저장소에는 있는
CA로 서명되어 있는 것**이 원인이었다. `truststore` 패키지로 OS 신뢰 저장소를 쓰도록
`config.py`에서 전역 패치(`truststore.inject_into_ssl()`)해 해결.

또한 이중 URL 인코딩 버그(발급받은 키가 이미 `%2B` 등으로 인코딩되어 있는데 httpx가 다시
인코딩해 403이 나는 문제)도 `urllib.parse.unquote()`로 선제 처리해 함께 해결.

**결과: `data_pipeline.run` 실행 시 서울 아파트 매매거래량(2025-08 기준 4,614건)을 실제 API로
정상 수집·저장하는 것까지 확인 완료.**

### 3. KOSIS: `필수요청변수값이 누락되었습니다` → 해결 ✅
사용자가 KOSIS 표 화면("미분양현황_종합")에서 **OPENAPI URL생성** 기능으로 실제 요청 예시를
직접 뽑아 확인해준 덕에 원인을 특정했다: 엔드포인트 자체가 틀렸었다
(`statisticsData.do`가 아니라 **`Param/statisticsParameterData.do`**), `itmId`/`objL1`/`objL2`도
빈 값이 아니라 **"ALL"**이어야 했다. `tblId`도 추측했던 `DT_MLTM_2082`가 아니라 **`DT_MLTM_2086`**
("미분양현황_종합")이 맞는 표였다. `kosis_client.py`/`kosis_unsold.py`를 실제 예시대로 수정해 해결.

**단, 이 표의 한계 발견**: `prdSe=M`(월간)을 줘도 실제로는 **연도별(12월 기준) 값만** 반환된다.
즉 뉴스에 나오는 "월간 68,217호"(2026-07) 같은 실시간 월간 수치는 이 KOSIS 표로는 못 구하고,
연말 스냅샷(2025년 기준 66,510호)만 자동 수집 가능하다. 월간 수치가 꼭 필요하면 국토부
월간 보도자료를 별도로 수동 확인해야 한다(TODO로 남김, 틀린 값 추측 금지 원칙 유지).

## ✅ 최종 상태 (2026-09-10) — 9개 지표 전부 실제 값으로 채워짐
`data_pipeline.run` 실행 결과:

| 지표 | 값 | 수집 방식 |
|---|---|---|
| 매매거래량 | 2,934건 (2026-08) | API 자동 — 국토부 실거래가(data.go.kr) |
| 서울 미분양(월간) | 994호 (2026-07) | API 자동 — KOSIS `DT_MLTM_2082` |
| 서울 주간 매매가격지수 | 전주比 +0.22%p (2026-08-31) | API 자동 — KOSIS `DT_304004_WEEK_002_C` |
| 서울 주간 전세가격지수(구 "전세가율") | 전주比 +0.21%p (2026-08-31) | API 자동 — KOSIS `DT_304004_WEEK_004_C` |
| 전세수급동향지수 | 127.53 (2026-07, 100 기준선 초과=수요우위) | API 자동 — KOSIS `DT_40803_N0009` |
| 서울 아파트 경매 진행건수 | 396건 (2026-09-13, 최근 1개월 롤링) | API 자동 — 태인경매(2026-09-13 추가) |
| 낙찰률/낙찰가율/입주물량 | — | 수동 입력(`manual_readings.json`) |

**지표 재정의**: "전세가율"(전세가/매매가 비율)은 KOSIS에 대응 표가 없어 "전세가격지수 주간
변동률"로 대체 확정(사용자 승인, docs/scoring-model.md §7).

## 대시보드 ↔ 실제 데이터 연결 (완료, 2026-09-10)
- `web/lib/raw-readings.ts`: `latest-readings.generated.json`을 서버에서 읽음(없으면 null 반환)
- `web/lib/classify.ts`: 원자료 → -1/0/+1 채점 (docs/scoring-model.md §2 구현체, 불변식 §1-3 준수)
- `web/app/page.tsx`: 실제 데이터 있으면 사용(초록 배너), 없으면 `sample-readings.ts`로 자동 폴백(노랑 배너)
- 브라우저로 두 경로 모두 렌더링 확인 완료. 실제 데이터 사용 시 매수신호지수 **70/100**("전환 신호 누적 중")

⚠️ **알려진 한계**: 자동 채점은 가격지수·전세지수·전세수급동향지수 3개만 되고, 나머지 6개는
시계열이 아직 없어 중립(0)+"히스토리 부족" 표시로 정직하게 나온다 — 파이프라인을 반복 실행해
데이터가 쌓이면 `classify.ts`에 실제 추세 비교 로직 추가 필요(TODO).

## 파이프라인 정기 실행 (완료, 2026-09-10)
- `data-pipeline/run_daily.bat`: 수집(`run`) + 내보내기(`export_json`)를 순서대로 실행하고
  `logs/pipeline.log`에 결과를 남긴다. 더블클릭으로 수동 실행도 가능.
- Windows 작업 스케줄러에 **매일 오전 8시** 실행으로 등록됨(작업 이름: `AptPriceTrend_DailyPipeline`).
  - 확인: `schtasks /query /tn "AptPriceTrend_DailyPipeline" /v /fo list`
  - 삭제: `schtasks /delete /tn "AptPriceTrend_DailyPipeline" /f`
  - 시간 변경: 위 명령으로 삭제 후 `/sc daily /st HH:MM` 값을 바꿔 재등록
- ⚠️ **이 PC가 켜져 있고 로그인되어 있을 때만 실행된다.** 절전 모드/종료 상태면 그 날은 건너뛴다.
- ⚠️ **배치 파일은 ASCII(영문)로만 작성할 것** — 한글 주석을 넣었더니 Windows 콘솔 코드페이지
  문제로 명령어 파싱이 깨져 전부 실패했었다(2026-09-10 확인). 로그 파일 내용 자체는 한글 정상 출력됨.

## 1년치 백필 + 화면 개발 (완료, 2026-09-11)
사용자 요건: 반응형 화면, 지표별 추이 차트, 히스토리는 팝업(모달), 매일 배치 저장,
1년치 과거 데이터 선적재, 스코어링 표 + 스코어 히스토리 차트, 종합 대시보드.

- **저장 방식 변경**: 매매가격지수·전세가격지수를 "전주 대비 %"가 아니라 **레벨 값**으로 저장하도록
  리팩터링(사용자 결정) — 히스토리·차트가 정확해짐. `web/lib/classify.ts`가 연속된 두 레벨을
  비교해 %변화를 계산.
- **백필**: `data-pipeline/data_pipeline/backfill.py` 신설 — API 5종에 대해 52주/12개월치를
  한 번에 수집. 경매 3종·입주물량은 수동 입력이라 백필 대상에서 제외(사용자 결정, 오늘부터 누적).
  실행: `.venv/Scripts/python.exe -m data_pipeline.backfill`
- **전체 히스토리 내보내기**: `data_pipeline/export_history.py` 신설 →
  `web/data/history.generated.json` (지표ID → 시계열 배열). `run_daily.bat`에도 추가해 매일 갱신.
- **채점 고도화**: `classify.ts`가 이제 거래량·미분양·매매가격지수·전세가격지수까지 **추세 기반**으로
  자동 채점(전기 대비 %, 지표별 임계치는 잠정치 — docs/scoring-model.md §6). 전세수급동향지수는
  기존대로 100 기준선 절대수준 채점. 경매 3종·입주물량만 여전히 시계열 부족으로 중립 처리.
- **화면**: 종합 대시보드(게이지 + 지수 히스토리 차트 + 스코어링 표 + 카드), 카드 클릭 시
  히스토리 모달(화면 안 오버레이, Recharts 라인차트 + 지표 설명 코멘트) — 상세는 docs/screens.md.
- **반응형**: 모바일(375px) 프리셋으로 카드 1열 스택·표 가로 스크롤·모달 바텀시트 전환 확인.

## KOSIS 표 찾기 요령 (앞으로 새 지표 추가 시 재사용)
1. kosis.kr(일반 사이트, openapi 아님)에서 키워드 검색 → 관련 통계표 클릭
2. 표 화면 상단 **"OPENAPI"** 버튼 → **URL생성** → 생성된 URL 그대로 복사
3. 그 URL의 파라미터(orgId/tblId/itmId/objL1/prdSe)를 코드에 그대로 반영 — **추측 금지**
4. 반드시 실제로 호출해서 **PRD_DE 형식(연/월/주)과 LST_CHN_DE(최신성)**을 확인
   (표 이름이 "주간"이어도 실제로는 갱신이 끊긴 경우가 있었음 — 유형별 매매가격지수 사례)

## 채점 임계치 백테스트 (완료, 2026-09-11)
`data-pipeline/backtest.py`로 1년치 실데이터 분석 → 거래량 ±5%→±15%, 미분양 ±3%→±4%로 조정.
가격지수류·전세수급지수는 표본에 하락 구간이 없어 조정하지 않고 유지(상세: docs/scoring-model.md §6).

## 경매 지표 웹 검색 백필 + 수동 입력 관리 화면 (완료, 2026-09-11)
- 낙찰률·낙찰가율은 뉴스 검색으로 2025-09~2026-08 **전체 12개월치**를 백필했다(2026-01
  낙찰률은 처음엔 못 찾았으나 재검색으로 확보: 44.3%). ⚠️ 원자료(지지옥션)를 직접 확인한 게
  아니라 언론 보도를 재인용한 값이라 **참고용** — 정확한 수치가 필요하면 지지옥션에서 직접 확인 권장.
- 입주물량은 **의도적으로 전체 백필하지 않음** — 검색되는 수치들이 **서로 다른 정의**를 섞어 씀
  (기존 값 17,197호는 "연간 입주 예정 전망치", 새로 검색된 값은 "그 달 실제 입주 가구 수").
  정의가 다른 값을 한 시계열에 섞으면 추세가 왜곡되므로 억지로 채우지 않음. 서울 단독 월간
  실적치가 확인된 6개월(2025-09/12, 2026-06/07/08/09)만 반영.
- `/manual-entry` 화면 신설: 수동 지표를 폼으로 입력 → `manual_readings.json`에 append →
  파이프라인 자동 재실행. 낙찰률·낙찰가율은 이미 히스토리가 쌓여 있어 다음 달 값부터 바로 추세 채점된다.
- `classify.ts`에 낙찰률·낙찰가율·아파트물건비중·입주물량 4개의 채점 로직이 원래 아예
  빠져있던 버그도 같이 발견해 수정했다(잠정 임계치, docs/scoring-model.md §6 참고).

## 경매 지표 자동화 → 서울 아파트 경매 진행건수 (완료, 2026-09-13)
- "전체 경매 물건 중 아파트 %"를 표준 보도하는 월간 기사가 없어 웹검색 백필은 실패했으나,
  **태인경매(taein.co.kr)에서 robots.txt에 걸리지 않는 JSON API**(`/auction/statistics/include/mainQuery.php`)를
  찾아 자동 수집기(`data_pipeline/sources/taein_auction.py`)로 전환했다.
- 처음엔 "서울+아파트 진행건수 ÷ 서울+전체(토지·차량 등) 진행건수 × 100"으로 비중을 계산했으나
  (24.6%→8.69%), 분모에 무관한 용도가 섞여 노이즈가 크다는 지적에 따라 **원건수(절대량) 자체**로
  단순화(396건). `indicator_id`도 `auction_apt_share`→`auction_case_count`로 변경.
- 판단 기준: 건수 증가=부실(대출 연체·강제매각) 확산 신호(비우호), 정점 후 감소=부실 정리
  마무리 신호(우호). 거래량과 같은 "건수형 월간" 지표로 보고 임계치도 ±15%로 동일하게 잠정 설정.
- ⚠️ 이 API는 "최근 N개월 롤링" 조회만 지원, 특정 과거 달 지정 불가 — 과거 백필 안 되고
  오늘(2026-09-13)부터 매일 수집해 누적.
- 이제 낙찰률/낙찰가율/입주물량 **3개만** 수동 입력 대상.

## 아파트 실거래가 검색 화면 — web용 API 키 별도 설정 필요 (2026-09-26)
`/apartment-search` 화면은 Next.js 서버(`web/lib/server/apartment-search.ts`)가 국토부
실거래가 API를 직접 `fetch`로 호출한다(2026-09-26부터 — 이전엔 로컬 Python 스크립트를
실행하는 방식이라 로컬 전용이었음, docs/decisions/0003-vercel-deployment.md 후속 참고).

`data-pipeline/.env`의 `MOLIT_SERVICE_KEY`와는 **완전히 별개의 프로세스**라 `web/`에도
같은 키를 별도로 설정해야 동작한다.

- **로컬 개발**: `web/.env.local` 파일을 만들고 `MOLIT_SERVICE_KEY=<발급받은 키>`를 넣는다
  (Claude는 이 파일을 직접 열람/수정하지 않음 — 본인이 직접 `data-pipeline/.env`에서 같은 값을
  복사해 넣을 것). `.gitignore`의 `.env.*` 규칙에 걸려 커밋되지 않는다.
- **Vercel 배포본**: Vercel 프로젝트 → Settings → Environment Variables에 같은 이름
  (`MOLIT_SERVICE_KEY`)으로 등록 후 재배포해야 검색이 동작한다. 등록 전에는 API가
  "서버에 MOLIT_SERVICE_KEY가 설정되어 있지 않습니다" 메시지를 반환한다.

## 남은 TODO
- [ ] 하락 구간이 포함된 데이터가 쌓이면 가격지수류·전세수급지수의 "-1(비우호)" 분기 재검증
- [ ] 거래량 신고기한(30일) 지연 보정 — 비교 기준 시점을 한 달 늦추는 방안 검토
- [ ] 오버라이드 규칙의 "캡" 값(60점)이 적절한지 실데이터로 검증
- [ ] 낙찰률·낙찰가율의 웹검색 백필 값을 여유 있을 때 지지옥션 원자료로 대조 검증
- [ ] 태인경매 API로 낙찰률·낙찰가율도 자동화할지 검토(방법론이 지지옥션과 달라 수치 차이 있음 — 사용자 확인 필요)
- [ ] 입주물량은 `/manual-entry`로 매달 입력해 나머지 달 히스토리 축적
- [ ] 전세수급지수 외 추가 지표(예: 준공후 미분양)가 필요해지면 위 "KOSIS 표 찾기 요령" 적용
