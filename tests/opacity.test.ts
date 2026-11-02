import { expect, test } from "bun:test";
import { MIN_OPACITY, OPACITY_COMPONENTS, STORAGE_KEY, defaultOpacity, loadOpacity, normalizeOpacity, saveOpacity } from "../src/ui/opacity-settings";
import { layout } from "../src/ui/layout";

test("nilai transparansi rusak atau di luar batas dipulihkan", () => {
  const result = normalizeOpacity({ toolbar: 3, summary: 500, legend: "x", news: 42.4, unknown: 5 });
  expect(result).toMatchObject({ toolbar: MIN_OPACITY, summary: 100, legend: 100, news: 42, detail: 100, layer: 100 });
  expect(Object.keys(result)).toEqual(OPACITY_COMPONENTS.map((item) => item.id));
  expect(normalizeOpacity(null)).toEqual(defaultOpacity());
});

test("penyimpanan gagal atau berisi JSON rusak tidak merusak aplikasi", () => {
  expect(loadOpacity({ getItem: () => "{rusak" })).toEqual(defaultOpacity());
  expect(loadOpacity(undefined)).toEqual(defaultOpacity());
  const values = new Map<string, string>();
  saveOpacity({ setItem: (key, value) => void values.set(key, value) }, { ...defaultOpacity(), news: 60 });
  expect(loadOpacity({ getItem: (key) => values.get(key) ?? null }).news).toBe(60);
  expect(values.has(STORAGE_KEY)).toBe(true);
  expect(() => saveOpacity({ setItem: () => { throw new Error("penuh"); } }, defaultOpacity())).not.toThrow();
});

test("tata letak memuat layar penuh, transparansi, heatmap bawaan, dan tanpa teks kepadatan", () => {
  expect(layout).toContain('id="toggle-fullscreen"');
  expect(layout).toContain('id="opacity-panel"');
  expect(layout).toMatch(/id="view-heatmap"[^>]+aria-pressed="true"/);
  expect(layout).not.toContain("bukan luas terbakar");
});
