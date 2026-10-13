import { dataUrl } from "../domain/data-url";
import type { NewsSnapshot } from "../domain/ranking-snapshot";
import type { Article } from "../domain/types";
import { renderNews } from "./panels";
import { element } from "./dom";

export class NewsPanel {
  private articles: Article[] = [];
  private generatedAt = "";
  private loading: Promise<void> | null = null;
  private renderedKey = "";
  private page = 1;
  private readonly pagination = element("nav", "news-pagination");
  private readonly previous = element("button", "", "Sebelumnya");
  private readonly next = element("button", "", "Berikutnya");
  private readonly pageLabel = element("span", "");
  private readonly node = document.getElementById("news-list")!;
  private readonly search = document.getElementById("news-search") as HTMLInputElement;

  constructor() {
    this.pagination.setAttribute("aria-label", "Halaman berita");
    this.pageLabel.setAttribute("aria-live", "polite");
    this.previous.type = this.next.type = "button";
    this.pagination.append(this.previous, this.pageLabel, this.next);
    this.node.after(this.pagination);
    this.previous.addEventListener("click", () => this.changePage(this.page - 1));
    this.next.addEventListener("click", () => this.changePage(this.page + 1));
    this.search.addEventListener("input", () => { this.page = 1; this.render(); this.resetScroll(); });
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

  private resetScroll(): void {
    const scroll = this.node.closest<HTMLElement>(".news-scroll")!;
    if (getComputedStyle(scroll).overflowY === "visible") document.getElementById("berita")!.scrollIntoView({ block: "start" });
    else scroll.scrollTop = 0;
  }

  private changePage(page: number): void {
    this.page = page;
    this.render();
    this.resetScroll();
  }

  private render(): void {
    const key = `${this.generatedAt}:${this.search.value}:${this.page}`;
    if (key === this.renderedKey) return;
    this.renderedKey = key;
    const result = renderNews(this.node, this.articles, this.search.value, this.page);
    this.page = result.page;
    this.renderedKey = `${this.generatedAt}:${this.search.value}:${this.page}`;
    this.pagination.hidden = result.pages <= 1;
    this.pageLabel.textContent = `${result.page} / ${result.pages}`;
    this.previous.disabled = result.page === 1;
    this.next.disabled = result.page === result.pages;
  }
}
