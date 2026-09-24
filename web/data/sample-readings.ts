// ⚠️ 샘플 데이터입니다. 실제 수집 파이프라인(data-pipeline/)이 아직 구현되지 않아
// 2026-09-10 리서치 대화에서 확인한 수치를 기반으로 임시로 채운 값입니다.
// 실제 값으로 교체 시 이 파일이 아니라 data-pipeline의 수집 결과(DB)를 사용하도록 바꿔야 한다.
// (CLAUDE.md 불변식 §1-2: 모든 값은 출처와 함께 저장)

import type { IndicatorReading } from "@/lib/scoring";

export const SAMPLE_READINGS: IndicatorReading[] = [
  {
    indicatorId: "auction_win_rate",
    score: 0,
    value: 37.1,
    asOf: "2026-08-31",
    note: "전월 38.3% → 1.2%p 하락, 3개월째 30%대",
  },
  {
    indicatorId: "auction_win_price_ratio",
    score: 0,
    value: 97.0,
    asOf: "2026-08-31",
    note: "전월 101.0% → 4.0%p 하락",
  },
  {
    indicatorId: "auction_case_count",
    score: 0,
    value: 396,
    asOf: "2026-09-13",
    note: "최근 1개월 롤링 기준 서울 아파트 경매 진행건수. 파이프라인 실제 수집값(태인경매)으로 갱신됨",
  },
  {
    indicatorId: "price_index_weekly",
    score: 1,
    value: 102.03,
    asOf: "2026-08-31",
    note: "지수 102.03 (전주 101.81 대비 +0.22%) — 상승 전환",
  },
  {
    indicatorId: "trade_volume",
    score: -1,
    value: 2530,
    asOf: "2026-08-31",
    note: "전월 대비 56.5% 급감 (거래절벽)",
  },
  {
    indicatorId: "jeonse_ratio",
    score: 1,
    value: 101.88,
    asOf: "2026-08-31",
    note: "전세가격지수 101.88(전주 101.67 대비 +0.21%) — 파이프라인 실제 수집값(KOSIS DT_304004_WEEK_004_C)",
  },
  {
    indicatorId: "jeonse_supply_demand_index",
    score: 1,
    value: 127.5,
    asOf: "2026-07-01",
    note: "100 기준선 초과(전세 수요 우위) — 파이프라인 실제 수집값(KOSIS DT_40803_N0009)",
  },
  {
    indicatorId: "unsold_housing",
    score: 0,
    value: 994,
    asOf: "2026-07-01",
    note: "서울 25개 구 합계(월간). 파이프라인 실제 수집값(KOSIS DT_MLTM_2082)으로 갱신됨",
  },
  {
    indicatorId: "move_in_volume",
    score: 0,
    value: 3438,
    asOf: "2026-09-30",
    note: "2026-09 서울 입주 예정가구수(전국 최저 국면). 파이프라인 실제 수집값으로 갱신됨",
  },
];
