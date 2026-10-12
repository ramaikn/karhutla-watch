import { resolve } from "node:path";
import { rename } from "node:fs/promises";
import { normalizeAir, validateProvinces } from "../src/domain/rankings";
import { request } from "./http";

export async function collectAir(root: string): Promise<void> {
  const provinces: unknown = await Bun.file(resolve(root, "public/data/provinces.json")).json();
  validateProvinces(provinces);
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.search = new URLSearchParams({ latitude: provinces.provinces.map((p) => p.latitude).join(","), longitude: provinces.provinces.map((p) => p.longitude).join(","), current: "pm2_5,pm10", domains: "cams_global", timezone: "GMT" }).toString();
  const payload = await (await request(url.href, "application/json")).json();
  const result = normalizeAir(payload, provinces.provinces, new Date().toISOString());
  const path = resolve(root, "public/data/air-quality.json");
  await Bun.write(`${path}.next`, JSON.stringify(result));
  await rename(`${path}.next`, path);
  console.log(`Udara: ${result.readings.length} lokasi acuan provinsi diperbarui.`);
}
if (import.meta.main) await collectAir(resolve(import.meta.dir, ".."));
