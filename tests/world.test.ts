import { expect, test } from "bun:test";
import { decodeWorld, toWorldPoints } from "../src/domain/world";
import type { Hotspot } from "../src/domain/types";

const base: Hotspot = { id: "a", latitude: 10.004, longitude: 20.004, observedAt: "2026-01-01T00:00:00Z", sensor: "VIIRS_SNPP_NRT", confidence: "n", frp: null, dayNight: null };

test("titik dunia dibulatkan 0,01°, duplikat antar satelit digabung, keyakinan rendah dibuang", () => {
  const points = toWorldPoints([base, { ...base, id: "b", sensor: "VIIRS_NOAA20_NRT", confidence: "h" }, { ...base, id: "c", latitude: 11, confidence: "l" }]);
  expect(points).toEqual([[20, 10, 1]]);
});

test("data dunia yang rusak ditolak", () => {
  expect(decodeWorld({ version: 1, generatedAt: "2026-01-01T00:00:00Z", points: [[1, 2, 0]] }).points).toHaveLength(1);
  expect(() => decodeWorld({ version: 1, generatedAt: "2026-01-01T00:00:00Z", points: [[200, 2, 0]] })).toThrow();
  expect(() => decodeWorld(null)).toThrow();
});
