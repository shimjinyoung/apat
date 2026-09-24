#!/bin/bash
# PreToolUse 훅: .env, 네이티브 폴더, 빌드/의존성 폴더에 대한 Edit/Write를 차단한다.
# stdin으로 JSON을 받는다: {"tool_name": "...", "tool_input": {"file_path": "...", ...}, ...}

input=$(cat)

file_path=$(printf '%s' "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//;s/"$//')

# file_path가 없는 도구 호출(Edit 계열이 아닌 경우 등)은 통과
if [[ -z "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  *.env|*.env.*)
    echo "차단됨: '$file_path'는 .env 파일입니다. 시크릿 파일은 Claude가 직접 열람/수정할 수 없습니다. 사용자가 직접 편집해야 합니다." >&2
    exit 2
    ;;
  */android/*|*/ios/*|*/native/*|android/*|ios/*|native/*)
    echo "차단됨: '$file_path'는 네이티브 플랫폼 폴더입니다. 수정이 꼭 필요하면 그 이유를 사용자에게 설명하고 명시적 승인을 받으세요." >&2
    exit 2
    ;;
  */node_modules/*|*/.git/*|*/.next/*|*/dist/*|*/build/*)
    echo "차단됨: '$file_path'는 빌드 산출물/의존성 폴더입니다. 직접 수정 대상이 아닙니다." >&2
    exit 2
    ;;
esac

exit 0
