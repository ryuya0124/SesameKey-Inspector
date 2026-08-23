import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    // Cloudflare Workers Static Assets 対応プラグイン
    cloudflare(),
    // PWA 対応 (Service Worker + manifest)
    VitePWA({
      registerType: "autoUpdate",
      // 開発時も SW を有効化
      devOptions: { enabled: false },
      manifest: {
        name: "SesameKey Inspector",
        short_name: "SesameKey",
        description: "SESAME Bot 2 / Bot 3 のQRコードをブラウザだけで解析",
        theme_color: "#0a0f1e",
        background_color: "#0a0f1e",
        display: "standalone",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // JS / CSS / HTML のみキャッシュ。画像はキャッシュしない
        globPatterns: ["**/*.{js,css,html,woff2}"],
        // アップロード画像や機密データをキャッシュしない
        runtimeCaching: [],
      },
    }),
  ],
  // Web Worker のビルド設定
  worker: {
    format: "es",
  },
  build: {
    // ターゲット: ES2022 以上 (OffscreenCanvas / BarcodeDetector 対応)
    target: "es2022",
    rollupOptions: {
      output: {
        // QRデコードライブラリを別チャンクへ分割 (lazy-load)
        manualChunks(id: string) {
          if (id.includes("qr-scanner")) {
            return "qr-scanner";
          }
        },
      },
    },
  },
});
