// 원자료(raw value) 시계열 → -1/0/+1 채점. docs/scoring-model.md §2 를 코드로 옮긴 것.
// CLAUDE.md 불변식 §1-3: 스코어링(채점 포함) 로직은 이 파일 하나에서만 수행한다.
//
// 지표별로 두 가지 채점 방식을 쓴다.
//   A) 추세 채점: 최근 두 시점을 비교해 전기 대비 %변화로 채점 (거래량·미분양·가격지수류)
//   B) 절대수준 채점: 100 기준선처럼 절대값 자체에 의미가 있는 지표 (전세수급동향지수)
// 시계열이 2개 미만이면(주로 수동 입력 지표) 중립(0) + needsHistory=true 로 정직하게 표시한다.

import { INDICATORS, type IndicatorId } from "./indicators";
import { computeScore, computeLeadingIndex, type IndicatorReading, type ScoringResult, type SignalScore } from "./scoring";
import type { RawReading } from "./raw-readings";

export interface ClassifiedReading extends IndicatorReading {
  needsHistory: boolean;
  /** needsHistory가 true일 때 UI에 보여줄 사람이 읽을 수 있는 이유 */
  historyReason?: string;
  /** 파이프라인이 이 값을 실제로 수집·저장한 시각(DB collected_at) — 배치 정상 동작 여부 확인용 */
  collectedAt: string;
}

type Polarity = "risingIsBullish" | "risingIsBearish";

interface TrendConfig {
  polarity: Polarity;
  /** 이 값 미만의 변화는 "보합"(0)으로 본다 (mode="pct"면 %, mode="pp"면 %p) */
  thresholdPct: number;
  /** "pct"(기본): 전기 대비 변화율(%). "pp": 절대 변화폭(%p) — 금리처럼 그 자체가 %인 지표용 */
  mode?: "pct" | "pp";
  /** 몇 시점 전과 비교할지(기본 1=직전). 계단식으로 움직이는 금리는 3(=3개월 전 대비) */
  lookback?: number;
}

// A그룹: 추세(전기 대비 %) 기반 채점
// 2026-09-11 백테스트(data-pipeline/backtest.py, 1년치 실데이터)로 조정한 값.
// docs/scoring-model.md §6에 근거 수치와 한계를 기록해뒀다 — 특히 가격지수류는 지난 1년간
// 하락한 주가 없어 "-1(비우호)" 분기가 이 표본으로는 전혀 검증되지 않았다는 점 필독.
export const TREND_CONFIG: Partial<Record<IndicatorId, TrendConfig>> = {
  // 백테스트 결과 월간 변동폭 표준편차가 34%로 매우 커서 기존 5%는 노이즈에 과민 반응했다.
  // 15%로 상향(표준편차 절반 근사치). ⚠️ 신고기한 30일 지연으로 "최신월" 값이 아직 다
  // 신고되지 않아 실제보다 낮게 나오는 경향이 있어(예: 2026-08 3,019건으로 급감 표시),
  // 최근 1개월 비교는 실제 추세보다 더 하락한 것처럼 보일 수 있다 — TODO: 비교 기준을
  // "최신월" 대신 "최신에서 1개월 전"으로 한 칸 늦추는 방안 검토.
  trade_volume: { polarity: "risingIsBullish", thresholdPct: 15 },
  // 표준편차 8.4% — 기존 3%도 크게 무리 없었으나 노이즈를 조금 더 걸러내도록 4%로 소폭 상향.
  unsold_housing: { polarity: "risingIsBearish", thresholdPct: 4 },
  // 백테스트 표본(52주) 안에서 주간 하락이 단 한 번도 없어(최소 +0.054%) 이 임계치의
  // "하락 시" 동작은 검증되지 않았다. 그대로 유지하되 향후 하락 구간이 생기면 재검증 필요.
  price_index_weekly: { polarity: "risingIsBullish", thresholdPct: 0.05 },
  jeonse_ratio: { polarity: "risingIsBullish", thresholdPct: 0.05 },

  // 2026-09-13 법원경매정보 공식 API로 전환하며 12개월 재백필 완료 — 임계치는 여전히
  // docs/scoring-model.md §2 방향성 설명 기준의 잠정값이라 재검증 필요(단, 이제 시계열은 충분함).
  auction_win_rate: { polarity: "risingIsBullish", thresholdPct: 3 },
  auction_win_price_ratio: { polarity: "risingIsBullish", thresholdPct: 3 },
  // 경매 진행건수가 늘어나는 것은 부실(대출 연체·강제매각) 확산 신호(비우호), 정점 후
  // 감소는 부실 정리 마무리 신호(우호). 거래량과 성격이 비슷한 "건수형·월간" 지표라
  // 임계치도 거래량과 동일하게 잠정 설정(2026-09-13, 실데이터 쌓이면 재검증).
  auction_case_count: { polarity: "risingIsBearish", thresholdPct: 15 },
  // 입주물량 증가는 공급 부담(비우호), 감소(공급절벽)는 상방압력 신호(우호)
  move_in_volume: { polarity: "risingIsBearish", thresholdPct: 10 },
  // 연체율 상승은 부실 확산(비우호), 하락 전환은 연체 정리(우호). 2026-09-13 신규 추가,
  // 시계열 없어 백테스트 불가 — ECOS 실측 월별 등락폭(전월 대비 5~20%대)을 참고해 잠정 설정.
  mortgage_delinquency: { polarity: "risingIsBearish", thresholdPct: 10 },
  // 주담대 금리(2026-09-22 추가): 오르면 매수 여력↓(비우호). 금리는 그 자체가 %라 변화율이 아니라
  // %p로 보고, 월별 등락 노이즈를 줄이려 3개월 전과 비교한다. ±0.25%p는 기준금리 1회 조정폭 기준의
  // 잠정값(시계열 짧아 백테스트 불가).
  mortgage_rate: { polarity: "risingIsBearish", thresholdPct: 0.25, mode: "pp", lookback: 3 },
};

