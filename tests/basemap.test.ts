import { expect, test } from "bun:test";
import { basemapPaint, basemapStyle, satelliteSource } from "../src/ui/basemap";
import { layout } from "../src/ui/layout";

test("peta awal tetap gelap dan tidak mengunduh citra satelit", () => {
  const style = basemapStyle();
  expect(Object.keys(style.sources)).toEqual(["osm"]);
  expect(style.layers.find((layer) => layer.id === "base")).toMatchObject({ paint: basemapPaint("dark") });
  expect(basemapPaint("dark")).toMatchObject({ "raster-saturation": -1, "raster-brightness-min": 0.85, "raster-brightness-max": 0.08 });
});

test("mode berwarna dan awan mengembalikan warna asli peta dasar", () => {
  expect(basemapPaint("natural")).toEqual(basemapPaint("clouds"));
  expect(basemapPaint("natural")).toMatchObject({ "raster-saturation": 0, "raster-brightness-min": 0, "raster-brightness-max": 1 });
});

test("citra memakai kemarin UTC, urutan tile WMTS, dan resolusi sumber yang benar", () => {
  const source = satelliteSource(new Date("2026-01-01T01:00:00+08:00"));
  expect(source.tiles?.[0]).toContain("/2025-12-30/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg");
  expect(source).toMatchObject({ type: "raster", tileSize: 256, maxzoom: 9 });
  expect(source.attribution).toContain("2025-12-30 UTC");
  expect(satelliteSource(new Date("2024-03-01T12:00:00Z")).tiles?.[0]).toContain("/2024-02-29/");
});

test("tiga ikon mode memiliki nama aksesibel dan hanya gelap yang aktif", () => {
  for (const mode of ["dark", "natural", "clouds"]) expect(layout).toContain(`id="map-${mode}"`);
  expect(layout).toMatch(/id="map-dark"[^>]+aria-pressed="true"/);
  expect(layout).toMatch(/id="map-natural"[^>]+aria-pressed="false"/);
  expect(layout).toMatch(/id="map-clouds"[^>]+aria-pressed="false"/);
  expect(layout).toContain("bukan peta asap");
});
