import { rankingKey, validateRankingSnapshot, type RankingSnapshot } from "../domain/ranking-snapshot";
import { dataUrl } from "../domain/data-url";
import type { Filters } from "../domain/types";
import { element, formatDate, numberFormat } from "./dom";
import type { HotspotMap } from "./map";

export class RankingPanel {
  private data: RankingSnapshot | null = null;
  private loading: Promise<void> | null = null;
  private lastCheckedAt = 0;
  private filters: Filters = { hours: 24, confidence: "reliable", sensor: "all", region: "all" };
  private renderedKey = "";
  private readonly fireNode = document.getElementById("fire-ranking")!;
  private readonly airNode = document.getElementById("air-ranking")!;

  constructor(private readonly getMap: () => HotspotMap | null) {
    document.querySelector('[data-panel="ranking"]')!.addEventListener("click", () => void this.load());
    void this.load();
  }

  update(filters: Filters): void {
    this.filters = { ...filters };
    this.render();
  }

  async load(force = false): Promise<void> {
    if (this.loading) return this.loading;
    if (!force && this.data && Date.now() - this.lastCheckedAt < 60_000) return;
    this.loading = (async () => {
      const response = await fetch(dataUrl("rankings.json"), { cache: "no-cache", signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error("Peringkat belum tersedia.");
      const value: unknown = await response.json();
      validateRankingSnapshot(value);
      this.lastCheckedAt = Date.now();
      this.data = value;
      this.render();
    })().catch((error) => {
      console.error("Peringkat", error);
      if (this.data) return;
      for (const node of [this.fireNode, this.airNode]) node.replaceChildren(element("p", "empty-state", "Data peringkat belum tersedia."));
    }).finally(() => { this.loading = null; });
    return this.loading;
  }

  private render(): void {
    if (!this.data) return;
    const key = rankingKey(this.filters);
    const fingerprint = `${this.data.generatedAt}:${key}`;
    if (this.renderedKey === fingerprint) return;
    this.renderedKey = fingerprint;
    const data = this.data;
    this.fireNode.replaceChildren();
    if (!data.firesUpdatedAt) this.fireNode.append(element("p", "empty-state", "Data deteksi belum tersedia."));
    else {
      const table = this.table(["Provinsi", "Deteksi", "Tinggi", "FRP maks. MW"]), body = element("tbody");
      for (const [index, row] of data.fires[key].entries()) {
        const tr = element("tr"), name = element("td"), button = element("button", "province-link", `${index + 1}. ${row.name}`); button.type = "button";
        button.addEventListener("click", () => this.getMap()?.focusBounds(row.bounds)); name.append(button);
        tr.append(name, element("td", "", numberFormat.format(row.count)), element("td", "", numberFormat.format(row.high)), element("td", "", row.maxFrp === null ? "–" : row.maxFrp.toLocaleString("id-ID", { maximumFractionDigits: 1 })));
        body.append(tr);
      }
      table.append(body); this.fireNode.append(table);
      this.fireNode.append(element("p", "source-detail", `NASA FIRMS · ${this.filters.hours === 24 ? "24 jam" : this.filters.hours === 72 ? "3 hari" : "7 hari"} · Indonesia · ${formatDate(data.generatedAt)}`));
    }
    this.airNode.replaceChildren();
    if (!data.air.length) { this.airNode.append(element("p", "empty-state", "Data udara belum tersedia.")); return; }
    const table = this.table(["Lokasi acuan provinsi", "PM2.5", "PM10"]), body = element("tbody");
    for (const [index, row] of data.air.entries()) {
      const tr = element("tr"), name = element("td"), button = element("button", "province-link", `${index + 1}. ${row.name}`); button.type = "button";
      button.title = `${row.latitude.toFixed(3)}, ${row.longitude.toFixed(3)} · ${formatDate(row.time)}`;
      button.addEventListener("click", () => this.getMap()?.focusLocation(row.longitude, row.latitude)); name.append(button);
      tr.append(name, element("td", "", row.pm25 === null ? "–" : row.pm25.toLocaleString("id-ID", { maximumFractionDigits: 1 })), element("td", "", row.pm10 === null ? "–" : row.pm10.toLocaleString("id-ID", { maximumFractionDigits: 1 }))); body.append(tr);
    }
    table.append(body); this.airNode.append(table, element("p", "source-detail", `µg/m³ · Model CAMS · ${formatDate(data.air[0]?.time)}`));
  }

  private table(headings: string[]): HTMLTableElement {
    const table = element("table", "ranking-table"), head = element("thead"), tr = element("tr");
    for (const heading of headings) { const th = element("th", "", heading); th.scope = "col"; tr.append(th); }
    head.append(tr); table.append(head); return table;
  }
}