// B그룹: 절대수준 기반 채점 (100 기준선)
// ⚠️ 백테스트 표본(12개월)의 실제 범위는 101.6~127.5로 100을 한 번도 밑돈 적이 없어
// "-1(95 이하)" 분기도 이 표본으로는 검증되지 않았다. 95/105는 통계 기관이 정의한
// 공식 기준선(100=중립)이라 데이터에 맞춰 재조정하지 않고 그대로 유지한다.
export const DIFFUSION_INDEX_IDS: IndicatorId[] = ["jeonse_supply_demand_index"];
export const DIFFUSION_BULLISH_MIN = 105;
export const DIFFUSION_BEARISH_MAX = 95;

function sortByAsOf(history: RawReading[]): RawReading[] {
  return [...history].sort((a, b) => a.asOf.localeCompare(b.asOf));
}

function classifyDiffusionLevel(value: number): SignalScore {
  if (value >= DIFFUSION_BULLISH_MIN) return 1;
  if (value <= DIFFUSION_BEARISH_MAX) return -1;
  return 0;
}

function classifyTrend(sorted: RawReading[], config: TrendConfig): SignalScore {
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 1 - (config.lookback ?? 1)];

  if (config.mode === "pp") {
    const diff = latest.value - prev.value;
    if (Math.abs(diff) < config.thresholdPct) return 0;
    const rising = diff > 0;
    const bullish = config.polarity === "risingIsBullish" ? rising : !rising;
    return bullish ? 1 : -1;
  }

  // 이전 값이 0이면 %변화가 정의되지 않는다(0으로 나누기) — 예: 서울 입주가구수가 0인 달이
  // 실제로 있었다(2026-06). 값 자체의 변화(증감)만 보고 판단한다.
  if (prev.value === 0) {
    if (latest.value === prev.value) return 0;
    const rising = latest.value > prev.value;
    const bullish = config.polarity === "risingIsBullish" ? rising : !rising;
    return bullish ? 1 : -1;
  }

  const pct = ((latest.value - prev.value) / prev.value) * 100;
  if (Math.abs(pct) < config.thresholdPct) return 0;
  const rising = pct > 0;
  const bullish = config.polarity === "risingIsBullish" ? rising : !rising;
  return bullish ? 1 : -1;
}

/**
 * indicatorId의 히스토리(전체 시계열) 중 asOf <= cutoffDate 인 부분만 보고 그 시점 기준으로 채점한다.
 * cutoffDate를 생략하면 최신 시점 기준.
 */
