import { fileURLToPath } from 'node:url';
import { env } from 'node:process';

import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';

import viteConfig from './vite.config';

export default defineConfig(configEnv =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        coverage: {
          enabled: env.CI === 'true',
          provider: 'istanbul',
          reporter: [
            'text',
            'html',
            'json',
            // 'lcov',
          ],
          include: ['src/**/*'],
          exclude: ['src/generated-client/*', 'src/mock-server/*', 'src/shims/*'],
          thresholds: {
            autoUpdate: false,
            statements: 80,
            branches: 65,
            functions: 74,
            lines: 80,
          },
        },
        environment: 'jsdom',
        exclude: [...configDefaults.exclude, 'e2e/*'],
        root: fileURLToPath(new URL('./', import.meta.url)),
        globals: true,
        setupFiles: [
          './src/__tests__/setup.ts',
        ],
      },
    })));
