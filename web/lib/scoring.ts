// 스코어링 엔진 — 단일 진실 소스: docs/scoring-model.md
// CLAUDE.md 불변식 §1-3: 이 계산 로직은 이 파일 밖에서 재구현하지 않는다.

import { INDICATORS, WEIGHT_SUM, type IndicatorId } from "./indicators";

/** -1(비우호) / 0(중립) / +1(우호) */
export type SignalScore = -1 | 0 | 1;

export interface IndicatorReading {
  indicatorId: IndicatorId;
  score: SignalScore;
  value: number;
  asOf: string; // ISO date
  note?: string;
}

export interface ScoringResult {
  weightedSum: number; // -10 ~ +10
  rawIndex: number; // 0~100, 오버라이드 적용 전
  index: number; // 0~100, 오버라이드(캡) 적용 후
  capped: boolean;
  band: {
    label: string;
    range: [number, number];
    guidance: string;
  };
}

const BANDS: { min: number; max: number; label: string; guidance: string }[] = [
  { min: 0, max: 30, label: "비우호 국면", guidance: "추가 하락 여지, 관망" },
  { min: 30, max: 50, label: "하방 둔화, 관찰 필요", guidance: "선행지표 전환 여부 매주 체크" },
  { min: 50, max: 70, label: "전환 신호 누적 중", guidance: "선행지표 2개 이상 우호 전환 시 매수 검토 시작" },
  { min: 70, max: 85, label: "매수 우호 국면", guidance: "다수 지표 동반 우호, 실행 검토" },
  { min: 85, max: 100, label: "과열 진입 가능성", guidance: "이미 가격 반영 다수 → 주의" },
];

function findBand(index: number) {
  const band = BANDS.find((b) => index >= b.min && index <= b.max) ?? BANDS[0];
  return { label: band.label, range: [band.min, band.max] as [number, number], guidance: band.guidance };
}

/**
 * docs/scoring-model.md §3~5 그대로 구현.
 * readings에 없는 지표는 0(중립)으로 간주한다.
 */
export function computeScore(readings: IndicatorReading[]): ScoringResult {
  const readingMap = new Map(readings.map((r) => [r.indicatorId, r]));

  let weightedSum = 0;
  for (const indicator of INDICATORS) {
    const score = readingMap.get(indicator.id)?.score ?? 0;
    weightedSum += score * indicator.weight;
  }

  const rawIndex = ((weightedSum + WEIGHT_SUM) / (2 * WEIGHT_SUM)) * 100;

  // 오버라이드 규칙(§5): 선행지표(isLeading, 현재 4종) 중 2개 이상이 -1이면 지수 상한 60
  const leadingNegatives = INDICATORS.filter((i) => i.isLeading).filter(
    (i) => (readingMap.get(i.id)?.score ?? 0) === -1
  ).length;

  const capped = leadingNegatives >= 2 && rawIndex > 60;
  const index = capped ? 60 : rawIndex;

  return {
    weightedSum,
    rawIndex,
    index,
    capped,
    band: findBand(index),
  };
}

/**
 * 선행지표(isLeading)만으로 계산한 0~100 참고용 지수. 같은 공식((가중합+W)/(2W)×100)을
 * 선행지표의 가중치 합 W로 적용하고, 오버라이드 캡은 적용하지 않는다. 채점(매수신호지수)에는
 * 쓰지 않는 표시 전용이며, 선행성 자체는 아직 검증되지 않았다(docs/scoring-model.md 참고).
 */
export function computeLeadingIndex(readings: IndicatorReading[]): number {
  const readingMap = new Map(readings.map((r) => [r.indicatorId, r]));
  const leading = INDICATORS.filter((i) => i.isLeading);
  const weightSum = leading.reduce((sum, i) => sum + i.weight, 0);
  const weightedSum = leading.reduce((sum, i) => sum + (readingMap.get(i.id)?.score ?? 0) * i.weight, 0);
  return ((weightedSum + weightSum) / (2 * weightSum)) * 100;
}
