import type { AirReading, FireRanking } from "./rankings";
import { SENSORS, type Filters, type Article } from "./types";

export const RANKING_HOURS = [24, 72, 168] as const;
export const RANKING_CONFIDENCE = ["all", "reliable", "h"] as const;
export const RANKING_SENSORS = ["all", ...SENSORS] as const;
export interface RankingSnapshot {
  version: 1;
  generatedAt: string;
  firesUpdatedAt: string | null;
  airUpdatedAt: string | null;
  fires: Record<string, FireRanking[]>;
  air: AirReading[];
}
export interface NewsSnapshot { version: 1; generatedAt: string; articles: Article[] }
export function rankingKey(filters: Pick<Filters, "hours" | "confidence" | "sensor">): string {
  return `${filters.hours}:${filters.confidence}:${filters.sensor}`;
}

export function validateRankingSnapshot(value: unknown): asserts value is RankingSnapshot {
  const data = value as RankingSnapshot;
  const validTime = (v: unknown) => v === null || typeof v === "string" && Number.isFinite(Date.parse(v));
  if (data?.version !== 1 || typeof data.generatedAt !== "string" || !validTime(data.generatedAt) || !validTime(data.firesUpdatedAt) || !validTime(data.airUpdatedAt) || !data.fires || !Array.isArray(data.air)) throw new Error("Format peringkat tidak valid.");
  for (const hours of RANKING_HOURS) for (const confidence of RANKING_CONFIDENCE) for (const sensor of RANKING_SENSORS) {
    const rows = data.fires[rankingKey({ hours, confidence, sensor })];
    if (!Array.isArray(rows) || rows.length !== 38 || new Set(rows.map((r) => r.code)).size !== 38 || rows.some((r) => typeof r.code !== "string" || typeof r.name !== "string" || !Array.isArray(r.bounds) || r.bounds.length !== 4 || !r.bounds.every(Number.isFinite) || !Number.isInteger(r.count) || r.count < 0 || !Number.isInteger(r.high) || r.high < 0 || r.high > r.count || !(r.maxFrp === null || Number.isFinite(r.maxFrp) && r.maxFrp >= 0))) throw new Error("Tabel peringkat tidak lengkap.");
  }
  if (data.air.some((r) => typeof r.name !== "string" || !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude) || typeof r.time !== "string" || !Number.isFinite(Date.parse(r.time)) || ![r.pm25, r.pm10].every((v) => v === null || Number.isFinite(v) && v >= 0))) throw new Error("Data udara tidak valid.");
}
