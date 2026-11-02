import type { FeatureCollection, Point } from "geojson";
import type { Hotspot } from "./types";

// [bujur, lintang, keyakinan]; 1 = tinggi, 0 = nominal. Format datar agar berkas dunia tetap kecil.
export type WorldPoint = [number, number, 0 | 1];
export interface WorldSnapshot { version: 1; generatedAt: string; points: WorldPoint[] }

// Kisi 0,01° (~1 km) membuang duplikat antar satelit; keyakinan tinggi menang.
export function toWorldPoints(hotspots: Hotspot[]): WorldPoint[] {
  const cells = new Map<string, WorldPoint>();
  for (const point of hotspots) {
    if (point.confidence === "l") continue;
    const longitude = Math.round(point.longitude * 100) / 100, latitude = Math.round(point.latitude * 100) / 100;
    const key = `${longitude},${latitude}`, high = point.confidence === "h" ? 1 : 0;
    const existing = cells.get(key);
    if (!existing) cells.set(key, [longitude, latitude, high]);
    else if (high) existing[2] = 1;
  }
  return [...cells.values()];
}

export function decodeWorld(raw: unknown): WorldSnapshot {
  const data = raw as WorldSnapshot;
  const valid = data && data.version === 1 && Number.isFinite(Date.parse(data.generatedAt)) && Array.isArray(data.points) &&
    data.points.every((point) => Array.isArray(point) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90 && (point[2] === 0 || point[2] === 1));
  if (!valid) throw new Error("Format data dunia tidak sesuai.");
  return data;
}

export function worldGeojson(points: WorldPoint[]): FeatureCollection<Point> {
  return { type: "FeatureCollection", features: points.map(([longitude, latitude, high]) => ({ type: "Feature", geometry: { type: "Point", coordinates: [longitude, latitude] }, properties: { high } })) };
}
