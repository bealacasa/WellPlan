/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { buildCsp } from "./src/lib/csp";

/** Ruta en GitHub Pages: https://bealacasa.github.io/WellPlan/ */
const BASE = "/WellPlan/";

/**
 * CSP en <meta> (GitHub Pages no permite cabeceras propias). Solo en el build:
 * el servidor de desarrollo de Vite necesita scripts inline para la recarga en caliente.
 */
function cspMeta(supabaseUrl: string | undefined): Plugin {
  return {
    name: "wellplan-csp-meta",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: () => [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: buildCsp(supabaseUrl) },
          injectTo: "head-prepend",
        },
      ],
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: BASE,
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    plugins: [
      react(),
      tailwindcss(),
      cspMeta(env.VITE_SUPABASE_URL),
      VitePWA({
        registerType: "prompt",
        // Registro del service worker desde un fichero propio (sin script inline, por la CSP).
        injectRegister: null,
        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
        manifest: {
          name: "WellPlan",
          short_name: "WellPlan",
          description: "Tu plan de gimnasio y ejercicios de fisioterapia, también sin conexión.",
          lang: "es",
          start_url: BASE,
          scope: BASE,
          display: "standalone",
          orientation: "portrait",
          background_color: "#0f1115",
          theme_color: "#0f1115",
          icons: [
            { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "pwa-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // Toda la app precargada: funciona sin conexión tras la primera visita.
          globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
          navigateFallback: `${BASE}index.html`,
          cleanupOutdatedCaches: true,
          // Nunca cachear llamadas a Supabase: los datos viven en IndexedDB.
          navigateFallbackDenylist: [/^\/auth\//, /^\/rest\//],
        },
      }),
    ],
    build: { target: "es2022", sourcemap: false },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      restoreMocks: true,
      // Los flujos de interfaz escriben y navegan bastante (y las páginas se cargan en diferido).
      testTimeout: 15000,
      // Los tests nunca usan el Supabase real aunque exista .env.local.
      env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "" },
    },
  };
});
