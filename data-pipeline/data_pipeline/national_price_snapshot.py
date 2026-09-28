"""화면 5(전국 실거래가 추이) 정적 스냅샷 재생성 — 수동 실행 전용.

사용법:
    .venv/Scripts/python.exe -m data_pipeline.national_price_snapshot

이 화면은 매일 배치에 포함되지 않는다(docs/architecture.md, docs/screens.md 화면 5 참고) —
필요할 때 이 스크립트를 수동으로 돌려 `web/data/national-price-index.json`을 다시 만든다.

⚠️ 2026-09(정확한 날짜 미상, 2026-09-17 이후 ~ 2026-09-29 이전) KOSIS가 이 표(DT_KAB_11672_S1)의
스키마를 바꿨다:
1. "행정구역별" 분류가 1단계(전국/서울/…)에서 2단계(행정구역별(1)/행정구역별(2))로 늘어났다.
   이 때문에 objL2="ALL"로 호출하면 err21이 난다 — **objL2는 반드시 빈 문자열**이어야
   행정구역별(1) 레벨(전국/수도권/지방/서울/… 등)만 받아올 수 있다. (기존 코멘트였던
   "objL2=ALL이 정상 동작 — S15와 혼동 주의"는 이제 틀린 정보이니 참고하지 말 것)
2. **기준시점이 2017.11=100.0에서 2026.6=100.0으로 재설정됐다.** 그래서 새로 받은 값을
   기존 스냅샷 뒤에 그냥 이어붙이면(append) 두 구간의 기준이 달라 그래프가 끊겨 보인다.
   → 이 스크립트는 항상 **2006-01부터 최신월까지 전체를 다시 받아 완전히 교체**한다
   (증분 append 금지). %변화율은 기준 재설정과 무관하게 동일하므로(스케일 불변),
   `web/lib/national-events.ts`의 서술은 **절댓값만** 다시 맞추면 된다 — 새로 재생성한
   값과 대조해서 수동으로 갱신할 것(자동화 안 함, 이벤트 설명은 사람이 쓰는 글이라).
"""

from __future__ import annotations

import json
from pathlib import Path

from .sources.kosis_client import fetch_parameter_data

ORG_ID = "408"
TBL_ID = "DT_KAB_11672_S1"
OUTPUT_PATH = Path(__file__).resolve().parent.parent.parent / "web" / "data" / "national-price-index.json"


def fetch_all() -> tuple[list[dict], str]:
    """T1(지수) 전체 시점, 전국(C1_NM=전국) 행만. new_est_prd_cnt를 넉넉히 잡아 2006-01부터 전부 받는다.
    반환값에 UNIT_NM(예: "2026.6＝100.0")도 같이 줘서 기준시점을 추측하지 않고 API 응답 그대로 쓴다."""
    rows = fetch_parameter_data(ORG_ID, TBL_ID, itm_id="T1", obj_l1="ALL", obj_l2="", prd_se="M", new_est_prd_cnt=300)
    national = [r for r in rows if r.get("C1_NM") == "전국"]
    points = [{"prd": r["PRD_DE"], "value": round(float(r["DT"]), 3)} for r in national]
    points.sort(key=lambda p: p["prd"])
    unit_nm = national[0].get("UNIT_NM", "") if national else ""
    return points, unit_nm


def run() -> None:
    points, unit_nm = fetch_all()
    if not points:
        raise RuntimeError("전국 실거래가격지수 응답이 비어 있습니다.")

    OUTPUT_PATH.write_text(json.dumps(points, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(points)}개월치 ({points[0]['prd']} ~ {points[-1]['prd']}) → {OUTPUT_PATH}")
    print(f"기준시점(UNIT_NM, API 응답 그대로): {unit_nm}")


if __name__ == "__main__":
    run()
