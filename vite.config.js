import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          lang: 'pt-BR',
          name: 'Finance Hub',
          short_name: 'Finance Hub',
          description: 'Sua vida financeira em equilíbrio',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#f5f6f3',
          theme_color: '#145e48',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          navigateFallback: base + 'index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          runtimeCaching: [],
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase/'))
              return 'firebase';
            if (/node_modules\/(recharts|d3-|victory)/.test(id)) return 'charts';
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      exclude: ['node_modules/**', 'tests/e2e/**', 'tests/rules/**'],
      setupFiles: ['./tests/setup.js'],
    },
  };
});
