import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      tailwindcss(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.svg', 'pwa-512x512.svg'],
        manifest: {
          name: 'EstatePulse Brokerage Pro',
          short_name: 'EstatePulse',
          description: 'Enterprise Real Estate CRM SaaS featuring portfolio velocity analytics, lead acquisition Kanban, and MLS property inventory.',
          theme_color: '#047857',
          background_color: '#f8f9ff',
          display: 'standalone',
          orientation: 'portrait-primary',
          icons: [
            {
              src: '/pwa-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
            {
              src: '/pwa-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              // Cache-first for Supabase property photos and remote images
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*|^https:\/\/images\.unsplash\.com\/.*|^https:\/\/placehold\.co\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'estatepulse-property-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Network-first for Supabase REST API and GraphQL
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*|^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'estatepulse-supabase-api',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 1 Day
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Cache Google Fonts
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 Year
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 3000,
      proxy: {
        // Forward all requests starting with /supabase-api to the real Supabase URL
        '/supabase-api': {
          target: env.VITE_SUPABASE_URL || 'https://gsyhniaoesaskmesrkqt.supabase.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase-api/, ''),
          secure: false,
        },
      },
    },
  };
});