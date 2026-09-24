# ADR 0003 — Vercel 배포, 로컬 전용 기능 분리

- 상태: 확정
- 날짜: 2026-09-23

## 배경

대시보드(`web/`)를 외부에서 상시 접속 가능하게 하고 싶다는 요청이 있었다. 그런데 현재 다음
세 기능은 서버(Next.js API route)가 **로컬 Python venv를 `execFile`로 직접 실행**하고,
로컬 SQLite(`data-pipeline/data/aptprice.db`)·로컬 생성 JSON(`web/data/*.generated.json`,
기존에는 git 미추적)에 의존한다.

- `/api/run-pipeline` ("지금 수집 실행" 버튼)
- `/api/manual-entry` (수동 입력 → `manual_readings.json` append → 파이프라인 재실행)
- `/api/apartment-trades` (아파트 실거래가 검색 → `apartment_search.py` 실행)

Vercel 같은 서버리스 환경은 Python venv가 없고 파일시스템이 읽기전용(배포 아티팩트 기준)이라
이 셋은 그대로 배포하면 전부 깨진다.

## 결정

1. **플랫폼: Vercel.** 무료 티어로 충분하고 GitHub 연동 자동 배포가 가장 간단하다.
2. **대시보드 데이터는 정적 스냅샷 커밋 방식으로 전환한다.**
   `web/data/history.generated.json`, `web/data/latest-readings.generated.json`을
   더 이상 `.gitignore`하지 않고 커밋한다. 로컬에서 배치(`run_daily.bat`)를 돌린 뒤
   `git add`/`commit`/`push`하면 Vercel이 그 스냅샷으로 재배포한다. 실시간 자동 갱신은
   아니고, **커밋 시점의 스냅샷**이라는 한계를 감수한다.
3. **로컬 전용 3개 기능은 배포본에서 비활성화한다(제거하지 않음).**
   `web/lib/deploy-env.ts`의 `isLocalExecAvailable = !process.env.VERCEL`로 판별해:
   - 각 API route는 배포 환경이면 501과 함께 "로컬 환경에서만 사용할 수 있습니다" 응답
   - 각 화면(대시보드의 버튼, `/manual-entry`, `/apartment-search`)은 폼 대신 안내 문구 표시
   - 로컬(`next dev`/`next start`)에서는 지금까지와 동일하게 전부 동작
4. **데이터 수집 배치 자체는 여전히 로컬(Windows 작업 스케줄러)에서 돈다.** 이 ADR은
   수집 인프라를 바꾸지 않는다 — "매일 08:00 로컬에서 수집 → 스냅샷 커밋 → Vercel 재배포"
   흐름만 추가한다.

## 대안 검토

- **Vercel Cron + 서버리스 수집기로 재작성**: Python 스크립트를 전부 TypeScript로 옮기고
  DB를 Vercel Postgres/KV 등으로 교체해야 함 — 지금 시점에는 과한 재작업이라 보류.
- **PC를 그대로 터널링(Cloudflare Tunnel/ngrok)해서 노출**: 기능은 그대로 유지되지만 PC가
  항상 켜져 있어야 하고, execFile 기반 라우트를 외부에 그대로 노출하는 보안 부담이 있어
  "상시 접속 가능한 정식 배포"라는 목적에는 맞지 않는다고 판단해 채택하지 않음.

## 배포 후 갱신 절차

```bash
cd data-pipeline && .venv/Scripts/python.exe -m data_pipeline.run
.venv/Scripts/python.exe -m data_pipeline.export_json
.venv/Scripts/python.exe -m data_pipeline.export_history
cd .. && git add web/data/*.generated.json
git commit -m "chore: refresh data snapshot"
git push
```

## 확인 필요 (다음에 결정할 것)

- 스냅샷이 오래되면(며칠~몇 주) 배포본이 stale해진다는 걸 어떻게 눈에 띄게 알릴지
  (현재는 대시보드 최신성 신호등이 "원본 소스 날짜" 기준이라 스냅샷 자체의 나이는 안 보여줌)
- 아파트 실거래가 검색을 배포본에서도 쓰고 싶다면, `data_pipeline/apartment_search.py`의
  로직(국토부 API 호출 + 아파트명 필터링)을 TypeScript API route로 이식하는 게 유일한 길
  (Python 의존 없이 순수 `fetch`로 가능 — 별도 작업으로 분리)
