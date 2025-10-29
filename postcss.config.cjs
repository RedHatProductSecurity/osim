// eslint-disable-next-line @typescript-eslint/no-var-requires
const purgecss = require('@fullhuman/postcss-purgecss');


/**
 * See Vue guide for extractor and safelist
 * https://purgecss.com/guides/vue.html#usage
 *
 */
module.exports = {
  plugins: [
    purgecss({
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
        /driver-.*/
      ],
    })
  ]
};
