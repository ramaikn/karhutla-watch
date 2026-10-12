import { buildLocations, searchLocations, type SearchLocation } from "../domain/locations";
import { WeatherClient } from "../domain/weather-client";
import type { WeatherLocation } from "../domain/types";
import { element } from "./dom";
import { renderWeather } from "./panels";

export class WeatherSearch {
  private readonly client = new WeatherClient();
  private readonly input = document.getElementById("weather-search") as HTMLInputElement;
  private readonly results = document.getElementById("weather-results")!;
  private readonly content = document.getElementById("weather-content")!;
  private readonly selected = document.getElementById("weather-selected")!;
  private locations: SearchLocation[] | null = null;
  private indexPromise: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private request: AbortController | null = null;
  private selection = 0;

  constructor() {
    this.input.addEventListener("input", () => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => void this.search(), 160);
    });
    document.querySelector('[data-panel="weather"]')!.addEventListener("click", () => { void this.loadIndex().catch(() => {}); });
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); this.results.querySelector<HTMLButtonElement>("button")?.focus(); }
      if (event.key === "Escape") this.results.replaceChildren();
    });
    this.results.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const buttons = [...this.results.querySelectorAll<HTMLButtonElement>("button")];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = index + (event.key === "ArrowDown" ? 1 : -1);
      if (next < 0) this.input.focus(); else buttons[Math.min(next, buttons.length - 1)]?.focus();
    });
  }

  seed(locations: WeatherLocation[]): void { this.client.seed(locations); }

  private loadIndex(): Promise<void> {
    if (this.locations) return Promise.resolve();
    if (this.indexPromise) return this.indexPromise;
    this.indexPromise = (async () => {
      const response = await fetch(`${import.meta.env.BASE_URL}data/locations.json`, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error("Daftar lokasi belum dapat dimuat.");
      this.locations = buildLocations(await response.json());
    })().finally(() => { this.indexPromise = null; });
    return this.indexPromise;
  }

  private async search(): Promise<void> {
    const query = this.input.value.trim();
    this.results.replaceChildren();
    if (query.length < 2) return;
    try {
      this.results.append(element("p", "source-detail", "Mencari lokasi…"));
      await this.loadIndex();
      if (this.input.value.trim() !== query) return;
      const { matches, total } = searchLocations(this.locations!, query);
      this.results.replaceChildren();
      if (!matches.length) this.results.append(element("p", "empty-state", "Lokasi tidak ditemukan."));
      for (const location of matches) {
        const button = element("button", "location-result"); button.type = "button";
        button.append(element("strong", "", location.name), element("span", "", location.context));
        button.addEventListener("click", () => void this.choose(location));
        this.results.append(button);
      }
      if (total > matches.length) this.results.append(element("p", "source-detail", `${total.toLocaleString("id-ID")} lokasi cocok. Tambahkan nama kecamatan atau kabupaten.`));
    } catch {
      if (this.input.value.trim() !== query) return;
      this.results.replaceChildren(element("p", "empty-state", "Daftar lokasi belum dapat dimuat. Coba cari kembali."));
    }
  }

  private async choose(location: SearchLocation): Promise<void> {
    const selection = ++this.selection;
    this.request?.abort();
    const controller = new AbortController(); this.request = controller;
    clearTimeout(this.timer);
    this.results.replaceChildren(); this.input.value = location.name;
    this.selected.replaceChildren(element("strong", "", location.name), element("span", "", location.context));
    this.content.replaceChildren(element("p", "empty-state", "Memuat prakiraan…"));
    this.input.focus();
    try {
      const forecast = await this.client.get(location.code, controller.signal);
      if (selection === this.selection) renderWeather(this.content, forecast);
    } catch (error) {
      if (selection !== this.selection || controller.signal.aborted) return;
      console.error("Prakiraan BMKG", error);
      this.content.replaceChildren(element("p", "empty-state", "Prakiraan belum tersedia untuk lokasi ini. Coba lagi sebentar atau pilih lokasi lain."));
    }
  }
}
