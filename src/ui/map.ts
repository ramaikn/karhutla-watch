import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { Hotspot } from "../domain/types";
import { REGIONS } from "../domain/filters";
import { element, formatDate } from "./dom";
import { heatmapGeojson } from "../domain/heatmap";
import { basemapPaint, basemapStyle, satelliteSource, type MapAppearance } from "./basemap";
import { clusterPaint, densityPaint, observationPaint } from "./detection-style";
import { overlayOpacity, type OverlayVisibility } from "./detection-controls";

maplibregl.setWorkerCount(2);

export class HotspotMap {
  private map: maplibregl.Map;
  private points: Hotspot[] = [];
  private ready = false;
  private popup: maplibregl.Popup | null = null;
  private region = "all";
  private mode: "points" | "heatmap" = "points";
  private appearance: MapAppearance = "dark";
  private overlayVisibility: OverlayVisibility = "normal";
  private newsVisible = true;

  constructor(container: HTMLElement, onError: (message: string) => void) {
    this.map = new maplibregl.Map({
      container,
      center: [118, -2], zoom: 3.6, minZoom: 0, maxZoom: 16,
      attributionControl: { compact: false },
      style: basemapStyle(),
    });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    this.map.on("resize", () => this.fit(this.region));
    this.map.on("error", (event) => {
      if ("sourceId" in event && event.sourceId === "satellite") {
        if (this.appearance === "clouds") onError("Citra awan satelit belum dapat dimuat. Peta dasar dan deteksi tetap tersedia.");
      } else onError("Sebagian peta gagal dimuat. Daftar deteksi tetap dapat digunakan.");
    });
    this.map.on("load", () => {
      this.ready = true;
      this.map.addSource("hotspots", { type: "geojson", data: this.geojson(), cluster: true, clusterRadius: 38, clusterMaxZoom: 8 });
      this.map.addSource("heatpoints", { type: "geojson", data: heatmapGeojson(this.points), maxzoom: 10 });
      this.map.addSource("observations", { type: "geojson", data: this.geojson(), maxzoom: 16 });
      this.map.addLayer({
        id: "heatmap", type: "heatmap", source: "heatpoints",
        layout: { visibility: "none" },
        paint: densityPaint(),
      });
      this.map.addLayer({ id: "clusters", type: "circle", source: "hotspots", filter: ["has", "point_count"], paint: clusterPaint() });
      this.map.addLayer({ id: "points", type: "circle", source: "hotspots", filter: ["!", ["has", "point_count"]], paint: observationPaint() });
      this.map.addLayer({ id: "heatmap-observations", type: "circle", source: "observations", layout: { visibility: "none" }, paint: observationPaint(1, true) });
      this.map.on("click", ["points", "heatmap-observations"], (event) => {
        const id = event.features?.[0]?.properties?.id;
        const point = this.points.find((item) => item.id === id);
        if (point) this.show(point);
      });
      this.map.on("click", "clusters", async (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        try {
          const zoom = await (this.map.getSource("hotspots") as GeoJSONSource).getClusterExpansionZoom(Number(feature.properties?.cluster_id));
          this.map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
        } catch { onError("Kelompok deteksi belum dapat dibuka."); }
      });
      for (const layer of ["points", "clusters", "heatmap-observations"]) {
        this.map.on("mouseenter", layer, () => { this.map.getCanvas().style.cursor = "pointer"; });
        this.map.on("mouseleave", layer, () => { this.map.getCanvas().style.cursor = ""; });
      }
      this.fit(this.region);
      this.setMode(this.mode);
      this.setOverlayVisibility(this.overlayVisibility);
      this.setAppearance(this.appearance);
    });
  }

  private geojson(): FeatureCollection<Point> {
    return { type: "FeatureCollection", features: this.points.map((point) => ({ type: "Feature", geometry: { type: "Point", coordinates: [point.longitude, point.latitude] }, properties: { id: point.id, confidence: point.confidence } })) };
  }

  update(points: Hotspot[]): void {
    this.points = points;
    this.popup?.remove();
    if (this.ready) {
      const data = this.geojson();
      (this.map.getSource("hotspots") as GeoJSONSource).setData(data);
      (this.map.getSource("heatpoints") as GeoJSONSource).setData(heatmapGeojson(points));
      (this.map.getSource("observations") as GeoJSONSource).setData(data);
    }
  }

