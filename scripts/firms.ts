import type { Hotspot, Sensor } from "../src/domain/types";
import { normalizeFirms } from "../src/domain/normalize";
import { request } from "./http";

const downloads: Record<Sensor, { directory: string; prefix: string }> = {
  VIIRS_NOAA20_NRT: { directory: "noaa-20-viirs-c2", prefix: "J1_VIIRS_C2" },
  VIIRS_NOAA21_NRT: { directory: "noaa-21-viirs-c2", prefix: "J2_VIIRS_C2" },
  VIIRS_SNPP_NRT: { directory: "viirs", prefix: "SUOMI_VIIRS_C2" },
};

// Unduhan global besar diproses per baris. Hanya kotak Indonesia yang dinormalisasi.
export async function readPublicCsv(response: Response, sensor: Sensor, contains: (point: Hotspot) => boolean): Promise<Hotspot[]> {
  if (!response.body) throw new Error("Unduhan NASA tidak memiliki isi.");
  let pending = "", header = "", latitudeIndex = -1, longitudeIndex = -1;
  const points: Hotspot[] = [];
  const decoder = new TextDecoder();
  function line(value: string): void {
    const clean = value.trim();
    if (!clean) return;
    if (!header) {
      normalizeFirms(`${clean}\n`, sensor);
      header = clean;
      const columns = clean.split(",");
      latitudeIndex = columns.indexOf("latitude"); longitudeIndex = columns.indexOf("longitude");
      return;
    }
    const columns = clean.split(","), latitude = Number(columns[latitudeIndex]), longitude = Number(columns[longitudeIndex]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("Koordinat unduhan NASA tidak valid.");
    if (longitude < 94 || longitude > 142 || latitude < -11.5 || latitude > 6.5) return;
    const point = normalizeFirms(`${header}\n${clean}\n`, sensor)[0];
    if (contains(point)) points.push(point);
  }
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) { line(pending.slice(0, end)); pending = pending.slice(end + 1); }
      if (pending.length > 20_000) throw new Error("Baris unduhan NASA terlalu panjang.");
    }
    pending += decoder.decode();
    if (pending.trim()) line(pending);
    if (!header) throw new Error("Unduhan NASA kosong.");
    return points;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function fetchPublicFirms(sensor: Sensor, days: 1 | 7, contains: (point: Hotspot) => boolean): Promise<Hotspot[]> {
  const source = downloads[sensor];
  const suffix = days === 7 ? "7d" : "24h";
  const url = `https://firms.modaps.eosdis.nasa.gov/data/active_fire/${source.directory}/csv/${source.prefix}_Global_${suffix}.csv`;
  return readPublicCsv(await request(url, "text/csv", 120_000), sensor, contains);
}
