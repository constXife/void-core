import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

const devRoot = path.resolve(__dirname, "../../../../..");
const overlayRoot = path.resolve(devRoot, "void/pkgs/atrium/overlays/app/frontend");
const voidCoreFrontend = __dirname;

export default defineConfig({
  root: overlayRoot,
  plugins: [vue()],
  resolve: {
    alias: {
      "@platform": path.resolve(voidCoreFrontend, "src/platform"),
      "@styles": path.resolve(voidCoreFrontend, "src/styles"),
      "vue": path.resolve(voidCoreFrontend, "node_modules/vue"),
      "vue-router": path.resolve(voidCoreFrontend, "node_modules/vue-router"),
      "pinia": path.resolve(voidCoreFrontend, "node_modules/pinia"),
      "lucide-vue-next": path.resolve(voidCoreFrontend, "node_modules/lucide-vue-next")
    }
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:8080",
      "/auth": "http://localhost:8080",
      "/login": "http://localhost:8080"
    }
  },
  build: {
    outDir: path.resolve(overlayRoot, "../backend/internal/web/dist-calendar"),
    emptyOutDir: true,
    rollupOptions: {
      input: "index-calendar.html"
    }
  }
});
