import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import tailwindcss from "@tailwindcss/vite";
import path from "path";

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------
// PORT and BASE_PATH are Replit-specific env vars injected by the workflow
// runner.  When building on Vercel (VERCEL=1) or any generic CI (CI=true)
// those vars are not present — and we don't need them because:
//   • PORT  is only used by the Vite dev/preview server, not by `vite build`
//   • BASE_PATH defaults to "/" on Vercel (the app is served at the root)
const isExternalBuild = process.env.VERCEL === "1" || process.env.CI === "true";

// PORT — only required in the Replit dev environment
const rawPort = process.env.PORT;
if (!rawPort && !isExternalBuild) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}
const port = rawPort ? Number(rawPort) : 3000;
if (!isExternalBuild && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH — defaults to "/" for external builds (Vercel serves from root)
const basePath = process.env.BASE_PATH ?? (isExternalBuild ? "/" : null);
if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

// ---------------------------------------------------------------------------
// Replit-specific plugins (only loaded inside the Replit environment)
// ---------------------------------------------------------------------------
const isReplit =
  process.env.REPL_ID !== undefined || process.env.REPLIT_CLUSTER !== undefined;

export default defineConfig({
  base: basePath,
  css: {
    transformer: 'postcss',   // 👈 Use PostCSS instead of lightningcss
  },
  plugins: [
    react(),
    // tailwindcss(),
    // Runtime error overlay — only useful in the Replit dev environment
    ...(isReplit && process.env.NODE_ENV !== "production"
      ? [(await import("@replit/vite-plugin-runtime-error-modal")).default()]
      : []),
    // Replit-only dev plugins
    ...(isReplit && process.env.NODE_ENV !== "production"
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
