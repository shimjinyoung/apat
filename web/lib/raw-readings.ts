// data-pipeline이 export_json.py로 만든 원자료(raw value)를 읽는다.
// 채점(-1/0/+1)은 여기서 하지 않는다 — classify.ts로 위임(불변식 §1-3 유지).

import fs from "node:fs";
import path from "node:path";
import type { IndicatorId } from "./indicators";

/** 스코어링에 참여하지 않는 참고용 표시 시리즈 — INDICATORS 배열에는 없지만 DB/히스토리에는 있다. */
export type AuxSeriesId =
  | "price_avg_per_sqm"
  | "base_rate"
  | "csi_housing_seoul"
  | "csi_housing_gyeonggi"
  | "csi_housing_incheon"
  | "housing_sentiment_national"
  | "housing_sentiment_capital";

export type SeriesId = IndicatorId | AuxSeriesId;

export interface RawReading {
  indicatorId: SeriesId;
  asOf: string;
  value: number;
  sourceName: string;
  sourceUrl: string;
  note: string;
  collectedAt: string;
}

const GENERATED_PATH = path.join(process.cwd(), "data", "latest-readings.generated.json");
const HISTORY_PATH = path.join(process.cwd(), "data", "history.generated.json");

/** 파이프라인을 아직 한 번도 안 돌렸으면 null — 호출부에서 샘플 데이터로 폴백한다. */
export function loadRawReadings(): RawReading[] | null {
  try {
    const raw = fs.readFileSync(GENERATED_PATH, "utf-8");
    return JSON.parse(raw) as RawReading[];
  } catch {
    return null;
  }
}

/** data_pipeline/export_history.py 산출물 — 지표ID → 시계열(전체 히스토리) 맵.
 * 스코어링 지표 외에 참고용 표시 시리즈(예: price_avg_per_sqm)도 같이 들어있다. */
export function loadHistory(): Record<SeriesId, RawReading[]> | null {
  try {
    const raw = fs.readFileSync(HISTORY_PATH, "utf-8");
    return JSON.parse(raw) as Record<SeriesId, RawReading[]>;
  } catch {
    return null;
  }
}

export function latestCollectedAt(readings: RawReading[]): string | null {
  if (readings.length === 0) return null;
  return readings.reduce((max, r) => (r.collectedAt > max ? r.collectedAt : max), readings[0].collectedAt);
}
