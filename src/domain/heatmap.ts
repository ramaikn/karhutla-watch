import type { FeatureCollection, Point } from "geojson";
import type { Hotspot } from "./types";

// Agregasi untuk render, bukan perubahan koordinat data atau perkiraan luas api.
export function heatmapGeojson(points: Hotspot[]): FeatureCollection<Point> {
  const cells = new Map<string, { longitude: number; latitude: number; count: number }>();
  for (const point of points) {
    const key = `${Math.floor(point.longitude / 0.02)}:${Math.floor(point.latitude / 0.02)}`;
    const cell = cells.get(key) ?? { longitude: 0, latitude: 0, count: 0 };
    cell.longitude += point.longitude; cell.latitude += point.latitude; cell.count++;
    cells.set(key, cell);
  }
  return {
    type: "FeatureCollection",
    features: [...cells.values()].map((cell) => ({ type: "Feature", geometry: { type: "Point", coordinates: [cell.longitude / cell.count, cell.latitude / cell.count] }, properties: { count: cell.count } })),
  };
}
