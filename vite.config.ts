import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' keeps every path relative, so the same build works at a domain root or under /repo-name/ on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Arabiyyah — Quranic Arabic', short_name: 'Arabiyyah',
        description: 'Personal Quranic Arabic learning system', lang: 'en', dir: 'ltr',
        theme_color: '#173f37', background_color: '#f5f0e6', display: 'standalone', orientation: 'any', start_url: './', scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}', 'data/meta.json', 'data/lexicon.json', 'data/roots.json', 'data/quran/{1,55,67}.json'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.includes('/data/quran/'), handler: 'CacheFirst', options: { cacheName: 'quran-data', expiration: { maxEntries: 130 } } },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
} as any);
