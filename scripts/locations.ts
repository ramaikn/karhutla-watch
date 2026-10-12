import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import type { LocationIndex } from "../src/domain/locations";

// Kode Kemendagri terbaru, bukan BPS; kecocokan layanan tetap diperiksa pada respons BMKG.
const revision = "d68e8d5516f969d1905d0b2940f20034becb0db7";
const source = `https://raw.githubusercontent.com/cahyadsn/wilayah/${revision}/db/wilayah.sql`;
const response = await fetch(source, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Daftar wilayah HTTP ${response.status}`);
const sql = await response.text();
const rows: [string, string][] = [];
const seen = new Set<string>();
for (const match of sql.matchAll(/\('([\d.]+)'\s*,\s*'((?:\\.|''|[^'])*)'\s*\)/g)) {
  const code = match[1], name = match[2].replace(/''/g, "'").replace(/\\'/g, "'").replace(/\\\\/g, "\\").trim();
  if (!/^(\d{2}|\d{2}\.\d{2}|\d{2}\.\d{2}\.\d{2}|\d{2}\.\d{2}\.\d{2}\.\d{4})$/.test(code) || !name || seen.has(code)) throw new Error(`Baris wilayah tidak valid: ${code}`);
  seen.add(code); rows.push([code, name]);
}
const villages = rows.filter(([code]) => code.length === 13);
if (villages.length < 80_000 || !seen.has("31.71.03.1001")) throw new Error("Daftar wilayah nasional tidak lengkap.");
for (const [code] of villages) if (![2, 5, 8].every((length) => seen.has(code.slice(0, length)))) throw new Error(`Induk wilayah tidak ditemukan: ${code}`);
const index: LocationIndex = { version: 1, source, reference: "Kepmendagri 300.2.2-2430 Tahun 2025", rows };
const directory = resolve(import.meta.dir, "../public/data");
await mkdir(directory, { recursive: true });
await Bun.write(resolve(directory, "locations.json"), JSON.stringify(index));
console.log(`Indeks nasional: ${villages.length} desa/kelurahan; ${rows.filter(([code]) => code.length === 2).length} provinsi; ${rows.length} wilayah.`);
