import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [react(), tailwindcss()],
  publicDir: command === "serve" && mode === "mock" ? "msw-public" : "public",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    modules: {
      generateScopedName:
        command === "serve" ? "[name]__[local]__[hash:base64:4]" : "[hash:base64:6]",
    },
  },
  server:
    mode === "api"
      ? {
          proxy: {
            "/v1": "http://127.0.0.1:8081",
          },
        }
      : undefined,
}));
