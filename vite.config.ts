import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
  base: "./",                                     // needed for offline APK
  root: path.resolve(__dirname, "client"),        // <-- source lives in /client
  build: {
    outDir: "dist",                                // <-- output to client/dist
    emptyOutDir: true,
  },
  plugins: [
    react(),
    // dev-only replit plugins (avoid white screen in prod):
    ...(isDev ? [] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
});
