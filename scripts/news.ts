import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { Article } from "../src/domain/types";
import { safeUrl } from "../src/domain/filters";
import { NEWS_FEEDS, NEWS_LIMIT_PER_FEED, NEWS_PUBLISHERS, type NewsFeed } from "../config/news-sources";
import { NewsTransport } from "./news-transport";

const relevant = /(karhutla|kebakaran\s+(hutan|lahan|gambut)|forest fire|peat fire)/i;
const belongsTo = (hostname: string, domain: string) => hostname === domain || hostname.endsWith(`.${domain}`);
const dateOf = (article: Article) => article.publishedAt ?? article.indexedAt;

export function normalizeRss(xml: string, checkedAt: string, feed: NewsFeed): Article[] {
  if (xml.length > 5_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("RSS tidak valid.");
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, processEntities: true });
  const root = parser.parse(xml) as { rss?: { channel?: { item?: Record<string, unknown>[] | Record<string, unknown> } } };
  if (!root.rss?.channel) throw new Error("RSS tidak memiliki channel berita.");
  const raw = root.rss.channel.item;
  const items = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  const unique = new Map<string, Article>();
  const now = Date.parse(checkedAt), cutoff = now - 7 * 86_400_000;
  for (const item of items) {
    const url = safeUrl(item.link), title = typeof item.title === "string" ? item.title.trim() : "";
    if (!url || !title || !relevant.test(title)) continue;
    const hostname = new URL(url).hostname;
    const source = item.source as Record<string, unknown> | undefined;
    const sourceUrl = safeUrl(source?.["@_url"]);
    if (hostname !== "news.google.com" || !sourceUrl) continue;
    const domain = new URL(sourceUrl).hostname;
    if (!feed.domains.some((allowed) => belongsTo(domain, allowed))) continue;
    const sourceName = typeof source?.["#text"] === "string" ? source["#text"].trim() : "";
    const suffix = ` - ${sourceName}`;
    const cleanTitle = sourceName && title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
    const date = typeof item.pubDate === "string" ? Date.parse(item.pubDate) : NaN;
    if (!Number.isFinite(date) || date < cutoff || date > now) continue;
    unique.set(url, { id: url, title: cleanTitle, url, domain, language: "Indonesian", indexedAt: checkedAt, publishedAt: new Date(date).toISOString(), provider: "Google News RSS" });
  }
  return [...unique.values()].sort((a, b) => Date.parse(dateOf(b)) - Date.parse(dateOf(a))).slice(0, NEWS_LIMIT_PER_FEED);
}

export function mergeNews(previous: Article[], incoming: Article[], checkedAt: string): Article[] {
  const now = Date.parse(checkedAt), cutoff = now - 7 * 86_400_000;
  const byUrl = new Map<string, Article>();
  for (const article of [...previous, ...incoming]) {
    const date = Date.parse(dateOf(article)), url = safeUrl(article.url);
    if (!url || !Number.isFinite(date) || date < cutoff || date > now) continue;
    const canonical = new URL(url);
    for (const key of [...canonical.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) canonical.searchParams.delete(key);
    canonical.hash = "";
    byUrl.set(canonical.href, article);
  }
  const unique = new Map<string, Article>();
  for (const article of [...byUrl.values()].sort((a, b) => Date.parse(dateOf(b)) - Date.parse(dateOf(a)))) {
    const publisher = NEWS_PUBLISHERS.find((entry) => belongsTo(article.domain, entry.domain));
    const title = article.title.toLocaleLowerCase("id").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const identity = `${publisher?.name ?? article.domain}:${title}`;
    if (!unique.has(identity)) unique.set(identity, article);
  }
  return [...unique.values()].sort((a, b) => Date.parse(dateOf(b)) - Date.parse(dateOf(a))).slice(0, NEWS_FEEDS.length * NEWS_LIMIT_PER_FEED);
}

export interface NewsResult { articles: Article[]; successes: string[]; failures: string[] }
type NewsLoader = (url: string, accept: string) => Promise<Response>;

export async function fetchNews(checkedAt: string, previous: Article[], loader?: NewsLoader): Promise<NewsResult> {
  const transport = loader ? null : new NewsTransport();
  await transport?.initialize();
  const load: NewsLoader = loader ?? ((url) => transport!.load(url));
  const successes: string[] = [], failures: string[] = [], incoming: Article[] = [];
  // Awal urutan berganti tiap jadwal agar tidak selalu mendahulukan media yang sama.
  const offset = Math.floor(Date.parse(checkedAt) / (30 * 60_000)) % NEWS_FEEDS.length;
  const ordered = [...NEWS_FEEDS.slice(offset), ...NEWS_FEEDS.slice(0, offset)];
  try {
    for (const feed of ordered) {
      try {
        const response = await load(feed.url, "application/rss+xml");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        incoming.push(...normalizeRss(await response.text(), checkedAt, feed)); successes.push(feed.name);
      } catch { failures.push(feed.name); }
    }
  } finally { await transport?.save(); }
  if (!successes.length) throw new Error("Semua sumber berita gagal diakses atau tidak valid.");
  const retained = previous.filter((article) => article.provider === "Google News RSS");
  return { articles: mergeNews(retained, incoming, checkedAt), successes: successes.sort(), failures: failures.sort() };
}
