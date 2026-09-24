#!/bin/bash
# PostToolUse 훅: Edit/Write로 저장된 파일을 확장자에 맞게 자동 포맷한다.
# 포맷터가 설치되어 있지 않으면 조용히 통과한다(빌드 실패로 이어지지 않게).

input=$(cat)

file_path=$(printf '%s' "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//;s/"$//')

[[ -z "$file_path" ]] && exit 0
[[ -f "$file_path" ]] || exit 0

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md)
    if [[ -f package.json ]] && command -v npx >/dev/null 2>&1; then
      npx --no-install prettier --write "$file_path" >/dev/null 2>&1
    fi
    ;;
  *.py)
    if command -v ruff >/dev/null 2>&1; then
      ruff format "$file_path" >/dev/null 2>&1
    elif command -v black >/dev/null 2>&1; then
      black -q "$file_path" >/dev/null 2>&1
    fi
    ;;
esac

exit 0
