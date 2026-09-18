import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(dir, "spa"),
  base: "/stx-visa-packet/",
  publicDir: resolve(dir, "public"),
  define: {
    "import.meta.env.VITE_SPA": JSON.stringify("true"),
  },
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": resolve(dir, "src"),
      "@/lib/ai": resolve(dir, "src/lib/ai.spa.ts"),
    },
  },
  build: {
    outDir: resolve(dir, "docs"),
    emptyOutDir: true,
    sourcemap: false,
  },
});
