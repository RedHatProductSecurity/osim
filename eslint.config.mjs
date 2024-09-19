// @ts-check

import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { mergeProcessors } from 'eslint-merge-processors';
import format from 'eslint-plugin-format';
import pluginImport from 'eslint-plugin-import-x';
import perfectionist from 'eslint-plugin-perfectionist';
import pluginUnicorn from 'eslint-plugin-unicorn';
import unusedImports from 'eslint-plugin-unused-imports';
import pluginVue from 'eslint-plugin-vue';
import processorVueBlocks from 'eslint-processor-vue-blocks';
import pluginVitest from 'eslint-plugin-vitest';
import noOnlyTest from 'eslint-plugin-no-only-tests';
import tseslint from 'typescript-eslint';
import parserVue from 'vue-eslint-parser';

// Prettier is only used for formatting CSS and SCSS files
const prettierOptions = {
  endOfLine: 'auto',
  printWidth: 120,
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/public',
      '**/build',
      '**/selenium',
      '**/postcss.config.cjs',
      '**/generated-client/**',
      '**/mock-server/**',
      '**/*.snap',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // @ts-expect-error - Missing types
  ...pluginVue.configs['flat/recommended'],
  pluginImport.flatConfigs.typescript,
  {
    name: 'import',
    plugins: {
      import: pluginImport,
    },
    rules: {
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/no-mutable-exports': 'error',
      'import/no-named-default': 'error',
      'import/no-self-import': 'error',
      'import/no-webpack-loader-syntax': 'error',
      'import/newline-after-import': ['error', { count: 1 }],
      'import/order': ['error', {
        'groups': ['builtin', 'external', 'internal'],
        'newlines-between': 'always',
        'pathGroups': [
          {
            group: 'internal',
            pattern: '@/components/**',
            position: 'after',
          },
          {
            group: 'internal',
            pattern: '@/composables/**',
            position: 'after',
          },
          {
            group: 'internal',
            pattern: '@/**',
            position: 'after',
          },
          {
            group: 'builtin',
            pattern: 'vue',
            position: 'before',
          },
        ],
        'pathGroupsExcludedImportTypes': ['vue'],
      }],
    },
  },
  {
    files: ['*.vue', '**/*.vue'],
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    name: 'vue',
    plugins: {
      vue: pluginVue,
    },
    processor: mergeProcessors([
      pluginVue.processors['.vue'],
      processorVueBlocks({
        blocks: {
          customBlocks: true,
          script: false,
          styles: true,
          template: false,
        },
      }),
    ]),
    rules: {
      'vue/attribute-hyphenation': 'off',
      'vue/attributes-order': 'error',
      'vue/block-order': ['error', {
        order: ['script', 'template', 'style'],
      }],
      'vue/block-tag-newline': 'error',
      'vue/define-macros-order': ['error', {
        order: ['defineProps', 'defineModel', 'defineEmits', 'defineSlots', 'defineOptions'],
      }],
      'vue/html-closing-bracket-spacing': [
        'warn',
        {
          selfClosingTag: 'always',
          startTag: 'never',
        },
      ],
      'vue/html-indent': ['error', 2],
      'vue/html-self-closing': 'off',
      'vue/key-spacing': 'error',
      'vue/keyword-spacing': 'error',
      'vue/max-attributes-per-line': [
        'warn',
        {
          multiline: {
            max: 1,
          },
          singleline: 3,
        },
      ],
      'vue/multi-word-component-names': [
        'error',
        {
          ignores: ['Modal', 'Tabs', 'Toast', 'Login', 'Navbar', 'Settings'],
        },
      ],
      'vue/multiline-html-element-content-newline': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/v-on-event-hyphenation': 'off',
    },
  },
  {
    name: 'typescript',
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-lonely-if': 'error',
      'prefer-const': ['error'],
    },
  },
  stylistic.configs.customize({
    braceStyle: '1tbs',
    commaDangle: 'always-multiline',
    indent: 2,
    jsx: true,
    quotes: 'single',
    semi: true,
  }),
  {
    name: 'stylistic',
    rules: {
      '@stylistic/array-element-newline': ['error', 'consistent'],
      '@stylistic/comma-spacing': 'error',
      '@stylistic/comma-style': 'error',
      '@stylistic/dot-location': ['error', 'property'],
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      '@stylistic/multiline-ternary': ['error', 'always-multiline'],
      '@stylistic/no-multi-spaces': ['error', {
        ignoreEOLComments: true,
      }],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-whitespace-before-property': 'error',
      '@stylistic/nonblock-statement-body-position': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
      '@stylistic/operator-linebreak':
        ['error', 'before', { overrides: { '+': 'ignore', '=': 'after' } }],
      '@stylistic/space-in-parens': 'error',
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/template-curly-spacing': ['error', 'never'],
      '@stylistic/type-annotation-spacing': 'error',
      'eol-last': ['error', 'always'],
      'linebreak-style': ['error', 'unix'],
      'max-len': ['error', { code: 120 }],
    },
  },
  {
    name: 'unused-imports',
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          vars: 'all',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.css'],
    languageOptions: {
      parser: format.parserPlain,
    },
    name: 'css',
    plugins: {
      format,
    },
    rules: {
      'format/prettier': [
        'error',
        {
          ...prettierOptions,
          parser: 'css',
        },
      ],
    },
  },
  {
    files: ['**/*.scss'],
    languageOptions: {
      parser: format.parserPlain,
    },
    name: 'scss',
    plugins: {
      format,
    },
    rules: {
      'format/prettier': [
        'error',
        {
          ...prettierOptions,
          parser: 'scss',
        },
      ],
    },
  },
  {
    name: 'unicorn',
    plugins: {
      unicorn: pluginUnicorn,
    },
    rules: {
      'unicorn/consistent-empty-array-spread': 'error',
      'unicorn/consistent-function-scoping': 'error',
      'unicorn/error-message': 'error',
      'unicorn/escape-case': 'error',
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-new-array': 'error',
      'unicorn/no-new-buffer': 'error',
      'unicorn/number-literal-case': 'error',
      'unicorn/prefer-dom-node-text-content': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/throw-new-error': 'error',
    },
  },
  {
    name: 'perfectionist',
    plugins: {
      perfectionist,
    },
    rules: {
      ...perfectionist.configs['recommended-natural'].rules,
      'perfectionist/sort-imports': 'off',
      'perfectionist/sort-jsx-props': 'off',
      'perfectionist/sort-named-imports': 'off',
      'perfectionist/sort-objects': ['error', {
        destructureOnly: true,
        type: 'natural',
      }],
      'perfectionist/sort-vue-attributes': 'off',
    },
  },
  {
    languageOptions: {
      globals: {
        ...pluginVitest.environments.env.globals,
      },
    },
    name: 'tests',
    plugins: {
      test: {
        ...pluginVitest,
        rules: {
          ...pluginVitest.rules,
          ...noOnlyTest.rules,
        },
      },
    },
    settings: {
      test: {
        typecheck: true,
      },
    },
  },
  {
    files: ['**/*.spec.ts'],
    name: 'test/rules',
    rules: {
      'node/prefer-global/process': 'off',
      'test/consistent-test-it': ['error', { fn: 'it', withinDescribe: 'it' }],
      'test/expect-expect': 'error',
      'test/no-commented-out-tests': 'error',
      'test/no-identical-title': 'error',
      'test/no-import-node-test': 'error',
      'test/no-only-tests': 'error',
      'test/prefer-comparison-matcher': 'error',
      'test/prefer-each': 'error',
      'test/prefer-hooks-in-order': 'error',
      'test/prefer-hooks-on-top': 'error',
      'test/prefer-lowercase-title': 'error',
      'test/valid-describe-callback': 'error',
      'test/valid-expect': 'error',
      'ts/explicit-function-return-type': 'off',
    },
  },
);
