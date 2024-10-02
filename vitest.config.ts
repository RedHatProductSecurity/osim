import { fileURLToPath } from 'node:url';

import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';

import viteConfig from './vite.config';

export default defineConfig(configEnv =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        coverage: {
          enabled: false,
          provider: 'istanbul',
          reporter: [
            'text',
            'html',
            'json',
            // 'lcov',
          ],
          include: ['src/**/*'],
          exclude: ['src/generated-client/*', 'src/mock-server/*', 'src/shims/*'],
        },
        environment: 'jsdom',
        exclude: [...configDefaults.exclude, 'e2e/*'],
        root: fileURLToPath(new URL('./', import.meta.url)),
        globals: true,
        setupFiles: [
          './src/__tests__/setup.ts',
        ],
        globalSetup: [
          // './src/__tests__/global-setup.ts',
        ],
      },
    })));
