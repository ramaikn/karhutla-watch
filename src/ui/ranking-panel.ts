import { rankAir, rankFires, validateProvinces, type AirSnapshot, type ProvinceIndex } from "../domain/rankings";
import type { Filters, Snapshot } from "../domain/types";
import { element, formatDate, numberFormat } from "./dom";
import type { HotspotMap } from "./map";

export class RankingPanel {
  private provinces: ProvinceIndex | null = null;
  private air: AirSnapshot | null = null;
  private assignments = new Map<string, string>();
  private assignedAt: string | null = null;
  private assigningAt: string | null = null;
  private worker: Worker | null = null;
  private loading: Promise<void> | null = null;
  private latest: { snapshot: Snapshot; filters: Filters } | null = null;
  private readonly fireNode = document.getElementById("fire-ranking")!;
  private readonly airNode = document.getElementById("air-ranking")!;

  constructor(private readonly getMap: () => HotspotMap | null) {
    document.querySelector('[data-panel="ranking"]')!.addEventListener("click", () => void this.load());
  }

  update(snapshot: Snapshot, filters: Filters): void {
    this.latest = { snapshot, filters: { ...filters } };
    if (this.provinces) this.render();
  }

  private async load(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const base = `${import.meta.env.BASE_URL}data/`;
      const [provinces, air] = await Promise.allSettled([
        this.provinces ? Promise.resolve(this.provinces) : fetch(`${base}provinces.json`, { signal: AbortSignal.timeout(20_000) }).then((r) => { if (!r.ok) throw new Error("Batas belum tersedia"); return r.json(); }),
        fetch(import.meta.env.VITE_AIR_DATA_URL || `${base}air-quality.json`, { cache: "no-cache", signal: AbortSignal.timeout(20_000) }).then((r) => { if (!r.ok) throw new Error("Udara belum tersedia"); return r.json(); }),
      ]);
      if (provinces.status === "fulfilled") { validateProvinces(provinces.value); this.provinces = provinces.value; }
      else this.fireNode.replaceChildren(element("p", "empty-state", "Data peringkat belum tersedia."));
      if (air.status === "fulfilled") {
        const value = air.value as AirSnapshot;
        if (value.version === 1 && Array.isArray(value.readings) && value.readings.every((r) => Number.isFinite(Date.parse(r.time)) && (r.pm25 === null || Number.isFinite(r.pm25) && r.pm25 >= 0) && (r.pm10 === null || Number.isFinite(r.pm10) && r.pm10 >= 0))) this.air = value;
      }
      this.render();
    })().catch((error) => { console.error("Peringkat", error); this.fireNode.replaceChildren(element("p", "empty-state", "Data peringkat belum tersedia.")); }).finally(() => { this.loading = null; });
    return this.loading;
  }

  private render(): void {
    if (this.provinces && this.latest) {
      const { snapshot, filters } = this.latest;
      if (this.assignedAt !== snapshot.generatedAt && this.assigningAt !== snapshot.generatedAt) {
        this.worker?.terminate();
        const generatedAt = snapshot.generatedAt;
        this.assigningAt = generatedAt;
        this.fireNode.replaceChildren(element("p", "empty-state", "Memuat peringkat…"));
        const worker = new Worker(new URL("../domain/ranking-worker.ts", import.meta.url), { type: "module" });
        this.worker = worker;
        worker.onmessage = (event: MessageEvent<{ assignments?: [string, string][] }>) => {
          if (worker !== this.worker) return;
          worker.terminate(); this.worker = null; this.assigningAt = null;
          if (!event.data.assignments) { this.fireNode.replaceChildren(element("p", "empty-state", "Data peringkat belum tersedia.")); return; }
          this.assignments = new Map(event.data.assignments); this.assignedAt = generatedAt; this.render();
        };
        worker.onerror = () => { worker.terminate(); this.worker = null; this.assigningAt = null; this.fireNode.replaceChildren(element("p", "empty-state", "Data peringkat belum tersedia.")); };
        worker.postMessage({ points: snapshot.hotspots, provinces: this.provinces.provinces });
      }
      if (this.assignedAt === snapshot.generatedAt) {
      const { rows } = rankFires(snapshot.hotspots, filters, this.provinces.provinces, this.assignments);
      this.fireNode.replaceChildren();
      if (!snapshot.sources.firms.lastSuccessAt) this.fireNode.append(element("p", "empty-state", "Data deteksi belum tersedia."));
      else {
        const table = this.table(["Provinsi", "Deteksi", "Tinggi", "FRP maks. MW"]), body = element("tbody");
        for (const [index, row] of rows.entries()) {
          const tr = element("tr"), name = element("td"), button = element("button", "province-link", `${index + 1}. ${row.name}`); button.type = "button";
          button.addEventListener("click", () => this.getMap()?.focusBounds(row.bounds)); name.append(button);
          tr.append(name, element("td", "", numberFormat.format(row.count)), element("td", "", numberFormat.format(row.high)), element("td", "", row.maxFrp === null ? "–" : row.maxFrp.toLocaleString("id-ID", { maximumFractionDigits: 1 })));
          body.append(tr);
        }
        table.append(body); this.fireNode.append(table);
        this.fireNode.append(element("p", "source-detail", `NASA FIRMS · ${filters.hours === 24 ? "24 jam" : filters.hours === 72 ? "3 hari" : "7 hari"} · Indonesia · ${formatDate(snapshot.sources.firms.lastSuccessAt)}`));
      }
      }
    }
    this.airNode.replaceChildren();
    if (!this.air) { this.airNode.append(element("p", "empty-state", "Data udara belum tersedia.")); return; }
    const table = this.table(["Lokasi acuan provinsi", "PM2.5", "PM10"]), body = element("tbody");
    for (const [index, row] of rankAir(this.air.readings).entries()) {
      const tr = element("tr"), name = element("td"), button = element("button", "province-link", `${index + 1}. ${row.name}`); button.type = "button";
      button.title = `${row.latitude.toFixed(3)}, ${row.longitude.toFixed(3)} · ${formatDate(row.time)}`;
      button.addEventListener("click", () => this.getMap()?.focusLocation(row.longitude, row.latitude)); name.append(button);
      tr.append(name, element("td", "", row.pm25 === null ? "–" : row.pm25.toLocaleString("id-ID", { maximumFractionDigits: 1 })), element("td", "", row.pm10 === null ? "–" : row.pm10.toLocaleString("id-ID", { maximumFractionDigits: 1 }))); body.append(tr);
    }
    table.append(body); this.airNode.append(table, element("p", "source-detail", `µg/m³ · Model CAMS · ${formatDate(this.air.readings[0]?.time)}`));
  }

  private table(headings: string[]): HTMLTableElement {
    const table = element("table", "ranking-table"), head = element("thead"), tr = element("tr");
    for (const heading of headings) { const th = element("th", "", heading); th.scope = "col"; tr.append(th); }
    head.append(tr); table.append(head); return table;
  }
}
