import type { MultiPolygon, Polygon } from "geojson";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { Filters, Hotspot } from "./types";
import { filterHotspots } from "./filters";

export interface Province { code: string; name: string; latitude: number; longitude: number; bounds: [number, number, number, number]; geometry: Polygon | MultiPolygon }
export interface ProvinceIndex { version: 1; source: string; license: string; provinces: Province[] }
export interface FireRanking { code: string; name: string; bounds: Province["bounds"]; count: number; high: number; maxFrp: number | null }
export interface AirReading { code: string; name: string; latitude: number; longitude: number; gridLatitude: number; gridLongitude: number; time: string; pm25: number | null; pm10: number | null }
export interface AirSnapshot { version: 1; generatedAt: string; source: string; readings: AirReading[] }

export function validateProvinces(value: unknown): asserts value is ProvinceIndex {
  const index = value as ProvinceIndex;
  if (index?.version !== 1 || !Array.isArray(index.provinces) || index.provinces.length !== 38 ||
    new Set(index.provinces.map((p) => p.code)).size !== 38 || index.provinces.some((p) => !/^\d{2}$/.test(p.code) || typeof p.name !== "string" || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) || p.bounds?.length !== 4 || !p.bounds.every(Number.isFinite) || !["Polygon", "MultiPolygon"].includes(p.geometry?.type))) throw new Error("Indeks provinsi tidak valid.");
}

export function assignProvinces(points: Hotspot[], provinces: Province[]): Map<string, string> {
  const assignments = new Map<string, string>();
  const coordinates = new Map<string, string | null>();
  for (const point of points) {
    const key = `${point.longitude}:${point.latitude}`;
    if (!coordinates.has(key)) {
      const province = provinces.find((p) => {
        const [w, s, e, n] = p.bounds;
        return point.longitude >= w && point.longitude <= e && point.latitude >= s && point.latitude <= n && booleanPointInPolygon([point.longitude, point.latitude], p.geometry);
      });
      coordinates.set(key, province?.code ?? null);
    }
    const code = coordinates.get(key);
    if (code) assignments.set(point.id, code);
  }
  return assignments;
}

export function rankFires(points: Hotspot[], filters: Filters, provinces: Province[], assignments: Map<string, string>, now = Date.now()): { rows: FireRanking[]; unassigned: number } {
  const rows = new Map(provinces.map((p) => [p.code, { code: p.code, name: p.name, bounds: p.bounds, count: 0, high: 0, maxFrp: null } as FireRanking]));
  let unassigned = 0;
  // Peringkat selalu nasional, tidak dipotong kotak wilayah peta.
  for (const point of filterHotspots(points, { ...filters, region: "all" }, now)) {
    const row = rows.get(assignments.get(point.id) ?? "");
    if (!row) { unassigned++; continue; }
    row.count++;
    if (point.confidence === "h") row.high++;
    if (point.frp !== null) row.maxFrp = Math.max(row.maxFrp ?? 0, point.frp);
  }
  return { rows: [...rows.values()].sort((a, b) => b.count - a.count || (b.maxFrp ?? -1) - (a.maxFrp ?? -1) || a.code.localeCompare(b.code)), unassigned };
}

export function normalizeAir(payload: unknown, provinces: Province[], checkedAt: string): AirSnapshot {
  if (!Array.isArray(payload) || payload.length !== provinces.length) throw new Error("Respons udara tidak lengkap.");
  const readings = payload.map((raw, i): AirReading => {
    const p = provinces[i], current = raw?.current;
    const time = typeof current?.time === "string" ? `${current.time.replace(/Z$/, "")}Z` : "";
    const validValue = (value: unknown) => value === null || typeof value === "number" && Number.isFinite(value) && value >= 0;
    if (!Number.isFinite(raw?.latitude) || !Number.isFinite(raw?.longitude) || Math.abs(raw.latitude - p.latitude) > 1 || Math.abs(raw.longitude - p.longitude) > 1 || !Number.isFinite(Date.parse(time)) || Math.abs(Date.parse(time) - Date.parse(checkedAt)) > 6 * 3_600_000 || raw.current_units?.pm2_5 !== "μg/m³" || raw.current_units?.pm10 !== "μg/m³" || !validValue(current.pm2_5) || !validValue(current.pm10)) throw new Error("Respons udara tidak sesuai lokasi, waktu, atau satuan.");
    return { code: p.code, name: p.name, latitude: p.latitude, longitude: p.longitude, gridLatitude: raw.latitude, gridLongitude: raw.longitude, time, pm25: current.pm2_5, pm10: current.pm10 };
  });
  return { version: 1, generatedAt: checkedAt, source: "CAMS Global / Open-Meteo", readings };
}

export function rankAir(readings: AirReading[]): AirReading[] {
  return [...readings].sort((a, b) => (b.pm25 ?? -1) - (a.pm25 ?? -1) || a.code.localeCompare(b.code));
}
