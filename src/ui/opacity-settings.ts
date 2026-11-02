// Satu tingkat opasitas (persen) untuk semua komponen peta. 100 = tampilan asli.
// Batas bawah menjaga komponen tetap dapat ditemukan di peta.
export const MIN_OPACITY = 10;
export const STORAGE_KEY = "karhutla-watch:opacity";

export function clampOpacity(value: unknown): number {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(number) ? Math.min(100, Math.max(MIN_OPACITY, Math.round(number))) : 100;
}

// Data tersimpan dianggap tidak tepercaya: nilai rusak jatuh ke 100.
export function loadOpacity(storage: Pick<Storage, "getItem"> | undefined): number {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return clampOpacity(text ? Number(JSON.parse(text)) : null);
  } catch {
    return 100;
  }
}

export function saveOpacity(storage: Pick<Storage, "setItem"> | undefined, percent: number): void {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(percent)); } catch { /* penyimpanan dinonaktifkan; berlaku sesi ini saja */ }
}