export function classifyAsOf(
  indicatorId: IndicatorId,
  history: RawReading[],
  cutoffDate?: string
): ClassifiedReading | null {
  const upTo = sortByAsOf(cutoffDate ? history.filter((r) => r.asOf <= cutoffDate) : history);
  if (upTo.length === 0) return null;

  const latest = upTo[upTo.length - 1];
  const trendConfig = TREND_CONFIG[indicatorId];
  const isDiffusion = DIFFUSION_INDEX_IDS.includes(indicatorId);

  let score: SignalScore = 0;
  let needsHistory = true;
  let historyReason: string | undefined;

  if (isDiffusion) {
    score = classifyDiffusionLevel(latest.value);
    needsHistory = false;
  } else if (trendConfig) {
    const need = (trendConfig.lookback ?? 1) + 1;
    if (upTo.length >= need) {
      score = classifyTrend(upTo, trendConfig);
      needsHistory = false;
    } else {
      historyReason = `데이터가 ${upTo.length}개 시점뿐이라 추세를 계산할 수 없습니다. 최소 ${need}개 시점이 쌓여야 채점이 시작됩니다.`;
    }
  } else {
    historyReason = "이 지표는 아직 채점 기준이 정의되지 않았습니다.";
  }

  return {
    indicatorId,
    score,
    value: latest.value,
    asOf: latest.asOf,
    note: latest.note,
    needsHistory,
    historyReason,
    collectedAt: latest.collectedAt,
  };
}

/** 대시보드 카드용 — 지표별 "현재(최신)" 채점 결과 */
export function classifyLatest(historyMap: Record<string, RawReading[]>): ClassifiedReading[] {
  return INDICATORS.map((i) => classifyAsOf(i.id, historyMap[i.id] ?? [])).filter(
    (r): r is ClassifiedReading => r !== null
  );
}

export interface ScoreHistoryPoint {
  asOf: string;
  index: number;
  bandLabel: string;
  /** 선행지표만으로 계산한 참고용 지수(채점 미반영, 선행성 미검증) */
  leadingIndex?: number;
  /** 이 점이 "그 주 시점 재현"이 아니라 각 지표의 진짜 최신값으로 계산한 현재 지수인지 */
  isToday?: boolean;
}

/**
 * 종합 매수신호지수의 과거 추이. 주간 지표(매매가격지수)의 시점들을 타임라인으로 삼아
 * 각 시점 기준으로 그 이전까지의 데이터만으로 채점 → 가중합 → 지수를 계산한다(당시 시점 재현).
 *
 * 마지막에 "오늘" 점을 하나 더 붙인다 — 각 지표의 실제 최신값(classifyLatest)으로 계산해
 * 대시보드 상단 게이지와 항상 같은 값이 되도록 한다. 주간 재현값과 다를 수 있는데, 그건 버그가
 * 아니라 태인경매(일간)·ECOS/부동산R114(월간) 등 지표마다 갱신 시점이 달라 "그 주까지 알 수
 * 있었던 정보"와 "지금 알고 있는 정보"가 다르기 때문이다(2026-09-13 검증 및 사용자 확인).
 */
export function buildScoreHistory(historyMap: Record<string, RawReading[]>): ScoreHistoryPoint[] {
  const timeline = sortByAsOf(historyMap["price_index_weekly"] ?? []).map((r) => r.asOf);

  const weeklyPoints: ScoreHistoryPoint[] = timeline.map((asOf) => {
    const readings: IndicatorReading[] = INDICATORS.map((i) =>
      classifyAsOf(i.id, historyMap[i.id] ?? [], asOf)
    ).filter((r): r is ClassifiedReading => r !== null);

    const result: ScoringResult = computeScore(readings);
    return {
      asOf,
      index: Math.round(result.index * 10) / 10,
      bandLabel: result.band.label,
      leadingIndex: Math.round(computeLeadingIndex(readings) * 10) / 10,
    };
  });

  const todayAsOf = new Date().toISOString().slice(0, 10);
  const todayReadings = classifyLatest(historyMap);
  const todayResult: ScoringResult = computeScore(todayReadings);
  const todayPoint: ScoreHistoryPoint = {
    asOf: todayAsOf,
    index: Math.round(todayResult.index * 10) / 10,
    bandLabel: todayResult.band.label,
    leadingIndex: Math.round(computeLeadingIndex(todayReadings) * 10) / 10,
    isToday: true,
  };

  const last = weeklyPoints[weeklyPoints.length - 1];
  if (last && last.asOf >= todayAsOf) {
    // 마지막 주간 시점이 오늘과 같거나(드묾) 더 미래(시계 오차 등)면 그 점을 "오늘" 값으로 대체한다.
    return [...weeklyPoints.slice(0, -1), todayPoint];
  }
  return [...weeklyPoints, todayPoint];
}
