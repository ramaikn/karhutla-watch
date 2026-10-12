import { resolve } from "node:path";
import { rename } from "node:fs/promises";
import { assignProvinces, rankFires, rankAir, validateProvinces, type AirSnapshot, type ProvinceIndex } from "../src/domain/rankings";
import { RANKING_HOURS, RANKING_CONFIDENCE, RANKING_SENSORS, rankingKey, validateRankingSnapshot, type RankingSnapshot, type NewsSnapshot } from "../src/domain/ranking-snapshot";
import { decodeSnapshot } from "../src/domain/snapshot";
import type { Snapshot } from "../src/domain/types";

export function buildRankings(snapshot: Snapshot, provinces: ProvinceIndex, air: AirSnapshot | null): RankingSnapshot {
  validateProvinces(provinces);
  if (!snapshot.generatedAt || !Number.isFinite(Date.parse(snapshot.generatedAt))) throw new Error("Waktu snapshot tidak valid.");
  const assignments = assignProvinces(snapshot.hotspots, provinces.provinces);
  const fires: RankingSnapshot["fires"] = {};
  const now = Date.parse(snapshot.generatedAt);
  for (const hours of RANKING_HOURS) for (const confidence of RANKING_CONFIDENCE) for (const sensor of RANKING_SENSORS) {
    const filters = { hours, confidence, sensor, region: "all" };
    fires[rankingKey(filters)] = rankFires(snapshot.hotspots, filters, provinces.provinces, assignments, now).rows;
  }
  const result: RankingSnapshot = { version: 1, generatedAt: snapshot.generatedAt, firesUpdatedAt: snapshot.sources.firms.lastSuccessAt, airUpdatedAt: air?.generatedAt ?? null, fires, air: rankAir(air?.readings ?? []) };
  validateRankingSnapshot(result);
  return result;
}

export async function prepareData(root: string, snapshot: Snapshot): Promise<void> {
  const directory = resolve(root, "public/data");
  const provinces = await Bun.file(resolve(directory, "provinces.json")).json();
  const airFile = Bun.file(resolve(directory, "air-quality.json"));
  const air: AirSnapshot | null = await airFile.exists() ? await airFile.json() : null;
  const startedAt = performance.now();
  const ranking = buildRankings(snapshot, provinces, air);
  const news: NewsSnapshot = { version: 1, generatedAt: ranking.generatedAt, articles: snapshot.articles };
  for (const [name, data] of [["rankings.json", ranking], ["news.json", news]] as const) {
    const path = resolve(directory, name);
    await Bun.write(`${path}.next`, JSON.stringify(data));
    await rename(`${path}.next`, path);
  }
  console.log(`Data siap: ${Object.keys(ranking.fires).length} kombinasi ranking, ${(performance.now() - startedAt).toFixed(0)} ms.`);
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "..");
  await prepareData(root, decodeSnapshot(await Bun.file(resolve(root, "public/data/latest.json")).json()));
}
