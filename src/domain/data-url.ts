// Berkas ringan mengikuti lokasi snapshot utama, termasuk hosting data terpisah.
export function dataUrl(file: string): string {
  const local = `${import.meta.env.BASE_URL}data/${file}`;
  if (file === "latest.json") return import.meta.env.VITE_DATA_URL || local;
  return import.meta.env.VITE_DATA_URL ? new URL(file, import.meta.env.VITE_DATA_URL).href : local;
}
