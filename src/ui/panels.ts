import type { Article, Hotspot, WeatherLocation } from "../domain/types";
import { dailyCounts, safeUrl } from "../domain/filters";
import { element, externalLink, formatDate, numberFormat } from "./dom";

export function renderDetections(container: HTMLElement, points: Hotspot[], available: boolean, onSelect: (point: Hotspot) => void): void {
  container.replaceChildren();
  if (!points.length) {
    container.append(element("p", "empty-state", available ? "Tidak ada deteksi yang cocok dengan filter." : "Data titik panas belum tersedia."));
    return;
  }
  for (const point of points.slice(0, 60)) {
    const button = element("button", "detection-row"); button.type = "button";
    const top = element("div", "row-top");
    top.append(element("span", `dot ${point.confidence === "h" ? "high" : point.confidence === "n" ? "nominal" : "low"}`), element("strong", "", `${point.latitude.toFixed(3)}, ${point.longitude.toFixed(3)}`));
    button.append(top, element("span", "", formatDate(point.observedAt)), element("small", "", `${point.sensor.replace("VIIRS_", "").replace("_NRT", "")} · ${{ h: "tinggi", n: "nominal", l: "rendah" }[point.confidence]}`));
    button.addEventListener("click", () => onSelect(point));
    container.append(button);
  }
  if (points.length > 60) container.append(element("p", "source-detail", `60 terbaru dari ${numberFormat.format(points.length)} deteksi. Unduh CSV untuk seluruh hasil filter.`));
}

export function renderTrend(container: HTMLElement, points: Hotspot[], available: boolean): void {
  container.replaceChildren();
  if (!available) { container.append(element("p", "empty-state", "Tren akan tampil setelah data hotspot berhasil diambil.")); return; }
  const days = dailyCounts(points), maximum = Math.max(...days.map((day) => day.count), 1);
  const chart = element("div", "bars");
  for (const day of days) {
    const column = element("div", "bar-column");
    column.setAttribute("aria-label", `${day.date}: ${day.count} deteksi tersimpan`);
    const track = element("div", "bar-track"), bar = element("div", "bar");
    bar.style.height = `${day.count / maximum * 100}%`;
    track.append(bar);
    column.append(element("span", "bar-count", numberFormat.format(day.count)), track, element("span", "bar-label", `${day.date.slice(8)}/${day.date.slice(5, 7)}`));
    chart.append(column);
  }
  container.append(chart);
}

export function renderNews(container: HTMLElement, articles: Article[], search: string): void {
  container.replaceChildren();
  const query = search.trim().toLocaleLowerCase("id");
  const matches = articles.filter((article) => `${article.title} ${article.domain}`.toLocaleLowerCase("id").includes(query))
    .sort((a, b) => Date.parse(b.publishedAt ?? b.indexedAt) - Date.parse(a.publishedAt ?? a.indexedAt));
  if (!matches.length) {
    container.append(element("p", "empty-state", query ? "Tidak ada berita yang cocok." : "Belum ada berita."));
    return;
  }
  for (const article of matches) {
    const url = safeUrl(article.url);
    if (!url) continue;
    const card = element("article", "news-card");
    card.append(element("p", "news-meta", `${article.domain} · ${formatDate(article.publishedAt ?? article.indexedAt)}`), externalLink(article.title, url, "news-title"));
    container.append(card);
  }
}

export function renderWeather(container: HTMLElement, location: WeatherLocation | undefined): void {
  container.replaceChildren();
  if (!location) { container.append(element("p", "empty-state", "Prakiraan belum tersedia.")); return; }
  const upcoming = location.points.filter((point) => Date.parse(point.time) >= Date.now()).slice(0, 8);
  if (!upcoming.length) { container.append(element("p", "empty-state", "Tidak ada prakiraan mendatang yang tersimpan untuk lokasi ini.")); return; }
  const point = upcoming[0];
  const lead = element("div", "weather-lead");
  lead.append(element("strong", "temperature", point.temperature !== null ? `${point.temperature}°C` : "—"), element("div", "", point.description));
  container.append(lead, element("p", "source-detail", `Berlaku ${formatDate(point.time)}`));
  const metrics = element("div", "weather-metrics");
  metrics.append(element("p", "", `Kelembapan ${point.humidity !== null ? `${point.humidity}%` : "tidak tersedia"}`), element("p", "", `Angin ${point.windSpeed !== null ? `${point.windSpeed} km/jam` : "tidak tersedia"} ${point.windDirection}`));
  container.append(metrics);
  const table = element("table", "forecast-table");
  const caption = element("caption", "", "Prakiraan berikutnya");
  const head = element("thead"), header = element("tr");
  for (const title of ["Waktu (WIB)", "Cuaca", "Suhu"]) { const cell = element("th", "", title); cell.scope = "col"; header.append(cell); }
  head.append(header);
  const body = element("tbody");
  for (const forecast of upcoming) {
    const row = element("tr");
    const date = new Date(forecast.time).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    row.append(element("td", "", date), element("td", "", forecast.description), element("td", "", forecast.temperature !== null ? `${forecast.temperature}°C` : "—"));
    body.append(row);
  }
  table.append(caption, head, body); container.append(table);
}
