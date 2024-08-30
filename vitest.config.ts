import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig(configEnv =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        coverage: {
          provider: 'istanbul',
          reporter: [
            'text',
            'html',
            'json',
            // 'lcov',
          ],
          exclude: ['src/generated-client/*'],
        },
        environment: 'jsdom',
        exclude: [...configDefaults.exclude, 'e2e/*'],
        root: fileURLToPath(new URL('./', import.meta.url)),
        globals: true,
        onConsoleLog: (_, type) => type === 'stderr',
        globalSetup: [
          // './src/__tests__/global-setup.ts',
        ],
      },
    })));
