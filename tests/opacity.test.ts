import { expect, test } from "bun:test";
import { STORAGE_KEY, loadLevel, nextLevel, parseLevel, saveLevel } from "../src/ui/opacity-settings";
import { layout } from "../src/ui/layout";

test("tingkat transparansi berputar tiga kali dan nilai rusak jatuh ke normal", () => {
  expect(nextLevel(100)).toBe(55);
  expect(nextLevel(55)).toBe(20);
  expect(nextLevel(20)).toBe(100);
  expect(parseLevel(37)).toBe(100);
  expect(parseLevel("x")).toBe(100);
});

test("penyimpanan gagal atau berisi JSON rusak tidak merusak aplikasi", () => {
  expect(loadLevel({ getItem: () => "{rusak" })).toBe(100);
  expect(loadLevel(undefined)).toBe(100);
  const values = new Map<string, string>();
  saveLevel({ setItem: (key, value) => void values.set(key, value) }, 55);
  expect(loadLevel({ getItem: (key) => values.get(key) ?? null })).toBe(55);
  expect(values.has(STORAGE_KEY)).toBe(true);
  expect(() => saveLevel({ setItem: () => { throw new Error("penuh"); } }, 20)).not.toThrow();
});

test("tata letak memuat layar penuh, tombol transparansi tanpa panel, heatmap bawaan, dan tanpa teks kepadatan", () => {
  expect(layout).toContain('id="toggle-fullscreen"');
  expect(layout).toContain('id="toggle-opacity"');
  expect(layout).not.toContain('id="opacity-panel"');
  expect(layout).toMatch(/id="view-heatmap"[^>]+aria-pressed="true"/);
  expect(layout).not.toContain("bukan luas terbakar");
});
