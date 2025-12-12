// eslint-disable-next-line @typescript-eslint/no-var-requires
const purgecssModule = require('@fullhuman/postcss-purgecss');
// Handle default export for CommonJS/ESM interop (runtime check shows it's directly callable)
// TypeScript doesn't recognize CommonJS module exports correctly, so we need to bypass type checking
const purgecssRaw = purgecssModule.default || purgecssModule;
/** @type {any} */
const purgecss = purgecssRaw;


/**
 * See Vue guide for extractor and safelist
 * https://purgecss.com/guides/vue.html#usage
 *
 */
const purgecssConfig = {
  content: ['./src/**/*.{vue,js,ts,css,scss,html}'],
  extractors: [
    {
      extractor(content) {
        const contentWithoutStyleBlocks = content.replace(/<style[^]+?<\/style>/gi, '');
        return contentWithoutStyleBlocks.match(/[A-Za-z0-9-_/:]*[A-Za-z0-9-_/]+/g) || [];
      },
      extensions: ['vue']
    }
  ],
  safelist: [
    /-(leave|enter|appear)(|-(to|from|active))$/,
    /^(?!(|.*?:)cursor-move).+-move$/,
    /^router-link(|-exact)-active$/,
    /data-v-.*/,
    /data-bs.*/, // Bootstrap 5 javascript data attributes
    /driver-.*/,
  ],
};

// Create a wrapper plugin that conditionally applies PurgeCSS
const conditionalPurgecss = () => {
  const purgecssInstance = purgecss(purgecssConfig);

  return {
    postcssPlugin: 'conditional-purgecss',
    Once(root, helpers) {
      // Check if this CSS file is from vue-data-ui
      const filePath = helpers.result.root.source?.input?.file ||
        helpers.result.root.source?.input?.from ||
        helpers.result.opts?.from ||
        '';

      if (filePath.includes('vue-data-ui') || filePath.includes('node_modules/vue-data-ui')) {
        // Skip PurgeCSS processing for vue-data-ui files - do nothing
        return;
      }

      // Apply PurgeCSS for all other files
      // Pass the full helpers object (includes result, postcss, list, etc.) to the wrapped plugin
      if (typeof purgecssInstance === 'function') {
        return purgecssInstance(root, helpers);
      } else if (purgecssInstance.Once) {
        return purgecssInstance.Once(root, helpers);
      }
    }
  };
};
conditionalPurgecss.postcss = true;

module.exports = {
  plugins: [
    conditionalPurgecss()
  ]
};
