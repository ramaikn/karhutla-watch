import { dataUrl } from "../domain/data-url";
import type { NewsSnapshot } from "../domain/ranking-snapshot";
import type { Article } from "../domain/types";
import { renderNews } from "./panels";

export class NewsPanel {
  private articles: Article[] = [];
  private generatedAt = "";
  private loading: Promise<void> | null = null;
  private renderedKey = "";
  private readonly node = document.getElementById("news-list")!;
  private readonly search = document.getElementById("news-search") as HTMLInputElement;

  constructor() {
    this.search.addEventListener("input", () => this.render());
    void this.load();
  }

  seed(articles: Article[], generatedAt: string | null): void {
    // Snapshot peta dapat tiba sesudah snapshot berita yang lebih baru.
    if (!generatedAt || this.generatedAt && generatedAt <= this.generatedAt) return;
    this.generatedAt = generatedAt;
    this.articles = articles;
    this.render();
  }

  async load(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const response = await fetch(dataUrl("news.json"), { cache: "no-cache", signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error("Berita belum tersedia.");
      const value = await response.json() as NewsSnapshot;
      if (value?.version !== 1 || !Number.isFinite(Date.parse(value.generatedAt)) || !Array.isArray(value.articles) || value.articles.some((a) => typeof a.id !== "string" || typeof a.title !== "string" || typeof a.domain !== "string" || typeof a.url !== "string" || !Number.isFinite(Date.parse(a.indexedAt)))) throw new Error("Format berita tidak valid.");
      this.seed(value.articles, value.generatedAt);
    })().catch((error) => { console.error("Berita", error); }).finally(() => { this.loading = null; });
    return this.loading;
  }

  private render(): void {
    const key = `${this.generatedAt}:${this.search.value}`;
    if (key === this.renderedKey) return;
    this.renderedKey = key;
    renderNews(this.node, this.articles, this.search.value);
  }
}