  setMode(mode: "points" | "heatmap"): void {
    this.mode = mode;
    if (!this.ready) return;
    const visible = this.overlayVisibility !== "off";
    for (const id of ["clusters", "points"]) this.map.setLayoutProperty(id, "visibility", visible && mode === "points" ? "visible" : "none");
    for (const id of ["heatmap", "heatmap-observations"]) this.map.setLayoutProperty(id, "visibility", visible && mode === "heatmap" ? "visible" : "none");
  }

  setOverlayVisibility(visibility: OverlayVisibility): void {
    this.overlayVisibility = visibility;
    if (!this.ready) return;
    if (visibility === "off") this.popup?.remove();
    const opacity = overlayOpacity(visibility);
    const paints = { clusters: clusterPaint(opacity), points: observationPaint(opacity), heatmap: densityPaint(opacity), "heatmap-observations": observationPaint(opacity, true) };
    for (const [layer, paint] of Object.entries(paints)) {
      for (const [property, value] of Object.entries(paint!)) this.map.setPaintProperty(layer, property, value);
    }
    this.setMode(this.mode);
  }

  setAppearance(appearance: MapAppearance): void {
    this.appearance = appearance;
    if (!this.ready) return;
    for (const [property, value] of Object.entries(basemapPaint(appearance)!)) this.map.setPaintProperty("base", property, value);
    this.map.setPaintProperty("background", "background-color", appearance === "dark" ? "#101317" : "#aad3df");
    if (appearance === "clouds" && !this.map.getSource("satellite")) {
      this.map.addSource("satellite", satelliteSource());
      // Citra di atas peta dasar; deteksi tetap di atas awan dan dapat diklik.
      this.map.addLayer({ id: "satellite", type: "raster", source: "satellite", paint: { "raster-opacity": 0.9, "raster-fade-duration": 0 } }, "heatmap");
    }
    if (this.map.getLayer("satellite")) this.map.setLayoutProperty("satellite", "visibility", appearance === "clouds" ? "visible" : "none");
  }

  fit(region: string): void {
    this.region = region;
    const selected = REGIONS.find((item) => item.id === region) ?? REGIONS[0];
    const [west, south, east, north] = selected.bounds;
    const width = this.map.getContainer().clientWidth;
    const mobile = width <= 700;
    const right = !mobile && this.newsVisible ? (width <= 1000 ? 338 : 368) : 48;
    const toolbarBottom = Number.parseFloat(getComputedStyle(document.querySelector(".workspace")!).getPropertyValue("--toolbar-bottom")) || 64;
    this.map.fitBounds([[west, south], [east, north]], { padding: { top: Math.min(toolbarBottom + 64, this.map.getContainer().clientHeight * .5), left: 28, right, bottom: mobile ? 64 : 88 }, duration: 0 });
  }

  setNewsVisible(visible: boolean): void {
    this.newsVisible = visible;
    if (this.ready) this.fit(this.region);
  }

  focusBounds(bounds: [number, number, number, number]): void {
    const [west, south, east, north] = bounds;
    this.map.fitBounds([[west, south], [east, north]], { padding: { left: Math.min(420, this.map.getContainer().clientWidth / 3), right: this.newsVisible && this.map.getContainer().clientWidth > 700 ? 370 : 40, top: 120, bottom: 80 }, duration: 600 });
  }

  focusLocation(longitude: number, latitude: number): void { this.map.easeTo({ center: [longitude, latitude], zoom: 8 }); }

  show(point: Hotspot): void {
    const card = element("div", "popup-card");
    card.append(element("strong", "", "Deteksi titik panas"), element("p", "", formatDate(point.observedAt)),
      element("p", "", `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`),
      element("p", "", `VIIRS ${point.sensor.includes("NOAA20") ? "NOAA-20" : point.sensor.includes("NOAA21") ? "NOAA-21" : "S-NPP"}`),
      element("p", "", `Keyakinan: ${{ l: "rendah", n: "nominal", h: "tinggi" }[point.confidence]}`),
      element("p", "", `Daya radiasi: ${point.frp ?? "tidak tersedia"}${point.frp !== null ? " MW" : ""}`),
      element("small", "", "NASA FIRMS"));
    this.popup?.remove();
    this.popup = new maplibregl.Popup({ maxWidth: "290px" }).setLngLat([point.longitude, point.latitude]).setDOMContent(card).addTo(this.map);
    this.map.easeTo({ center: [point.longitude, point.latitude], zoom: Math.max(this.map.getZoom(), 9) });
  }
}
