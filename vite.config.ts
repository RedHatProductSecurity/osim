import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import inject from '@rollup/plugin-inject';
import viteBasicSslPlugin from '@vitejs/plugin-basic-ssl';
// import copy from '@rollup-extras/plugin-copy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    viteBasicSslPlugin(),
    mode === 'production'
    && inject({
      'exclude': 'node_modules/**',
      'console.log': path.resolve(__dirname, 'src/shims/console/log.js'),
      'console.error': path.resolve(__dirname, 'src/shims/console/error.js'),
      'console.warn': path.resolve(__dirname, 'src/shims/console/warn.js'),
    }),
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  esbuild: {
    pure: ['console.debug'],
  },
  server: {
    https: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),

      // supresses externalized Module warnings
      // I think this does something other than intended
      // 'source-map-js': 'source-map',
      // path: 'path-browserify',
    },
  },
}));
