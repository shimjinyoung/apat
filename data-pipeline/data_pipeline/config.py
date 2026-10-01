"""환경변수 로딩. .env는 절대 이 저장소에 커밋하지 않는다 (CLAUDE.md 불변식 §1-4, .claude 훅으로 강제)."""

import os

import truststore
from dotenv import load_dotenv

# 일부 국내 공공기관 사이트(예: apis.data.go.kr)는 certifi 번들에는 없지만
# Windows 자체 신뢰 저장소에는 있는 CA로 서명되어 있어, 기본 httpx/requests 설정으로는
# "self-signed certificate in certificate chain" 오류가 난다 (curl/schannel은 정상 동작하는 것으로 확인, 2026-09-10).
# truststore로 OS 신뢰 저장소를 쓰도록 전역 적용해 해결한다.
truststore.inject_into_ssl()

load_dotenv()

MOLIT_SERVICE_KEY = os.getenv("MOLIT_SERVICE_KEY", "")
KOSIS_API_KEY = os.getenv("KOSIS_API_KEY", "")
ECOS_API_KEY = os.getenv("ECOS_API_KEY", "")
HF_API_KEY = os.getenv("HF_API_KEY", "")  # 한국주택금융공사 HOUSTAT Open API (K-HAI)


def require(key_value: str, key_name: str, signup_url: str) -> str:
    if not key_value:
        raise RuntimeError(
            f"{key_name}가 .env에 설정되어 있지 않습니다. {signup_url} 에서 직접 회원가입 후 "
            f"발급받은 키를 .env에 {key_name}=... 형식으로 넣어주세요. (Claude가 대신 가입할 수 없음)"
        )
    return key_value
