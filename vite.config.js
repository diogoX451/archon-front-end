import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@app": path.resolve(__dirname, "src/app"),
            "@pages": path.resolve(__dirname, "src/pages"),
            "@shared": path.resolve(__dirname, "src/shared"),
            "@features": path.resolve(__dirname, "src/features"),
            "@templates": path.resolve(__dirname, "src/templates")
        }
    },
    server: {
        port: 5173
    }
});
