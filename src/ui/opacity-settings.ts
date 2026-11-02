// Tingkat opasitas (persen) tiap komponen peta. 100 = tampilan asli.
export const OPACITY_COMPONENTS = [
  { id: "toolbar", label: "Bilah atas" },
  { id: "summary", label: "Kartu deteksi" },
  { id: "controls", label: "Tombol peta" },
  { id: "legend", label: "Legenda" },
  { id: "detail", label: "Panel detail" },
  { id: "news", label: "Panel berita" },
  { id: "layer", label: "Heatmap dan titik" },
] as const;

export type OpacityId = (typeof OPACITY_COMPONENTS)[number]["id"];
export type OpacitySettings = Record<OpacityId, number>;

// Batas bawah menjaga komponen tetap dapat ditemukan di peta.
export const MIN_OPACITY = 10;
export const STORAGE_KEY = "karhutla-watch:opacity";

export function defaultOpacity(): OpacitySettings {
  return Object.fromEntries(OPACITY_COMPONENTS.map((item) => [item.id, 100])) as OpacitySettings;
}

export function clampOpacity(value: unknown): number {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(number) ? Math.min(100, Math.max(MIN_OPACITY, Math.round(number))) : 100;
}

// Data tersimpan dianggap tidak tepercaya: nilai rusak jatuh ke 100.
export function normalizeOpacity(raw: unknown): OpacitySettings {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const result = defaultOpacity();
  for (const { id } of OPACITY_COMPONENTS) result[id] = clampOpacity(source[id]);
  return result;
}

export function loadOpacity(storage: Pick<Storage, "getItem"> | undefined): OpacitySettings {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return normalizeOpacity(text ? JSON.parse(text) : null);
  } catch {
    return defaultOpacity();
  }
}

export function saveOpacity(storage: Pick<Storage, "setItem"> | undefined, settings: OpacitySettings): void {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* penyimpanan dinonaktifkan; pengaturan berlaku sesi ini saja */ }
}
