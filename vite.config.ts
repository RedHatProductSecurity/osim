import {fileURLToPath, URL} from 'node:url'

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import viteBasicSslPlugin from '@vitejs/plugin-basic-ssl';

import path from 'node:path'

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
    },
  },
})
