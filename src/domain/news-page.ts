import type { Article } from "./types";
import { safeUrl } from "./filters";

export function newsPage(articles: Article[], search: string, requestedPage = 1) {
  const query = search.trim().toLocaleLowerCase("id");
  const matches = articles.filter((article) => safeUrl(article.url) && `${article.title} ${article.domain}`.toLocaleLowerCase("id").includes(query))
    .sort((a, b) => Date.parse(b.publishedAt ?? b.indexedAt) - Date.parse(a.publishedAt ?? a.indexedAt));
  const pages = Math.max(1, Math.ceil(matches.length / 20));
  const page = Math.min(pages, Math.max(1, Math.trunc(requestedPage) || 1));
  return { articles: matches.slice((page - 1) * 20, page * 20), page, pages, total: matches.length };
}
