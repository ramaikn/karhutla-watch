import type { RasterLayerSpecification, RasterSourceSpecification, StyleSpecification } from "maplibre-gl";

export type MapAppearance = "dark" | "natural" | "clouds";

export function basemapPaint(appearance: MapAppearance): RasterLayerSpecification["paint"] {
  return appearance === "dark"
    ? { "raster-saturation": -1, "raster-brightness-min": 0.85, "raster-brightness-max": 0.08, "raster-fade-duration": 0 }
    : { "raster-saturation": 0, "raster-brightness-min": 0, "raster-brightness-max": 1, "raster-fade-duration": 0 };
}

// Komposit harian kemarin UTC menghindari citra hari ini yang belum lengkap.
export function satelliteSource(now = new Date()): RasterSourceSpecification {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 86_400_000).toISOString().slice(0, 10);
  return {
    type: "raster",
    tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg`],
    tileSize: 256,
    maxzoom: 9,
    attribution: `<a href="https://www.earthdata.nasa.gov/engage/open-data-services-software/global-imagery-browse-services-gibs" target="_blank" rel="noopener">NASA GIBS / VIIRS NOAA-20 · ${date} UTC</a>`,
  };
}

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
        paint: basemapPaint("dark"),
      },
    ],
  };
}
