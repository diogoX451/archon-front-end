import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_ARCHON_API_URL || env.VITE_API_URL || "http://localhost:8080";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@app": path.resolve(__dirname, "src/app"),
        "@pages": path.resolve(__dirname, "src/pages"),
        "@shared": path.resolve(__dirname, "src/shared"),
        "@features": path.resolve(__dirname, "src/features"),
        "@templates": path.resolve(__dirname, "src/templates"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/auth": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/health": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/openapi.yaml": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/swagger": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/c": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
