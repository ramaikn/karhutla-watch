import { expect, test } from "bun:test";
import { clusterPaint, densityPaint, observationPaint } from "../src/ui/detection-style";
import { nextVisibility, overlayOpacity } from "../src/ui/detection-controls";
import { layout } from "../src/ui/layout";

test("visibilitas berputar normal, samar, mati tanpa mengubah mode peta", () => {
  expect(nextVisibility("normal")).toBe("dim");
  expect(nextVisibility("dim")).toBe("off");
  expect(nextVisibility("off")).toBe("normal");
  expect(["normal", "dim", "off"].map((state) => overlayOpacity(state as "normal" | "dim" | "off"))).toEqual([1, 0.3, 0]);
  expect(layout).toContain('id="toggle-summary"');
  expect(layout).toContain('id="toggle-overlay"');
});

test("heatmap tetap tegas dengan radius terbatas dan titik asli terlihat pada semua zoom", () => {
  const paint = densityPaint()!;
  expect(paint["heatmap-radius"]).toEqual(["interpolate", ["linear"], ["zoom"], 2, 6, 5, 9, 8, 12, 11, 14]);
  expect(paint["heatmap-intensity"]).toBe(0.85);
  expect(paint["heatmap-weight"]).toEqual(["interpolate", ["linear"], ["get", "count"], 1, 0.7, 5, 1, 20, 1.4, 80, 2]);
  expect(paint["heatmap-opacity"]).toEqual(["interpolate", ["linear"], ["zoom"], 0, 0.85, 8, 0.85, 11, 0]);
  expect(observationPaint(1, true)?.["circle-opacity"]).toEqual(["interpolate", ["linear"], ["zoom"], 0, 0.8, 10, 0.95]);
});

test("kelompok berupa lingkaran kecil transparan dan mode samar berlaku ke semua layer", () => {
  expect(clusterPaint()?.["circle-radius"]).toEqual(["step", ["get", "point_count"], 8, 30, 10, 150, 12]);
  expect(clusterPaint()?.["circle-opacity"]).toBe(0.16);
  expect(clusterPaint(0.3)?.["circle-opacity"]).toBeCloseTo(0.048);
  expect(observationPaint(0.3)?.["circle-opacity"]).toBeCloseTo(0.255);
  expect(densityPaint(0)?.["heatmap-opacity"]).toEqual(["interpolate", ["linear"], ["zoom"], 0, 0, 8, 0, 11, 0]);
  expect(layout).toContain("Kepadatan deteksi, bukan luas terbakar");
});
