// 지표별 "데이터가 최신인가"를 신호등(🟢/🟡/🔴)으로 보여주기 위한 판정.
// 스코어링(-1/0/+1)과는 무관한 운영 관점 표시라 classify.ts(불변식 §1-3 대상)와 분리한다.
//
// 기준일(asOf)이 그 지표의 정상 발표 주기 대비 얼마나 지났는지로 판정한다.
// 주기는 docs/data-sources.md에 정리된 실제 발표 주기·시차를 근거로 한다.
//   - 매일/롤링(경매 진행건수): 며칠만 밀려도 배치 이상 의심
//   - 주간(가격지수류): 1~2주 정도는 정상, 3주 넘으면 배치 확인 필요
//   - 월간(거래량·미분양·전세수급 등): 발표 시차가 있어 40일까지는 정상
//   - 월간·시차 큰 지표(ECOS 연체율은 확정까지 2~3개월 걸림 확인됨): 더 넉넉한 기준
//   - 수동 입력(낙찰률 등): 사람이 매달 챙겨 넣는 지표라 40일 기준
import type { IndicatorId } from "./indicators";

export type FreshnessLevel = "green" | "yellow" | "red";

export interface Freshness {
  level: FreshnessLevel;
  label: string;
  daysSince: number;
  reason: string;
}

interface Cadence {
  greenDays: number; // 이 안이면 정상
  yellowDays: number; // 이 안이면 주의, 넘으면 경고
  description: string;
}

const CADENCE: Record<IndicatorId, Cadence> = {
  auction_case_count: { greenDays: 3, yellowDays: 7, description: "매일 자동 수집(태인경매 API)" },
  auction_win_rate: { greenDays: 40, yellowDays: 55, description: "월 1회 수동 입력" },
  auction_win_price_ratio: { greenDays: 40, yellowDays: 55, description: "월 1회 수동 입력" },
  price_index_weekly: { greenDays: 12, yellowDays: 21, description: "주간 발표(KOSIS)" },
  jeonse_ratio: { greenDays: 12, yellowDays: 21, description: "주간 발표(KOSIS)" },
  jeonse_supply_demand_index: { greenDays: 45, yellowDays: 65, description: "월간 발표, 약 1개월 시차" },
  trade_volume: { greenDays: 45, yellowDays: 65, description: "월간 집계, 신고기한 30일 시차" },
  unsold_housing: { greenDays: 45, yellowDays: 65, description: "월간 발표(KOSIS)" },
  move_in_volume: { greenDays: 45, yellowDays: 65, description: "월 1회 수동 입력" },
  mortgage_rate: { greenDays: 75, yellowDays: 110, description: "월간 발표(ECOS), 약 1개월 시차" },
  mortgage_delinquency: {
    greenDays: 100,
    yellowDays: 140,
    description: "월간 발표(ECOS), 확정까지 2~3개월 시차 확인됨",
  },
};

export function getFreshness(indicatorId: IndicatorId, asOf: string, today: Date = new Date()): Freshness {
  const asOfDate = new Date(`${asOf}T00:00:00`);
  const daysSince = Math.floor((today.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24));
  const cadence = CADENCE[indicatorId];

  // 입주가구수처럼 "그 달 예정치"를 월말 날짜로 미리 저장하는 지표는 asOf가 미래일 수 있다 —
  // 이 경우 데이터가 뒤쳐진 게 아니라 오히려 최신이므로 정상(green)으로 본다.
  if (daysSince < 0) {
    return {
      level: "green",
      label: "최신 반영됨",
      daysSince,
      reason: `기준일이 ${-daysSince}일 뒤(예정치) — 최신 상태 (${cadence.description})`,
    };
  }

  let level: FreshnessLevel;
  if (daysSince <= cadence.greenDays) level = "green";
  else if (daysSince <= cadence.yellowDays) level = "yellow";
  else level = "red";

  const label =
    level === "green"
      ? "최신 반영됨"
      : level === "yellow"
        ? "갱신 지연 — 확인 필요"
        : "갱신 안 됨 — 원본 소스 확인 필요";

  return {
    level,
    label,
    daysSince,
    reason: `기준일로부터 ${daysSince}일 경과 (${cadence.description}, 정상 기준 ${cadence.greenDays}일 이내)`,
  };
}
