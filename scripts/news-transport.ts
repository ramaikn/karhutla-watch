import { resolve } from "node:path";
import { mkdir, rename } from "node:fs/promises";
import { XMLValidator } from "fast-xml-parser";

const cacheAge = 25 * 60_000;
const spacing = 1_500;
interface CacheEntry { xml: string; savedAt: number; etag?: string; modified?: string }
interface TransportState { entries: Record<string, CacheEntry>; blockedUntil: number; lastRequestAt: number }

export function retryAfterMs(value: string | null, now: number): number {
  const seconds = value?.trim() && /^\d+$/.test(value.trim()) ? Number(value) * 1_000 : NaN;
  const date = value ? Date.parse(value) - now : NaN;
  return Math.max(60_000, Number.isFinite(seconds) ? seconds : Number.isFinite(date) ? date : 30 * 60_000);
}

// Cache collector lokal; tidak mengganti identitas atau melewati blokir sumber.
export class NewsTransport {
  private state: TransportState = { entries: {}, blockedUntil: 0, lastRequestAt: 0 };
  private readonly file: string;

  constructor(
    directory = resolve(import.meta.dir, "../.runtime"),
    private readonly requester: typeof fetch = fetch,
    private readonly clock: () => number = Date.now,
    private readonly pause: (ms: number) => Promise<unknown> = (ms) => Bun.sleep(ms),
  ) { this.file = resolve(directory, "news-cache.json"); }

  async initialize(): Promise<void> {
    try {
      const value = await Bun.file(this.file).json() as TransportState;
      if (value.entries && Number.isFinite(value.blockedUntil) && Number.isFinite(value.lastRequestAt)) this.state = value;
    } catch { /* Cache belum ada atau rusak; ambil ulang dari sumber. */ }
  }

  async load(url: string): Promise<Response> {
    const cached = this.state.entries[url], now = this.clock();
    if (cached && now - cached.savedAt < cacheAge) return new Response(cached.xml);
    if (this.state.blockedUntil > now) throw new Error("Pengambilan berita ditunda sesuai batas sumber.");
    const wait = this.state.lastRequestAt + spacing - now;
    if (wait > 0) await this.pause(wait);
    this.state.lastRequestAt = this.clock();
    const headers = new Headers({ Accept: "application/rss+xml", "User-Agent": "KarhutlaWatch/0.1 (RSS metadata collector)" });
    if (cached?.etag) headers.set("If-None-Match", cached.etag);
    if (cached?.modified) headers.set("If-Modified-Since", cached.modified);
    let response: Response;
    try { response = await this.requester(url, { headers, signal: AbortSignal.timeout(15_000) }); }
    catch { this.state.blockedUntil = this.clock() + 60_000; throw new Error("Koneksi berita gagal; pengambilan dijeda."); }
    if (response.status === 304 && cached) { cached.savedAt = this.clock(); return new Response(cached.xml); }
    if (!response.ok) {
      if ([403, 429, 503].includes(response.status)) this.state.blockedUntil = this.clock() + retryAfterMs(response.headers.get("Retry-After"), this.clock());
      throw new Error(`Sumber berita HTTP ${response.status}.`);
    }
    const xml = await response.text();
    if (xml.length > 5_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || !/<rss[\s>]/i.test(xml) || XMLValidator.validate(xml) !== true) {
      this.state.blockedUntil = this.clock() + 60_000;
      throw new Error("Respons RSS tidak valid; pengambilan dijeda.");
    }
    this.state.entries[url] = { xml, savedAt: this.clock(), etag: response.headers.get("ETag") ?? undefined, modified: response.headers.get("Last-Modified") ?? undefined };
    return new Response(xml);
  }

  async save(): Promise<void> {
    for (const [url, entry] of Object.entries(this.state.entries)) if (Date.now() - entry.savedAt > 7 * 86_400_000) delete this.state.entries[url];
    await mkdir(resolve(this.file, ".."), { recursive: true });
    await Bun.write(`${this.file}.next`, JSON.stringify(this.state));
    await rename(`${this.file}.next`, this.file);
  }
}
