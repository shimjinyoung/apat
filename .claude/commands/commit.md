---
description: 변경사항을 검토하고 관례에 맞는 메시지로 커밋한다
---

다음 순서로 진행한다.

1. `git status`, `git diff`(staged+unstaged), 최근 `git log` 5개를 확인한다.
2. 변경 파일 중 `.env`, `.env.*`, 자격증명으로 보이는 파일이 포함되어 있지 않은지 확인한다.
   포함되어 있으면 즉시 중단하고 사용자에게 알린다.
3. 변경 내용을 "왜"(무엇을 해결/개선했는지) 중심으로 1~2문장 커밋 메시지 초안을 작성한다.
4. 관련 파일만 명시적으로 `git add`한다 (`git add -A`/`git add .` 금지).
5. 아래 형식으로 커밋한다.

```
<타입>: <한 줄 요약>

<필요 시 본문>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

6. 커밋 후 `git status`로 성공 여부를 확인한다.
7. 사용자가 명시적으로 요청하지 않았다면 push는 하지 않는다.
