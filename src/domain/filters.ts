import type { Filters, Hotspot, SourceStatus } from "./types";

export const REGIONS = [
  { id: "all", name: "Seluruh Indonesia", bounds: [94, -11.5, 142, 6.5] },
  { id: "sumatra", name: "Sekitar Sumatra", bounds: [94, -6.5, 107, 6.5] },
  { id: "kalimantan", name: "Sekitar Kalimantan", bounds: [108, -4.5, 119.5, 4.5] },
  { id: "java", name: "Sekitar Jawa & Bali", bounds: [105, -9.5, 116, -5.5] },
  { id: "sulawesi", name: "Sekitar Sulawesi", bounds: [118, -6, 125.5, 2.5] },
  { id: "nusatenggara", name: "Sekitar Nusa Tenggara", bounds: [115.5, -11.5, 125.5, -7.5] },
  { id: "maluku", name: "Sekitar Maluku", bounds: [125, -9, 131.5, 3] },
  { id: "papua", name: "Sekitar Papua", bounds: [130.5, -10, 142, 1] },
] as const;

export function filterHotspots(data: Hotspot[], filters: Filters, now = Date.now()): Hotspot[] {
  const region = REGIONS.find((item) => item.id === filters.region) ?? REGIONS[0];
  const [west, south, east, north] = region.bounds;
  const cutoff = now - filters.hours * 3_600_000;
  return data.filter((point) => {
    const time = Date.parse(point.observedAt);
    return time >= cutoff && time <= now &&
      point.longitude >= west && point.longitude <= east &&
      point.latitude >= south && point.latitude <= north &&
      (filters.sensor === "all" || point.sensor === filters.sensor) &&
      (filters.confidence === "all" || (filters.confidence === "h" ? point.confidence === "h" : point.confidence !== "l"));
  });
}

export function dailyCounts(data: Hotspot[], now = Date.now()): { date: string; count: number }[] {
  const dates = Array.from({ length: 7 }, (_, index) => new Date(now - (6 - index) * 86_400_000).toISOString().slice(0, 10));
  const counts = new Map(dates.map((date) => [date, 0]));
  for (const point of data) {
    const date = point.observedAt.slice(0, 10);
    if (counts.has(date)) counts.set(date, counts.get(date)! + 1);
  }
  return dates.map((date) => ({ date, count: counts.get(date)! }));
}

export function effectiveStatus(status: SourceStatus, maxAgeHours: number, now = Date.now()): SourceStatus {
  if ((status.state === "ok" || status.state === "partial") &&
    (!status.lastSuccessAt || now - Date.parse(status.lastSuccessAt) > maxAgeHours * 3_600_000)) {
    return { ...status, state: "stale", message: "Data terakhir tersimpan sudah melewati jadwal pembaruan." };
  }
  return status;
}

export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}
