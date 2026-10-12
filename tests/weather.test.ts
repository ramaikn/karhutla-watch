import { expect, test } from "bun:test";
import { buildLocations, searchLocations } from "../src/domain/locations";
import { WeatherClient } from "../src/domain/weather-client";

const now = Date.parse("2026-10-13T00:00:00Z");
const payload = (code: string) => ({ lokasi: { adm4: code, desa: "Pilihan", kotkab: "Kota Uji", lat: -6, lon: 106 }, data: [{ cuaca: [[{ utc_datetime: "2026-10-13 03:00:00", t: 28, weather_desc: "Berawan" }]] }] });

test("indeks nasional memuat 38 provinsi dan pencarian membedakan nama lokasi sama", async () => {
  const raw = await Bun.file("public/data/locations.json").json();
  expect(raw.rows.filter(([code]: [string, string]) => code.length === 2)).toHaveLength(38);
  const locations = buildLocations(raw);
  expect(locations.length).toBeGreaterThan(80_000);
  expect(searchLocations(locations, "Kemayoran Jakarta").matches.some((location) => location.code === "31.71.03.1001")).toBe(true);
  expect(searchLocations(locations, "Sorong Papua Barat Daya").total).toBeGreaterThan(0);
  expect(searchLocations(locations, "Papua").matches).toHaveLength(30);
  expect(searchLocations(locations, "31.71.03.1001").matches[0].code).toBe("31.71.03.1001");
  expect(searchLocations(locations, "x").total).toBe(0);
  expect(() => buildLocations({ rows: [] })).toThrow();
});

test("prakiraan dimuat sesuai pilihan, cache dipakai, kode salah dan lokasi tidak cocok ditolak", async () => {
  let time = now, calls = 0;
  const client = new WeatherClient((async (url) => {
    calls++;
    const code = new URL(String(url)).searchParams.get("adm4")!;
    return new Response(JSON.stringify(payload(code === "31.71.03.1002" ? "31.71.03.1001" : code)));
  }), () => time);
  const signal = new AbortController().signal;
  expect((await client.get("31.71.03.1001", signal)).code).toBe("31.71.03.1001");
  await client.get("31.71.03.1001", signal);
  expect(calls).toBe(1);
  await expect(client.get("31.71.03.1002", signal)).rejects.toThrow();
  time += 1_200;
  await expect(client.get("31.71.03.1002", signal)).rejects.toThrow("tidak cocok");
  await expect(client.get("invalid", signal)).rejects.toThrow();
  const aborted = new AbortController(); aborted.abort();
  await expect(client.get("31.71.03.1001", aborted.signal)).rejects.toThrow();
});

test("429 menunda permintaan berikutnya tanpa mengubah prakiraan menjadi data palsu", async () => {
  let calls = 0;
  const client = new WeatherClient(async () => { calls++; return new Response("Limit", { status: 429, headers: { "Retry-After": "120" } }); }, () => now);
  const signal = new AbortController().signal;
  await expect(client.get("31.71.03.1001", signal)).rejects.toThrow();
  await expect(client.get("31.71.03.1002", signal)).rejects.toThrow();
  expect(calls).toBe(1);
});
