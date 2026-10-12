import { resolve } from "node:path";
import type { Province, ProvinceIndex } from "../src/domain/rankings";
import { validateProvinces } from "../src/domain/rankings";

const revision = "171a2ac275e36061a7a6c9f8634ceaadf4f70931";
const base = `https://raw.githubusercontent.com/cahyadsn/wilayah_boundaries/${revision}`;
const provinces: Province[] = [];
for (let part = 1; part <= 8; part++) {
  const response = await fetch(`${base}/db/prov/wilayah_boundaries_prov_${part}.sql`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Batas provinsi HTTP ${response.status}`);
  const sql = await response.text();
  for (const match of sql.matchAll(/\('([\d]{2})'\s*,\s*'([^']+)'\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*'(\[.*?\])'\s*\)/gs)) {
    // Sumber memakai lat,lng; GeoJSON memakai lng,lat. Tidak menyederhanakan ulang.
    const raw = JSON.parse(match[5]);
    const original = (typeof raw[0]?.[0]?.[0] === "number" ? [raw] : raw) as number[][][][];
    const coordinates = original.map((polygon) => polygon.map((ring) => ring.map(([lat, lng]) => [lng, lat])));
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    for (const polygon of coordinates) for (const ring of polygon) for (const [lng, lat] of ring) { w = Math.min(w, lng); s = Math.min(s, lat); e = Math.max(e, lng); n = Math.max(n, lat); }
    provinces.push({ code: match[1], name: match[2], latitude: Number(match[3]), longitude: Number(match[4]), bounds: [w, s, e, n], geometry: { type: "MultiPolygon", coordinates } });
  }
}
provinces.sort((a, b) => a.code.localeCompare(b.code));
const index: ProvinceIndex = { version: 1, source: `https://github.com/cahyadsn/wilayah_boundaries/tree/${revision}`, license: "MIT", provinces };
validateProvinces(index);
await Bun.write(resolve(import.meta.dir, "../public/data/provinces.json"), JSON.stringify(index));
console.log(`Batas ${provinces.length} provinsi disiapkan.`);
