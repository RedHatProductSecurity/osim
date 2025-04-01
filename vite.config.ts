import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import viteBasicSslPlugin from '@vitejs/plugin-basic-ssl';
// import copy from '@rollup-extras/plugin-copy';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [
    vue(),
    viteBasicSslPlugin(),
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
    proxy: {
      '/proxy/mitre': {
        target: 'https://cwe-api.mitre.org/api/v1',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/proxy\/mitre/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@test-fixtures': fileURLToPath(new URL('./src/__tests__/__fixtures__', import.meta.url)),
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),

      // supresses externalized Module warnings
      // I think this does something other than intended
      // 'source-map-js': 'source-map',
      // path: 'path-browserify',
    },
  },
}));
