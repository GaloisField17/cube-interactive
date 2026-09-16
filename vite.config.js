import { defineConfig } from "vite";

export default defineConfig({
  base: "/cube-interactive/",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) {
            return "three";
          }

          if (id.includes("node_modules/jszip")) {
            return "jszip";
          }
        },
      },
    },
  },
});
