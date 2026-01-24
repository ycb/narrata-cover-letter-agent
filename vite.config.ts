import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      fs: path.resolve(__dirname, "./src/lib/shims/fs.ts"),
    },
  },
  server: {
    host: "::",
    port: Number(process.env.VITE_DEV_SERVER_PORT) || 8080,
    strictPort: true,
  },
}));
