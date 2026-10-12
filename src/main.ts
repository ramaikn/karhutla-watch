import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import { layout } from "./ui/layout";
import type { HotspotMap } from "./ui/map";
import { element, formatDate, numberFormat } from "./ui/dom";
import { renderDetections, renderTrend } from "./ui/panels";
import { effectiveStatus, filterHotspots, REGIONS } from "./domain/filters";
import { SENSORS, type Filters, type Snapshot } from "./domain/types";
import { decodeSnapshot } from "./domain/snapshot";
import { initializeWorkspace } from "./ui/workspace";
import { WeatherSearch } from "./ui/weather-search";
import { RankingPanel } from "./ui/ranking-panel";
import { NewsPanel } from "./ui/news-panel";
import { dataUrl } from "./domain/data-url";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = layout;
function node<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id) as T; }
let snapshot: Snapshot | null = null;
let map: HotspotMap | null = null;
let mode: "points" | "heatmap" = "points";
let loading = false;
let mapFingerprint = "";
const snapshotUrl = dataUrl("latest.json");
const filters: Filters = { hours: 24, region: "all", confidence: "reliable", sensor: "all" };
const weatherSearch = new WeatherSearch();
const rankingPanel = new RankingPanel(() => map);
const newsPanel = new NewsPanel();
for (const region of REGIONS) { const option = element("option", "", region.name); option.value = region.id; node<HTMLSelectElement>("region").append(option); }
async function initializeMap(): Promise<void> {
  try {
    const { HotspotMap } = await import("./ui/map");
    map = new HotspotMap(node("map"), (message) => { node("map-error").textContent = message; node("map-error").hidden = false; });
    map.setNewsVisible(!node("berita").hidden);
    map.setMode(mode);
    mapFingerprint = "";
    render();
  } catch {
   node("map-error").textContent = "Peta tidak dapat ditampilkan. Buka daftar deteksi atau gunakan peramban lain.";
    node("map-error").hidden = false;
  }
}

function render(): void {
  if (!snapshot) return;
  const firms = effectiveStatus(snapshot.sources.firms, 2);
  const available = Boolean(firms.lastSuccessAt);
  const points = filterHotspots(snapshot.hotspots, filters).sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const fingerprint = `${snapshot.generatedAt}:${JSON.stringify(filters)}:${points.length}:${points[0]?.id ?? ""}`;
  if (map && fingerprint !== mapFingerprint) { map.update(points); mapFingerprint = fingerprint; }
  node("count").textContent = available ? numberFormat.format(points.length) : "—";
  rankingPanel.update(filters);
  node("high-count").textContent = available ? numberFormat.format(points.filter((point) => point.confidence === "h").length) : "—";
  node("latest-observation").textContent = points.length ? formatDate(points[0].observedAt) : "Belum tersedia";
  const empty = node("map-empty");
  empty.hidden = points.length > 0;
  empty.textContent = available ? "Tidak ada deteksi tersimpan yang cocok dengan filter." : "Data hotspot belum tersedia";
  node<HTMLButtonElement>("download").disabled = !points.length;
  renderDetections(node("detection-list"), points, available, (point) => map?.show(point));
  renderTrend(node("trend-chart"), filterHotspots(snapshot.hotspots, { ...filters, hours: 168 }), available);
  newsPanel.seed(snapshot.articles, snapshot.generatedAt);
  node("updated").textContent = `Data: ${formatDate(snapshot.generatedAt)}`;
}

