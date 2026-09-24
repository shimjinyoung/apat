---
description: 로컬 파이프라인이 만든 최신 데이터 스냅샷을 커밋·push해서 Vercel 배포본을 갱신한다
---

Vercel 배포본은 `web/data/*.generated.json`을 **커밋 시점 스냅샷**으로 서빙한다
(docs/decisions/0003-vercel-deployment.md 참고, 실시간 자동 갱신 아님). 로컬 배치가 매일
08:00 로컬 SQLite를 갱신해도 그건 배포본에 반영되지 않으므로, 배포본을 최신화하려면 이 커맨드로
JSON을 다시 내보내고 push한다.

## 절차

1. `data-pipeline/`에서 최신 원자료를 내보낸다.
   ```bash
   cd data-pipeline
   .venv/Scripts/python.exe -m data_pipeline.export_json
   .venv/Scripts/python.exe -m data_pipeline.export_history
   cd ..
   ```
2. `git status`로 `web/data/history.generated.json`, `web/data/latest-readings.generated.json`
   외에 의도치 않은 변경이 없는지 확인한다. 다른 파일이 함께 바뀌어 있으면 사용자에게 알리고
   같이 커밋할지 물어본다(이 커맨드는 스냅샷 갱신 전용이다).
3. 실제로 내용이 바뀌었는지 `git diff --stat web/data/*.generated.json`으로 확인한다.
   변경이 없으면("이미 최신") 커밋하지 않고 그대로 안내한다.
4. 변경이 있으면 스냅샷 파일만 명시적으로 add하고 커밋한다.
   ```bash
   git add web/data/history.generated.json web/data/latest-readings.generated.json
   git commit -m "chore: refresh data snapshot ($(date +%Y-%m-%d))"
   ```
5. 사용자가 이미 push를 승인한 맥락(이 커맨드 자체가 그 승인)이므로 바로 push한다.
   ```bash
   git push
   ```
6. push 결과와 "Vercel이 자동으로 재배포를 시작했을 것" 안내로 마무리한다. 실제 배포 완료 확인은
   사용자가 Vercel 대시보드에서 하도록 안내한다(이 세션에서 Vercel 배포 상태를 직접 조회할 수단은 없음).
