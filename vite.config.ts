import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import viteBasicSslPlugin from '@vitejs/plugin-basic-ssl';
import copy from '@rollup-extras/plugin-copy';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteBasicSslPlugin(),
    copy({
      outputPlugin: true,
      // ignore: [path.resolve(__dirname,'public/CHANGELOG.md')],
      targets: [
        { src: path.resolve(__dirname, 'public/favicon.png'), dest: '.' },
      ] 
    })
  ],
  build: {
    copyPublicDir: false,
    sourcemap: true,
  },
  server: {
    https: true,
    watch: {
      ignored: [path.resolve('./public/CHANGELOG.md')],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
    },
  },
});
