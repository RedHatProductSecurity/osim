// eslint-disable-next-line @typescript-eslint/no-var-requires
const purgecss = require('@fullhuman/postcss-purgecss');


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
    Once(root, { result }) {
      // Check if this CSS file is from vue-data-ui
      const filePath = result.root.source?.input?.file || 
                       result.root.source?.input?.from || 
                       result.opts?.from || 
                       '';
      
      if (filePath.includes('vue-data-ui') || filePath.includes('node_modules/vue-data-ui')) {
        // Skip PurgeCSS processing for vue-data-ui files - do nothing
        return;
      }
      
      // Apply PurgeCSS for all other files
      // Call the PurgeCSS plugin's Once method
      if (typeof purgecssInstance === 'function') {
        return purgecssInstance(root, result);
      } else if (purgecssInstance.Once) {
        return purgecssInstance.Once(root, result);
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
