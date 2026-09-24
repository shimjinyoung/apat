// "지금 수집 실행"/수동 입력/아파트 실거래가 검색은 서버가 로컬 Python venv를 execFile로
// 직접 실행하는 방식이라(docs/architecture.md 레이어별 책임 참고) Vercel 같은 서버리스
// 배포 환경에서는 동작하지 않는다. Vercel이 배포 시 자동으로 심어주는 env var로 구분한다.
// 로컬 `next dev`/`next start`에는 이 값이 없으므로 항상 true.
export const isLocalExecAvailable = !process.env.VERCEL;
