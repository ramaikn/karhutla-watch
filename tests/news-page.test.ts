import { expect, test } from "bun:test";
import { newsPage } from "../src/domain/news-page";
import type { Article } from "../src/domain/types";

test("pagination membatasi 20 berita dan pencarian tetap mencakup seluruh hasil", () => {
  const articles: Article[] = Array.from({ length: 45 }, (_, i) => ({ id: String(i), title: `Berita ${i}`, domain: "media.id", url: `https://media.id/${i}`, language: "id", indexedAt: new Date(2026, 0, 1, 0, i).toISOString() }));
  expect(newsPage(articles, "").articles).toHaveLength(20);
  expect(newsPage(articles, "", 99)).toMatchObject({ page: 3, pages: 3, total: 45 });
  expect(newsPage(articles, "", 3).articles).toHaveLength(5);
  expect(newsPage(articles, "Berita 0").articles[0].id).toBe("0");
  expect(newsPage(articles, "tidak cocok", 9)).toMatchObject({ page: 1, pages: 1, articles: [] });
  expect(newsPage(articles, "").articles[0].id).toBe("44");
});
