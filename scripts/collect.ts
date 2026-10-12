import { resolve } from "node:path";
import { rename, mkdir, unlink } from "node:fs/promises";
import { SENSORS, type Snapshot, type SourceStatus, type WeatherLocation } from "../src/domain/types";
import { mergeHotspots, normalizeFirms, normalizeWeather } from "../src/domain/normalize";
import { loadBoundary } from "./boundary";
import { request } from "./http";
import { fetchNews } from "./news";
import { fetchPublicFirms } from "./firms";
import { decodeSnapshot, encodeSnapshot } from "../src/domain/snapshot";
import { collectAir } from "./air-quality";

const root = resolve(import.meta.dir, "..");
const filePath = resolve(root, "public/data/latest.json");
let previous: Snapshot;
const now = new Date();
const timestamp = now.toISOString();
const key = process.env.FIRMS_MAP_KEY?.trim();
const newsOnly = process.argv.includes("--news-only");
const fresh = (message: string): SourceStatus => ({ state: "ok", checkedAt: timestamp, lastSuccessAt: timestamp, message });
const failed = (old: SourceStatus | undefined, message: string): SourceStatus => ({
  state: old?.lastSuccessAt ? "stale" : "unavailable", checkedAt: timestamp,
  lastSuccessAt: old?.lastSuccessAt ?? null, message,
});
let next: Snapshot;

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Kesalahan sumber tidak diketahui.";
  return key ? message.replaceAll(key, "[kunci disembunyikan]") : message;
}

