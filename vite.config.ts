import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * GitHub Pages project URL for https://github.com/leeraymond78/mikebillpwa
 * Override with VITE_BASE=/ for a custom domain root deploy.
 */
const DEFAULT_PAGES_BASE = '/mikebillpwa/';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE || (mode === 'production' ? DEFAULT_PAGES_BASE : '/');

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'icons/icon-180.png',
          'icons/icon-192.png',
          'icons/icon-512.png',
        ],
        manifest: {
          name: 'MikeBill',
          short_name: 'MikeBill',
          description:
            'Find Hong Kong on-street parking meters and private carparks with live vacancy data.',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: base,
          start_url: `${base}#/`,
          lang: 'en',
          categories: ['navigation', 'travel', 'utilities'],
          icons: [
            {
              src: 'icons/icon-48.png',
              sizes: '48x48',
              type: 'image/png',
            },
            {
              src: 'icons/icon-72.png',
              sizes: '72x72',
              type: 'image/png',
            },
            {
              src: 'icons/icon-96.png',
              sizes: '96x96',
              type: 'image/png',
            },
            {
              src: 'icons/icon-128.png',
              sizes: '128x128',
              type: 'image/png',
            },
            {
              src: 'icons/icon-144.png',
              sizes: '144x144',
              type: 'image/png',
            },
            {
              src: 'icons/icon-152.png',
              sizes: '152x152',
              type: 'image/png',
            },
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-256.png',
              sizes: '256x256',
              type: 'image/png',
            },
            {
              src: 'icons/icon-384.png',
              sizes: '384x384',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.hostname === 'resource.data.one.gov.hk' &&
                url.pathname.includes('.csv'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'hk-parking-csv',
                expiration: {
                  maxEntries: 8,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ url }) => url.hostname === 'api.car4goal.com',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'car4goal-api',
                networkTimeoutSeconds: 8,
                expiration: {
                  maxEntries: 64,
                  maxAgeSeconds: 60 * 10,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.hostname === 'maps.googleapis.com' ||
                url.hostname === 'maps.gstatic.com' ||
                url.hostname.endsWith('.googleapis.com'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'google-maps',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 128,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ request, url }) =>
                request.destination === 'image' ||
                /\.(?:png|jpg|jpeg|webp|gif|svg)$/i.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
      {
        name: 'mikebill-gh-pages-meta',
        closeBundle() {
          const distDir = resolve(__dirname, 'dist');
          if (!existsSync(distDir)) return;
          writeFileSync(resolve(distDir, '.gh-pages-base'), `${base}\n`, 'utf8');
        },
      },
    ],
    build: {
      sourcemap: false,
      target: 'es2022',
      assetsDir: 'assets',
    },
  };
});
