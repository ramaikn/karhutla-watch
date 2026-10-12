import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    rollupOptions: {
      output: { manualChunks: { maplibre: ["maplibre-gl"] } },
    },
  },
});