async function collectFirms(): Promise<void> {
  let boundary: Awaited<ReturnType<typeof loadBoundary>>;
  try { boundary = await loadBoundary(root); }
  catch (error) {
    const message = `Batas Indonesia gagal dimuat. ${errorMessage(error)} Pengambilan dihentikan agar data negara tetangga tidak ikut dihitung.`;
    next.sources.firms = failed(previous.sources.firms, message);
    for (const sensor of SENSORS) next.sensorStatus[sensor] = failed(previous.sensorStatus[sensor], message);
    return;
  }
  next.boundary = boundary.attribution;
  let successes = 0;
  let publicSensors = 0;
  for (const sensor of SENSORS) {
    try {
      const lastSuccess = previous.sensorStatus[sensor]?.lastSuccessAt;
      let days: 1 | 7 = lastSuccess && now.getTime() - Date.parse(lastSuccess) < 20 * 3_600_000 ? 1 : 7;
      let incoming: Awaited<ReturnType<typeof fetchPublicFirms>> | null = null;
      if (key && /^[a-zA-Z0-9_-]+$/.test(key)) {
        try {
          const ranges = [
            { start: new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10), days: 5 },
            { start: new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10), days: 3 },
          ];
          const apiPoints = [];
          for (const range of ranges) {
            const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${sensor}/94,-11.5,142,6.5/${range.days}/${range.start}`;
            apiPoints.push(...normalizeFirms(await (await request(url, "text/csv")).text(), sensor).filter(boundary.contains));
          }
          incoming = apiPoints; days = 7;
        } catch { /* Kunci opsional; unduhan publik mengambil alih saat API gagal. */ }
      }
      const publicDownload = incoming === null;
      if (publicDownload) { incoming = await fetchPublicFirms(sensor, days, boundary.contains); publicSensors++; }
      const cutoff = now.getTime() - days * 86_400_000;
      const retained = next.hotspots.filter((point) => point.sensor !== sensor || Date.parse(point.observedAt) < cutoff);
      next.hotspots = mergeHotspots(retained, incoming!, now.getTime());
      next.sensorStatus[sensor] = fresh(`${publicDownload ? "CSV resmi NASA tanpa kunci" : "API resmi NASA"}: ${days === 7 ? "tujuh hari" : "24 jam"} diperbarui dan disaring dengan batas Indonesia.`);
      successes++;
    } catch (error) {
      next.sensorStatus[sensor] = failed(previous.sensorStatus[sensor], `Data sensor gagal diperbarui. ${errorMessage(error)} Data lama dipertahankan.`);
    }
  }
  next.sources.firms = successes ? {
    ...fresh(`${successes} dari ${SENSORS.length} sensor berhasil diperbarui${publicSensors ? " melalui CSV publik resmi NASA tanpa kunci" : " melalui API NASA"}. Jumlah ini adalah deteksi, bukan jumlah kejadian kebakaran.`),
    state: successes === SENSORS.length ? "ok" : "partial",
  } : failed(previous.sources.firms, "Semua sensor gagal diperbarui. Periksa koneksi dan ketersediaan NASA FIRMS; rincian tersedia per sensor.");
  if (successes) next.coverage = { start: new Date(now.getTime() - 7 * 86_400_000).toISOString(), end: timestamp };
}

async function collectNews(): Promise<void> {
  try {
    const result = await fetchNews(timestamp, previous.articles);
    next.articles = result.articles;
    next.sources.news = {
      ...fresh(`Sumber diperbarui: ${result.successes.join(", ")}.${result.failures.length ? ` Gagal diakses: ${result.failures.join(", ")}; berita tersimpan dipertahankan hingga tujuh hari.` : ""} Hasil penemuan bukan konfirmasi lapangan dan bukan seluruh berita Indonesia.`),
      state: result.failures.length ? "partial" : "ok",
    };
  } catch {
    next.sources.news = failed(previous.sources.news, "Semua sumber berita gagal diakses atau respons tidak valid. Berita tersimpan dipertahankan.");
  }
}

async function collectWeather(): Promise<void> {
  const config = await Bun.file(resolve(root, "config/weather-locations.json")).json() as { code: string; label: string }[];
  const locations: WeatherLocation[] = [];
  let successes = 0;
  for (const location of config) {
    const old = previous.weather.find((item) => item.code === location.code);
    try {
      if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(location.code)) throw new Error("Kode desa tidak valid.");
      const url = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${location.code}`;
      locations.push(normalizeWeather(await (await request(url, "application/json")).json(), location.code, fresh("Prakiraan BMKG berhasil diperbarui.")));
      successes++;
    } catch {
      locations.push(old ? { ...old, status: failed(old.status, "Prakiraan lokasi gagal diperbarui.") } : {
        code: location.code, name: location.label, latitude: 0, longitude: 0, issuedAt: null, points: [],
        status: failed(undefined, "Prakiraan lokasi belum tersedia. Periksa kode desa di konfigurasi."),
      });
    }
    await Bun.sleep(1_100);
  }
  next.weather = locations;
  next.sources.weather = successes ? { ...fresh(`${successes} dari ${config.length} lokasi berhasil diperbarui.`), state: successes === config.length ? "ok" : "partial" } : failed(previous.sources.weather, "Prakiraan BMKG belum berhasil diperbarui.");
}

// Penguncian mencegah dua proses saling menimpa snapshot.
await mkdir(resolve(root, ".runtime"), { recursive: true });
const lockPath = resolve(root, ".runtime/collect.lock");
const { open } = await import("node:fs/promises");
const lock = await open(lockPath, "wx").catch(() => { throw new Error("Pengambilan lain sedang berjalan. Jika proses sebelumnya terhenti, hapus .runtime/collect.lock."); });
try {
  previous = decodeSnapshot(await Bun.file(filePath).json());
  next = structuredClone(previous);
  next.generatedAt = timestamp;
    if (newsOnly) await collectNews();
    else {
      next.hotspots = mergeHotspots(previous.hotspots, [], now.getTime());
      await Promise.all([collectFirms(), collectNews(), collectWeather(), collectAir(root).catch((error) => console.error("Udara gagal diperbarui; snapshot lama dipertahankan.", errorMessage(error)))]);
    }
  const tempPath = `${filePath}.next`;
  await Bun.write(tempPath, JSON.stringify(encodeSnapshot(next)));
  await rename(tempPath, filePath);
  for (const [name, status] of Object.entries(next.sources)) console.log(`${name}: ${status.state}. ${status.message}`);
  console.log(`Snapshot: ${next.hotspots.length} deteksi, ${next.articles.length} berita, ${next.weather.length} lokasi cuaca.`);
} finally {
  await lock.close();
  await unlink(lockPath);
}
