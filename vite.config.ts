import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import viteBasicSslPlugin from '@vitejs/plugin-basic-ssl';
// import copy from '@rollup-extras/plugin-copy';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteBasicSslPlugin(),
  ],
  build: {
    sourcemap: true,
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
});
