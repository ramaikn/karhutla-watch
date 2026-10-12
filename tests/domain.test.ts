import { describe, expect, test } from "bun:test";
import { dailyCounts, effectiveStatus, filterHotspots, safeUrl } from "../src/domain/filters";
import { mergeHotspots, normalizeFirms, normalizeNews, normalizeWeather, parseCsv } from "../src/domain/normalize";
import type { Article, Filters, Hotspot, SourceStatus } from "../src/domain/types";
import { fetchNews, mergeNews, normalizeRss } from "../scripts/news";
import { NEWS_FEEDS } from "../config/news-sources";
import { NewsTransport, retryAfterMs } from "../scripts/news-transport";
import { layout } from "../src/ui/layout";
import { readPublicCsv } from "../scripts/firms";
import { decodeSnapshot, encodeSnapshot } from "../src/domain/snapshot";
import type { Snapshot } from "../src/domain/types";
import { heatmapGeojson } from "../src/domain/heatmap";
import { basemapStyle } from "../src/ui/basemap";

const now = Date.parse("2026-10-12T12:00:00Z");
const point: Hotspot = { id: "one", latitude: -1, longitude: 114, observedAt: "2026-10-12T10:00:00Z", confidence: "n", sensor: "VIIRS_NOAA20_NRT", frp: 3, dayNight: "D" };
const filters: Filters = { hours: 24, region: "all", confidence: "reliable", sensor: "all" };
const success: SourceStatus = { state: "ok", checkedAt: "2026-10-12T11:00:00Z", lastSuccessAt: "2026-10-12T11:00:00Z", message: "Berhasil" };

describe("FIRMS dan penyimpanan", () => {
  test("CSV publik diproses streaming dan negara tetangga disaring", async () => {
    const chunks = ["latitude,longitude,acq_date,acq_time,confidence\n-1,114,2026-10-12,1000,n\n", "40,-100,2026-10-12,1000,h\n4,114,2026-10-12,1000,h\n"];
    const stream = new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk)); controller.close(); } });
    const points = await readPublicCsv(new Response(stream), "VIIRS_NOAA20_NRT", (item) => item.latitude < 0);
    expect(points).toHaveLength(1);
    expect(points[0].longitude).toBe(114);
    await expect(readPublicCsv(new Response("Invalid key"), "VIIRS_SNPP_NRT", () => true)).rejects.toThrow();
  });
  test("CSV berkutip dan waktu tanpa nol awal", () => {
    expect(parseCsv('a,b\n"satu, dua","kutip ""dua"""\n')).toEqual([["a", "b"], ["satu, dua", 'kutip "dua"']]);
    const points = normalizeFirms("latitude,longitude,acq_date,acq_time,confidence,frp,daynight\n-1,114,2026-10-12,45,n,2.5,N\n", "VIIRS_SNPP_NRT");
    expect(points[0].observedAt).toBe("2026-10-12T00:45:00Z");
    expect(points[0].frp).toBe(2.5);
    const publicPoint = normalizeFirms("latitude,longitude,acq_date,acq_time,confidence\n-1,114,2026-10-12,45,nominal\n", "VIIRS_SNPP_NRT");
    expect(publicPoint[0].confidence).toBe("n");
  });
  test("respons gagal tidak berubah menjadi nol deteksi", () => {
    expect(() => normalizeFirms("Invalid MAP_KEY", "VIIRS_SNPP_NRT")).toThrow();
    expect(() => normalizeFirms("latitude,longitude,acq_date,acq_time,confidence\n-1,114,2026-10-12,2500,h", "VIIRS_SNPP_NRT")).toThrow();
    expect(() => parseCsv('a,b\n"rusak')).toThrow();
    expect(normalizeFirms("latitude,longitude,acq_date,acq_time,confidence\n", "VIIRS_SNPP_NRT")).toEqual([]);
  });
  test("duplikat identik diganti, deteksi antar sensor tetap terpisah", () => {
    const updated = { ...point, frp: 9 };
    const otherSensor = { ...point, id: "two", sensor: "VIIRS_SNPP_NRT" as const };
    expect(mergeHotspots([point], [updated, otherSensor], now)).toHaveLength(2);
    expect(mergeHotspots([point], [updated], now)[0].frp).toBe(9);
    expect(mergeHotspots([{ ...point, observedAt: "2026-10-01T00:00:00Z" }], [], now)).toHaveLength(0);
    expect(mergeHotspots([{ ...point, observedAt: "2026-10-13T00:00:00Z" }], [], now)).toHaveLength(0);
  });
});

