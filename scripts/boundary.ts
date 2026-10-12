import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { Hotspot, Snapshot } from "../src/domain/types";
import { request } from "./http";

type Boundaries = FeatureCollection<Polygon | MultiPolygon>;
const metadataUrl = "https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM0/";

export async function loadBoundary(root: string): Promise<{ contains: (point: Hotspot) => boolean; attribution: NonNullable<Snapshot["boundary"]> }> {
  const directory = resolve(root, ".runtime");
  await mkdir(directory, { recursive: true });
  const geometryFile = Bun.file(resolve(directory, "indonesia.geojson"));
  const metadataFile = Bun.file(resolve(directory, "boundary.json"));
  let geometry: Boundaries;
  let metadata: Record<string, string>;
  if (await geometryFile.exists() && await metadataFile.exists()) {
    geometry = await geometryFile.json(); metadata = await metadataFile.json();
  } else {
    metadata = await (await request(metadataUrl, "application/json")).json() as Record<string, string>;
    const url = metadata.gjDownloadURL;
    if (!url || !url.startsWith("https://github.com/wmgeolab/geoBoundaries/")) throw new Error("Metadata batas Indonesia tidak valid.");
    // geoBoundaries menyimpan berkas besar lewat Git LFS. raw biasa dapat mengembalikan pointer, bukan geometri.
    const downloadUrl = url.replace("https://github.com/wmgeolab/geoBoundaries/raw/", "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/");
    geometry = await (await request(downloadUrl, "application/geo+json")).json() as Boundaries;
    if (geometry.type !== "FeatureCollection" || !geometry.features?.length) throw new Error("Geometri Indonesia tidak valid.");
    await Bun.write(geometryFile, JSON.stringify(geometry));
    await Bun.write(metadataFile, JSON.stringify(metadata));
  }
  if (geometry.type !== "FeatureCollection" || !geometry.features.length ||
    geometry.features.some((feature) => !feature.geometry || !["Polygon", "MultiPolygon"].includes(feature.geometry.type))) {
    throw new Error("Cache batas Indonesia tidak valid.");
  }
  const polygons = geometry.features.flatMap((feature) => feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates);
  const indexed = polygons.map((coordinates) => {
    const outer = coordinates[0];
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    for (const [longitude, latitude] of outer) {
      west = Math.min(west, longitude); south = Math.min(south, latitude);
      east = Math.max(east, longitude); north = Math.max(north, latitude);
    }
    return { polygon: { type: "Polygon" as const, coordinates }, west, south, east, north };
  });
  return {
    contains: (point) => indexed.some(({ polygon, west, south, east, north }) =>
      point.longitude >= west && point.longitude <= east && point.latitude >= south && point.latitude <= north &&
      booleanPointInPolygon([point.longitude, point.latitude], polygon)),
    attribution: { source: "geoBoundaries / OpenStreetMap", license: metadata.boundaryLicense, year: metadata.boundaryYearRepresented, url: metadataUrl },
  };
}
