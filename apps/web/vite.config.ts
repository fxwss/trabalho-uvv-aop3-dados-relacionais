import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    // Em desenvolvimento o site chama /api e o Vite encaminha para a API local.
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY ?? "http://localhost:3333",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
});