describe("filter dan status", () => {
  test("peta dasar tanpa kunci memakai OSM dengan dark mode pada raster saja", () => {
    const style = basemapStyle();
    expect(style.sources.osm.type).toBe("raster");
    expect(JSON.stringify(style)).toContain("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(JSON.stringify(style)).not.toMatch(/carto|api[_-]?key|access_token/i);
    const base = style.layers.find((layer) => layer.id === "base");
    expect(base?.type).toBe("raster");
    if (base?.type !== "raster") throw new Error("Layer raster tidak tersedia");
    expect(base.paint?.["raster-brightness-min"]).toBeGreaterThan(base.paint?.["raster-brightness-max"] as number);
  });
  test("heatmap mempertahankan jumlah deteksi setelah agregasi", () => {
    const heatmap = heatmapGeojson([point, { ...point, id: "close", longitude: 114.001 }, { ...point, id: "far", longitude: 115 }]);
    expect(heatmap.features).toHaveLength(2);
    expect(heatmap.features.reduce((total, feature) => total + Number(feature.properties?.count), 0)).toBe(3);
    expect(heatmapGeojson([]).features).toHaveLength(0);
  });
  test("snapshot ringkas mempertahankan koordinat, sensor, waktu, dan FRP", () => {
    const sample: Snapshot = { version: 1, generatedAt: success.checkedAt, coverage: { start: null, end: null }, sources: { firms: success, news: success, weather: success }, sensorStatus: {}, hotspots: [point], articles: [], weather: [], boundary: null };
    const restored = decodeSnapshot(encodeSnapshot(sample));
    expect(restored.hotspots[0].latitude).toBe(point.latitude);
    expect(restored.hotspots[0].sensor).toBe(point.sensor);
    expect(Date.parse(restored.hotspots[0].observedAt)).toBe(Date.parse(point.observedAt));
    expect(restored.hotspots[0].frp).toBe(point.frp);
    expect(() => decodeSnapshot({ packedHotspots: [[NaN, 114, 1, 0, 0, 1, 1]] })).toThrow();
  });
  test("filter waktu, wilayah, sensor, dan keyakinan", () => {
    const values = [point, { ...point, id: "low", confidence: "l" as const }, { ...point, id: "old", observedAt: "2026-10-10T00:00:00Z" }];
    expect(filterHotspots(values, filters, now)).toEqual([point]);
    expect(filterHotspots(values, { ...filters, confidence: "all" }, now)).toHaveLength(2);
    expect(filterHotspots(values, { ...filters, region: "java" }, now)).toHaveLength(0);
    expect(filterHotspots(values, { ...filters, sensor: "VIIRS_SNPP_NRT" }, now)).toHaveLength(0);
    expect(filterHotspots(values, { ...filters, confidence: "h" }, now)).toHaveLength(0);
  });
  test("tren selalu tujuh tanggal UTC", () => {
    const days = dailyCounts([point], now);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-10-06");
    expect(days[6].count).toBe(1);
  });
  test("data kedaluwarsa tidak dilabeli terbaru", () => {
    expect(effectiveStatus(success, 2, now).state).toBe("ok");
    expect(effectiveStatus(success, 2, now + 3 * 3_600_000).state).toBe("stale");
    expect(effectiveStatus({ ...success, lastSuccessAt: null }, 2, now).state).toBe("stale");
  });
  test("tolak tautan skrip", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("https://example.org/news")).toBe("https://example.org/news");
  });
});