function validateSnapshot(value: unknown): asserts value is Snapshot {
  const data = value as Snapshot;
  const validStatus = (status: Snapshot["sources"]["firms"] | undefined) => status && ["ok", "partial", "stale", "unavailable"].includes(status.state) && typeof status.message === "string" && (status.lastSuccessAt === null || Number.isFinite(Date.parse(status.lastSuccessAt)));
  if (!data || data.version !== 1 || !data.sources || !data.sensorStatus || !["firms", "news", "weather"].every((key) => validStatus(data.sources[key as keyof Snapshot["sources"]])) ||
    !Array.isArray(data.hotspots) || !Array.isArray(data.articles) || !Array.isArray(data.weather) ||
    data.hotspots.some((point) => !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || !Number.isFinite(Date.parse(point.observedAt)) || !SENSORS.includes(point.sensor) || !["l", "n", "h"].includes(point.confidence)) ||
    data.articles.some((article) => typeof article.title !== "string" || typeof article.domain !== "string" || typeof article.url !== "string") ||
    data.weather.some((location) => typeof location.code !== "string" || !Array.isArray(location.points) || !validStatus(location.status))) {
    throw new Error("Format berkas data tidak sesuai. Data sebelumnya dipertahankan jika tersedia.");
  }
}

async function load(): Promise<void> {
  if (loading) return;
  loading = true;
  const button = node<HTMLButtonElement>("reload"); button.disabled = true; button.textContent = "Memuat…";
  try {
    const response = await fetch(snapshotUrl, { cache: "no-cache", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("Berkas data tidak dapat dimuat. Coba lagi saat koneksi tersedia.");
    const raw: unknown = await response.json();
    if (snapshot && raw && typeof raw === "object" && (raw as { generatedAt?: string }).generatedAt === snapshot.generatedAt) return;
    const data = decodeSnapshot(raw); validateSnapshot(data);
    snapshot = data;
    weatherSearch.seed(snapshot.weather);
    node("load-error").hidden = true;
    render();
  } catch (error) {
    console.error("Data gagal dimuat", error);
    node("load-error").textContent = "Data belum dapat dimuat. Coba muat ulang.";
    node("load-error").hidden = false;
    if (!snapshot) {
      node("updated").textContent = "Data belum dapat dimuat";
      node("map-empty").hidden = false; node("map-empty").textContent = "Data belum dapat dimuat";
    }
  } finally { loading = false; button.disabled = false; button.textContent = "Muat ulang data"; }
}

for (const selected of ["points", "heatmap"] as const) {
  node(`view-${selected}`).addEventListener("click", () => {
    mode = selected;
    map?.setMode(mode);
    node("view-points").setAttribute("aria-pressed", String(mode === "points"));
    node("view-heatmap").setAttribute("aria-pressed", String(mode === "heatmap"));
    document.querySelector<HTMLElement>(".legend")!.hidden = mode === "heatmap";
    node("heatmap-legend").hidden = mode !== "heatmap";
  });
}

node("filters").addEventListener("submit", (event) => event.preventDefault());
node("filters").addEventListener("change", () => {
  const oldRegion = filters.region;
  filters.hours = Number(node<HTMLSelectElement>("hours").value);
  filters.region = node<HTMLSelectElement>("region").value;
  filters.confidence = node<HTMLSelectElement>("confidence").value as Filters["confidence"];
  filters.sensor = node<HTMLSelectElement>("sensor").value as Filters["sensor"];
  rankingPanel.update(filters);
  if (oldRegion !== filters.region) map?.fit(filters.region);
  render();
});
node("reload").addEventListener("click", () => { void load(); void rankingPanel.load(true); void newsPanel.load(); });
node("download").addEventListener("click", () => {
  if (!snapshot) return;
  const rows = [["latitude", "longitude", "observed_at_utc", "sensor", "confidence", "frp_mw", "source"],
    ...filterHotspots(snapshot.hotspots, filters).map((point) => [point.latitude, point.longitude, point.observedAt, point.sensor, point.confidence, point.frp ?? "", "NASA FIRMS"])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = element("a"); link.href = url; link.download = `karhutla-watch-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
});
initializeWorkspace(() => map);
void load();
void initializeMap();
// Hitungan waktu dan status kedaluwarsa tetap benar jika tab dibiarkan terbuka.
setInterval(() => { render(); void load(); void rankingPanel.load(); void newsPanel.load(); }, 60_000);
