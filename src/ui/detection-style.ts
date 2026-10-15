import type { CircleLayerSpecification, ExpressionSpecification, HeatmapLayerSpecification } from "maplibre-gl";

// Warna tetap tegas; radius dibatasi agar kepadatan tidak menyerupai luas kebakaran.
export function densityPaint(opacity = 1): HeatmapLayerSpecification["paint"] {
  return {
    "heatmap-weight": ["interpolate", ["linear"], ["get", "count"], 1, 0.7, 5, 1, 20, 1.4, 80, 2],
    "heatmap-intensity": 0.85,
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 5, 9, 8, 12, 11, 14],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.85 * opacity, 8, 0.85 * opacity, 11, 0],
    "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(255,211,92,0)", 0.04, "rgba(255,211,92,0)", 0.15, "#ffd35c", 0.4, "#ff963b", 0.7, "#ef542e", 1, "#b92c20"],
  };
}

export function clusterPaint(opacity = 1): CircleLayerSpecification["paint"] {
  return {
    "circle-color": "#d66d47",
    "circle-radius": ["step", ["get", "point_count"], 8, 30, 10, 150, 12],
    "circle-opacity": 0.16 * opacity,
    "circle-stroke-color": "#d66d47",
    "circle-stroke-opacity": 0.9 * opacity,
    "circle-stroke-width": 1.5,
  };
}

export function observationPaint(opacity = 1, detailed = false): CircleLayerSpecification["paint"] {
  // Deteksi terpisah tetap terlihat, termasuk pada tampilan nasional.
  const alpha: number | ExpressionSpecification = detailed ? ["interpolate", ["linear"], ["zoom"], 0, 0.8 * opacity, 10, 0.95 * opacity] : 0.85 * opacity;
  return {
    "circle-color": ["match", ["get", "confidence"], "h", "#f16f59", "n", "#efa74e", "#d7cb81"],
    "circle-radius": detailed ? ["interpolate", ["linear"], ["zoom"], 3, 1.4, 6, 1.8, 10, 2.8, 14, 4] : ["interpolate", ["linear"], ["zoom"], 3, 2, 9, 3, 14, 4],
    "circle-opacity": alpha,
    "circle-stroke-color": "#171b20",
    "circle-stroke-width": detailed ? 0.4 : 0.75,
    "circle-stroke-opacity": alpha,
  };
}
