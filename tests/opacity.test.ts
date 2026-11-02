import { expect, test } from "bun:test";
import { MIN_OPACITY, STORAGE_KEY, clampOpacity, loadOpacity, saveOpacity } from "../src/ui/opacity-settings";
import { layout } from "../src/ui/layout";

test("nilai transparansi rusak atau di luar batas dipulihkan", () => {
  expect(clampOpacity(3)).toBe(MIN_OPACITY);
  expect(clampOpacity(500)).toBe(100);
  expect(clampOpacity(42.4)).toBe(42);
  expect(clampOpacity("x")).toBe(100);
});

test("penyimpanan gagal atau berisi JSON rusak tidak merusak aplikasi", () => {
  expect(loadOpacity({ getItem: () => "{rusak" })).toBe(100);
  expect(loadOpacity(undefined)).toBe(100);
  const values = new Map<string, string>();
  saveOpacity({ setItem: (key, value) => void values.set(key, value) }, 60);
  expect(loadOpacity({ getItem: (key) => values.get(key) ?? null })).toBe(60);
  expect(values.has(STORAGE_KEY)).toBe(true);
  expect(() => saveOpacity({ setItem: () => { throw new Error("penuh"); } }, 50)).not.toThrow();
});

test("tata letak memuat layar penuh, transparansi, heatmap bawaan, dan tanpa teks kepadatan", () => {
  expect(layout).toContain('id="toggle-fullscreen"');
  expect(layout).toContain('id="opacity-panel"');
  expect(layout).toMatch(/id="view-heatmap"[^>]+aria-pressed="true"/);
  expect(layout).not.toContain("bukan luas terbakar");
});
