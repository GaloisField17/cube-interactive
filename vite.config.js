import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/cube-interactive/" : "/",
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
}));
