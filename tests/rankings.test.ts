import { expect, test } from "bun:test";
import { assignProvinces, normalizeAir, rankAir, rankFires, validateProvinces, type Province } from "../src/domain/rankings";
import type { Hotspot } from "../src/domain/types";
import { layout } from "../src/ui/layout";
import { buildRankings } from "../scripts/prepare-data";
import { decodeSnapshot } from "../src/domain/snapshot";
import { rankingKey, validateRankingSnapshot } from "../src/domain/ranking-snapshot";

const now = Date.parse("2026-10-13T00:00:00Z");
const province = (code: string, x: number): Province => ({ code, name: `Provinsi ${code}`, latitude: 0.5, longitude: x + 0.5, bounds: [x, 0, x + 1, 1], geometry: { type: "Polygon", coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]]] } });
const provinces = [province("11", 100), province("12", 102)];
const point = (id: string, longitude: number, frp: number | null, confidence: "h" | "n" = "n"): Hotspot => ({ id, longitude, latitude: 0.5, frp, confidence, observedAt: new Date(now - 1000).toISOString(), sensor: "VIIRS_NOAA20_NRT", dayNight: "D" });

test("peringkat nasional menghitung deteksi, keyakinan tinggi dan FRP tanpa mengklaim jumlah kebakaran", () => {
  const points = [point("a", 100.5, 12, "h"), point("b", 100.5, 25), point("c", 102.5, null), point("d", 110, 100)];
  const assigned = assignProvinces(points, provinces);
  const result = rankFires(points, { hours: 24, region: "kalimantan", confidence: "reliable", sensor: "all" }, provinces, assigned, now);
  expect(result.rows[0]).toMatchObject({ code: "11", count: 2, high: 1, maxFrp: 25 });
  expect(result.rows[1]).toMatchObject({ code: "12", count: 1, maxFrp: null });
  expect(result.unassigned).toBe(1);
  expect(rankFires(points, { hours: 24, region: "all", confidence: "h", sensor: "all" }, provinces, assigned, now).rows[0].count).toBe(1);
});

test("batas 38 provinsi cocok dengan titik Indonesia termasuk wilayah Papua baru", async () => {
  const index: unknown = await Bun.file("public/data/provinces.json").json(); validateProvinces(index);
  const spots = [point("kalimantan", 113.92, 1), point("sorong", 131.25, 1), point("merauke", 140.4, 1)];
  spots[0].latitude = -2.21; spots[1].latitude = -0.87; spots[2].latitude = -8.49;
  const assigned = assignProvinces(spots, index.provinces);
  expect(assigned.get("kalimantan")).toBe("62"); expect(assigned.get("sorong")).toBe("96"); expect(assigned.get("merauke")).toBe("93");
});

test("udara memvalidasi koordinat, waktu, satuan dan mengurutkan PM2.5 dengan nilai kosong terakhir", () => {
  const raw = provinces.map((p, i) => ({ latitude: p.latitude, longitude: p.longitude, current: { time: "2026-10-13T00:00", pm2_5: i ? 50 : null, pm10: 70 }, current_units: { pm2_5: "μg/m³", pm10: "μg/m³" } }));
  const air = normalizeAir(raw, provinces, new Date(now).toISOString());
  expect(rankAir(air.readings)[0].code).toBe("12");
  expect(rankAir(air.readings)[1].pm25).toBeNull();
  expect(() => normalizeAir(raw.slice(0, 1), provinces, new Date(now).toISOString())).toThrow();
  expect(() => normalizeAir(raw, provinces, "2026-10-15T00:00:00Z")).toThrow();
  raw[0].latitude = 40;
  expect(() => normalizeAir(raw, provinces, new Date(now).toISOString())).toThrow();
});

test("panel peringkat ada dan catatan teknis dipindah keluar antarmuka", () => {
  expect(layout).toContain('data-panel="ranking"'); expect(layout).toContain('id="air-ranking"');
  expect(layout).not.toMatch(/Mengikuti filter peta|sensor yang gagal|bukan prediksi|bukan berarti aman|Jendela penyimpanan|Waktu indeks bukan/);
});

test("workflow menyiapkan 36 kombinasi filter tanpa geometri atau deteksi mentah", async () => {
  const index: unknown = await Bun.file("public/data/provinces.json").json(); validateProvinces(index);
  const snapshot = decodeSnapshot(await Bun.file("public/data/latest.json").json());
  snapshot.generatedAt = new Date(now).toISOString();
  snapshot.hotspots = [point("a", 113.92, 20, "h"), point("b", 113.92, 8)];
  snapshot.hotspots.forEach((p) => { p.latitude = -2.21; });
  const data = buildRankings(snapshot, index, null);
  validateRankingSnapshot(data);
  expect(Object.keys(data.fires)).toHaveLength(36);
  const key = rankingKey({ hours: 24, confidence: "reliable", sensor: "all" });
  expect(data.fires[key][0]).toMatchObject({ code: "62", count: 2, high: 1, maxFrp: 20 });
  expect(data.fires[rankingKey({ hours: 24, confidence: "h", sensor: "all" })][0].count).toBe(1);
  expect(data.fires[rankingKey({ hours: 24, confidence: "all", sensor: "VIIRS_SNPP_NRT" })].every((r) => r.count === 0)).toBe(true);
  expect(JSON.stringify(data)).not.toMatch(/geometry|observedAt|coordinates/);
  expect(() => validateRankingSnapshot({ ...data, fires: {} })).toThrow();
  expect(() => validateRankingSnapshot({ ...data, air: [{ pm25: -1 }] })).toThrow();
});
