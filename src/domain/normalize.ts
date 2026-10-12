import type { Article, Hotspot, Sensor, WeatherLocation, WeatherPoint, SourceStatus } from "./types";
import { safeUrl } from "./filters";

// CSV FIRMS dapat berisi kolom berkutip. Kesalahan format bukan dianggap data kosong.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const character = input[i];
    if (character === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if (character === "\n" && !quoted) {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += character;
  }
  if (quoted) throw new Error("CSV tidak lengkap.");
  row.push(cell.replace(/\r$/, ""));
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeFirms(text: string, sensor: Sensor): Hotspot[] {
  const [headers, ...rows] = parseCsv(text);
  const required = ["latitude", "longitude", "acq_date", "acq_time", "confidence"];
  if (!headers || !required.every((name) => headers.includes(name))) throw new Error("Respons FIRMS bukan CSV hotspot yang valid.");
  return rows.map((values, index) => {
    const item = Object.fromEntries(headers.map((name, position) => [name, values[position]?.trim() ?? ""]));
    const latitude = finite(item.latitude), longitude = finite(item.longitude);
    const time = item.acq_time.padStart(4, "0");
    const observedAt = `${item.acq_date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`;
    const confidence = ({ low: "l", nominal: "n", high: "h" } as Record<string, string>)[item.confidence.toLowerCase()] ?? item.confidence.toLowerCase();
    if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.acq_date) || !/^\d{4}$/.test(time) ||
      Number(time.slice(0, 2)) > 23 || Number(time.slice(2)) > 59 || !Number.isFinite(Date.parse(observedAt)) ||
      !["l", "n", "h"].includes(confidence) ||
      new Date(observedAt).toISOString().slice(0, 10) !== item.acq_date) throw new Error(`Baris hotspot ${index + 2} tidak valid.`);
    return {
      id: `${sensor}:${observedAt}:${latitude}:${longitude}`,
      latitude, longitude, observedAt, sensor, confidence: confidence as Hotspot["confidence"],
      frp: finite(item.frp), dayNight: item.daynight === "D" || item.daynight === "N" ? item.daynight : null,
    };
  });
}

export function mergeHotspots(previous: Hotspot[], incoming: Hotspot[], now = Date.now()): Hotspot[] {
  const cutoff = now - 7 * 86_400_000;
  const unique = new Map<string, Hotspot>();
  for (const point of [...previous, ...incoming]) {
    const time = Date.parse(point.observedAt);
    if (time >= cutoff && time <= now) unique.set(point.id, point);
  }
  return [...unique.values()].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function normalizeNews(payload: unknown): Article[] {
  const root = object(payload);
  if (!Array.isArray(root.articles)) throw new Error("Respons berita tidak valid.");
  const unique = new Map<string, Article>();
  for (const raw of root.articles) {
    const item = object(raw), url = safeUrl(item.url);
    if (!url || typeof item.title !== "string" || typeof item.seendate !== "string") continue;
    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(item.seendate);
    if (!match) continue;
    const indexedAt = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`;
    if (!Number.isFinite(Date.parse(indexedAt))) continue;
    const canonical = new URL(url);
    canonical.hash = "";
    for (const key of [...canonical.searchParams.keys()]) if (key.startsWith("utm_") || key === "fbclid") canonical.searchParams.delete(key);
    const id = canonical.href;
    unique.set(id, { id, url, title: item.title.trim(), domain: new URL(url).hostname, indexedAt, language: String(item.language ?? ""), provider: "GDELT" });
  }
  if (root.articles.length && !unique.size) throw new Error("Tidak ada metadata berita valid dalam respons.");
  return [...unique.values()].sort((a, b) => b.indexedAt.localeCompare(a.indexedAt)).slice(0, 100);
}

export function normalizeWeather(payload: unknown, code: string, status: SourceStatus): WeatherLocation {
  const root = object(payload), location = object(root.lokasi);
  if (!Array.isArray(root.data) || location.adm4 !== code) throw new Error("Lokasi prakiraan BMKG tidak cocok.");
  const group = object(root.data[0]);
  if (!Array.isArray(group.cuaca)) throw new Error("Respons prakiraan BMKG tidak valid.");
  const points: WeatherPoint[] = [];
  for (const raw of group.cuaca.flat()) {
    const item = object(raw);
    if (typeof item.utc_datetime !== "string") continue;
    const time = item.utc_datetime.replace(" ", "T").replace(/Z$/, "") + "Z";
    if (!Number.isFinite(Date.parse(time))) continue;
    points.push({ time, temperature: finite(item.t), humidity: finite(item.hu), windSpeed: finite(item.ws), windDirection: String(item.wd ?? ""), description: String(item.weather_desc ?? "Tidak tersedia") });
  }
  const latitude = finite(location.lat), longitude = finite(location.lon);
  if (!points.length || latitude === null || longitude === null) throw new Error("Prakiraan BMKG kosong atau koordinat tidak valid.");
  return {
    code, name: [location.desa, location.kotkab].filter(Boolean).join(", "), latitude, longitude,
    issuedAt: typeof group.analysis_date === "string" ? group.analysis_date : typeof root.analysis_date === "string" ? root.analysis_date : null,
    points: points.sort((a, b) => a.time.localeCompare(b.time)), status,
  };
}