describe("berita dan cuaca", () => {
  test("seluruh media memakai query, rentang waktu, dan sumber yang sama", () => {
    expect(NEWS_FEEDS).toHaveLength(25);
    for (const feed of NEWS_FEEDS) {
      const url = new URL(feed.url);
      expect(url.hostname).toBe("news.google.com");
      expect(url.searchParams.get("q")).toContain('karhutla OR "kebakaran hutan" OR "kebakaran lahan" OR "kebakaran gambut"');
      expect(url.searchParams.get("q")).toContain("when:7d");
      expect(url.searchParams.get("q")).toContain(`site:${feed.domains[0]}`);
    }
  });
  test("RSS memvalidasi domain media dan membuang akhiran penerbit dari judul", () => {
    const xml = '<rss><channel><item><title>Karhutla meluas - Kompas.com</title><link>https://news.google.com/rss/articles/one</link><source url="https://www.kompas.com">Kompas.com</source><pubDate>Mon, 12 Oct 2026 18:00:00 +0700</pubDate></item><item><title>Karhutla</title><link>https://news.google.com/rss/articles/two</link><source url="https://kompas.com.evil.test">Kompas</source><pubDate>Mon, 12 Oct 2026 18:00:00 +0700</pubDate></item></channel></rss>';
    const feed = NEWS_FEEDS.find((item) => item.name === "Kompas")!;
    const articles = normalizeRss(xml, "2026-10-12T12:00:00Z", feed);
    expect(articles).toHaveLength(1);
    expect(articles[0].domain).toBe("www.kompas.com");
    expect(articles[0].title).toBe("Karhutla meluas");
    expect(articles[0].provider).toBe("Google News RSS");
    const direct = { ...articles[0], id: "direct", title: "Karhutla meluas", url: "https://www.kompas.com/a", publishedAt: "2026-10-12T11:01:00Z" };
    expect(mergeNews(articles, [direct], "2026-10-12T12:00:00Z")).toEqual([direct]);
    expect(mergeNews(articles, [], "2026-10-21T12:00:00Z")).toEqual([]);
    expect(normalizeRss(xml, "2026-10-12T12:00:00Z", NEWS_FEEDS[0])).toEqual([]);
    expect(() => normalizeRss('<!DOCTYPE rss><rss/>', "2026-10-12T12:00:00Z", feed)).toThrow();
    expect(normalizeRss(xml, "2026-10-11T12:00:00Z", feed)).toEqual([]);
    expect(normalizeRss(xml.replaceAll("Karhutla", "Olahraga"), "2026-10-12T12:00:00Z", feed)).toEqual([]);
  });
  test("satu feed gagal tidak membatalkan media lain dan data lama tetap tersimpan", async () => {
    const prior: Article = { id: "old", title: "Karhutla sebelumnya", domain: "www.kompas.com", url: "https://www.kompas.com/old", indexedAt: "2026-10-11T11:00:00Z", provider: "Google News RSS", language: "Indonesian" };
    const requested: string[] = [];
    const result = await fetchNews("2026-10-12T12:00:00Z", [prior], async (url) => {
      requested.push(url);
      if (new URL(url).searchParams.get("q")?.includes("site:antaranews.com")) return new Response('<rss><channel><title>ANTARA</title></channel></rss>');
      throw new Error("Offline");
    });
    expect(result.successes).toEqual(["ANTARA"]);
    expect(result.failures).toHaveLength(24);
    expect(new Set(requested).size).toBe(25);
    expect(result.articles).toEqual([prior]);
    await expect(fetchNews("2026-10-12T12:00:00Z", [], async () => { throw new Error("Offline"); })).rejects.toThrow();
  });
  test("cache, permintaan bersyarat, jeda, dan Retry-After mengurangi pengambilan", async () => {
    let time = now, requests = 0;
    const xml = '<rss><channel><title>Berita</title></channel></rss>';
    const transport = new NewsTransport(".runtime", (async (_url, options) => {
      requests++;
      if (requests === 1) return new Response(xml, { headers: { ETag: '"one"' } });
      if (requests === 2) {
        expect(new Headers(options?.headers).get("If-None-Match")).toBe('"one"');
        return new Response(null, { status: 304 });
      }
      return new Response("Limit", { status: 429, headers: { "Retry-After": "120" } });
    }) as typeof fetch, () => time, async (ms) => { time += ms; });
    expect(await (await transport.load("https://news.google.com/one")).text()).toBe(xml);
    await transport.load("https://news.google.com/one");
    expect(requests).toBe(1);
    time += 26 * 60_000;
    expect(await (await transport.load("https://news.google.com/one")).text()).toBe(xml);
    await expect(transport.load("https://news.google.com/two")).rejects.toThrow();
    await expect(transport.load("https://news.google.com/three")).rejects.toThrow();
    expect(requests).toBe(3);
    expect(retryAfterMs("120", now)).toBe(120_000);
    expect(retryAfterMs(new Date(now + 180_000).toUTCString(), now)).toBe(180_000);
  });
  test("frontend tidak memuat badge status atau pesan collector", () => {
    expect(layout).not.toMatch(/firms-status|news-status|weather-status|news-detail|weather-detail|source-table|via Google News|Sebagian tersedia/);
  });
  test("lebih dari 100 berita lintas media dipertahankan dan waktu dipakai untuk urutan", () => {
    const articles: Article[] = Array.from({ length: 150 }, (_, i) => ({ id: `news-${i}`, title: `Karhutla ${i}`, url: `https://www.kompas.com/${i}`, domain: "www.kompas.com", language: "Indonesian", indexedAt: new Date(now - i * 60_000).toISOString() }));
    const merged = mergeNews([], articles.reverse(), new Date(now).toISOString());
    expect(merged).toHaveLength(150);
    expect(merged[0].id).toBe("news-0");
    expect(merged.at(-1)?.id).toBe("news-149");
  });
  test("bersihkan tautan pelacakan dan waktu indeks", () => {
    const articles = normalizeNews({ articles: [
      { title: "Berita satu", url: "https://example.org/a?utm_source=x", seendate: "20261012T100000Z", language: "Indonesian" },
      { title: "Berita sama", url: "https://example.org/a", seendate: "20261012T100000Z" },
      { title: "Skrip", url: "javascript:alert(1)", seendate: "20261012T100000Z" },
    ] });
    expect(articles).toHaveLength(1);
    expect(articles[0].indexedAt).toBe("2026-10-12T10:00:00Z");
    expect(() => normalizeNews({ message: "rate limited" })).toThrow();
  });
  test("prakiraan memerlukan desa yang cocok dan waktu UTC", () => {
    const payload = { lokasi: { adm4: "31.71.03.1001", desa: "Kemayoran", kotkab: "Jakarta Pusat", lat: -6.16, lon: 106.84 }, data: [{ analysis_date: "2026-10-12T00:00:00Z", cuaca: [[{ utc_datetime: "2026-10-12 12:00:00", t: 30, hu: 70, ws: 5, wd: "E", weather_desc: "Berawan" }]] }] };
    const weather = normalizeWeather(payload, "31.71.03.1001", success);
    expect(weather.points[0].time).toBe("2026-10-12T12:00:00Z");
    expect(weather.points[0].humidity).toBe(70);
    expect(() => normalizeWeather(payload, "14.71.01.1001", success)).toThrow();
    expect(() => normalizeWeather({}, "31.71.03.1001", success)).toThrow();
  });
});
