#!/bin/bash
# Stop 훅: 세션(응답 턴) 종료 시 git 변경사항을 요약해 보여준다. 비차단(exit 0)으로만 동작.

repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
[[ -z "$repo_root" ]] && exit 0

cd "$repo_root" || exit 0

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

changed=$(git status --porcelain 2>/dev/null)

if [[ -n "$changed" ]]; then
  echo "📋 세션 변경 요약 (git status):" >&2
  echo "$changed" >&2
  echo "커밋하려면 /commit 을 실행하세요." >&2
fi

exit 0
