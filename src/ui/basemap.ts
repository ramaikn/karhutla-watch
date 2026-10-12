import type { StyleSpecification } from "maplibre-gl";

// OSM tanpa kunci. Pembalikan terang/gelap hanya pada raster, bukan titik panas.
export function basemapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#101317" } },
      {
        id: "base", type: "raster", source: "osm",
        paint: { "raster-saturation": -1, "raster-brightness-min": 0.85, "raster-brightness-max": 0.08, "raster-fade-duration": 0 },
      },
    ],
  };
}
