import { resolve } from "node:path";
import { rename } from "node:fs/promises";
import { SENSORS, type Hotspot } from "../src/domain/types";
import { toWorldPoints, type WorldSnapshot } from "../src/domain/world";
import { loadBoundary } from "./boundary";
import { fetchPublicFirms } from "./firms";

// Deteksi 24 jam di luar Indonesia, hanya untuk lapisan peta. Terpisah dari snapshot utama
// agar kegagalan atau ukuran data dunia tidak memengaruhi hitungan dan peringkat Indonesia.
const root = resolve(import.meta.dir, "..");
const filePath = resolve(root, "public/data/world.json");
const boundary = await loadBoundary(root);
const insideBox = (point: Hotspot) => point.longitude >= 94 && point.longitude <= 142 && point.latitude >= -11.5 && point.latitude <= 6.5;
const outsideIndonesia = (point: Hotspot) => point.confidence !== "l" && !(insideBox(point) && boundary.contains(point));

const hotspots: Hotspot[] = [];
let successes = 0;
for (const sensor of SENSORS) {
  try {
    hotspots.push(...await fetchPublicFirms(sensor, 1, outsideIndonesia, null));
    successes++;
  } catch (error) {
    console.error(`Data dunia ${sensor} gagal diambil.`, error instanceof Error ? error.message : error);
  }
}
if (!successes) throw new Error("Semua sensor gagal; world.json lama dipertahankan.");

const snapshot: WorldSnapshot = { version: 1, generatedAt: new Date().toISOString(), points: toWorldPoints(hotspots) };
await Bun.write(`${filePath}.next`, JSON.stringify(snapshot));
await rename(`${filePath}.next`, filePath);
console.log(`Dunia: ${snapshot.points.length} deteksi dari ${successes} sensor.`);
