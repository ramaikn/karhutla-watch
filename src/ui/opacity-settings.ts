// Tiga tingkat transparansi (persen opasitas) untuk komponen antarmuka; 100 = tampilan asli.
// Indikator deteksi di peta tidak termasuk: itu diatur tombol mata.
export const OPACITY_LEVELS = [100, 55, 20] as const;
export type OpacityLevel = (typeof OPACITY_LEVELS)[number];
export const LEVEL_NAMES: Record<OpacityLevel, string> = { 100: "normal", 55: "samar", 20: "sangat samar" };
export const STORAGE_KEY = "karhutla-watch:opacity";

export function nextLevel(current: OpacityLevel): OpacityLevel {
  return OPACITY_LEVELS[(OPACITY_LEVELS.indexOf(current) + 1) % OPACITY_LEVELS.length];
}

// Data tersimpan dianggap tidak tepercaya: nilai di luar tiga tingkat jatuh ke normal.
export function parseLevel(value: unknown): OpacityLevel {
  return OPACITY_LEVELS.find((level) => level === value) ?? 100;
}

export function loadLevel(storage: Pick<Storage, "getItem"> | undefined): OpacityLevel {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return parseLevel(text ? JSON.parse(text) : null);
  } catch {
    return 100;
  }
}

export function saveLevel(storage: Pick<Storage, "setItem"> | undefined, level: OpacityLevel): void {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(level)); } catch { /* penyimpanan dinonaktifkan; berlaku sesi ini saja */ }
}
