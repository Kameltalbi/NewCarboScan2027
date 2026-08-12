import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { seoStaticFilesPlugin } from "./scripts/generate-seo-files.mjs";

/** Strip GA network load on local Vite serve; keep tags for production View Source. */
function analyticsHtmlPlugin(mode: string): Plugin {
  const FALLBACK_GA_ID = "G-T07PGN0WZK";
  return {
    name: "carboscan-analytics-html",
    transformIndexHtml(html, ctx) {
      const env = loadEnv(mode, process.cwd(), "");
      const gaId = env.VITE_GA_MEASUREMENT_ID || FALLBACK_GA_ID;
      // Dev server: do not load googletagmanager on localhost
      if (ctx.server) {
        return html
          .replace(
            /<!-- Google tag \(gtag\.js\)[\s\S]*?<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]*"><\/script>\s*<script>[\s\S]*?gtag\('config'[\s\S]*?<\/script>/m,
            "<!-- Google tag disabled on localhost -->"
          )
          .replace(/%VITE_GA_MEASUREMENT_ID%/g, gaId);
      }
      return html.replace(/%VITE_GA_MEASUREMENT_ID%/g, gaId);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 5173,
    strictPort: false,
    open: false, // Ne pas ouvrir automatiquement le navigateur
    watch: {
      // Reduce the number of files being watched
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.nyc_output/**',
        '**/tmp/**',
        '**/temp/**'
      ],
      // Use polling as fallback with reduced frequency
      usePolling: true,
      interval: 2000,
    },
    // Reduce memory usage
    hmr: {
      overlay: true,
    },
  },
  plugins: [
    react(),
    analyticsHtmlPlugin(mode),
    seoStaticFilesPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "CarboScan — Bilan Carbone & Décarbonation",
        short_name: "CarboScan",
        description: "Mesurez, pilotez et réduisez les émissions carbone de votre organisation.",
        theme_color: "#006F5A",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/app/dashboard",
        lang: "fr",
        categories: ["business", "productivity"],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        // Les grandes photos publiques restent disponibles en ligne mais ne
        // doivent pas gonfler le cache d'installation initial.
        globPatterns: ["**/*.{js,css,html,ico,svg,webp,woff2}"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@vite/client', '@vite/env'],
  },
  // Build optimizations
  build: {
    // Le vrai poids provient de vendor-pdf/vendor-excel (lazy). On monte la limite pour éviter le bruit.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-tooltip', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-dropdown-menu', 'lucide-react'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          // Déduplication PDF : un seul chunk partagé pour jspdf/html2canvas/html2pdf,
          // au lieu d'être inliné dans chaque chunk de route qui les importe.
          'vendor-pdf': ['jspdf', 'html2canvas', 'html2pdf.js'],
          // Idem pour Excel — gros lib, un seul chunk partagé, chargé à la demande.
          'vendor-excel': ['exceljs'],
        },
      },
    },
  },
}));
