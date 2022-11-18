const { minify: htmlMinify } = require("html-minifier-terser");
const { minify: jsMinify } = require("terser");
const { extname } = require("path");
class MinifyPlugin {
  constructor(minifyPluginOptions = {}) {
    this.minifyPluginOptions = minifyPluginOptions;
    /**
     * minifyPluginOptions = {js:{},html:{}}
     */
    //!html:压缩html的配置
    // removeAttributeQuotes = false, //删除引号属性
    // removeComments = false, //删除html注释
    // removeEmptyAttributes = false, //删除所有空格做属性值
    // removeEmptyElements = false, //删除所有元素的空内容
    // removeOptionalTags = false, //删除可选标记
    // collapseInlineTagWhitespace = false, //行内空隙
    // collapseWhitespace = false, //两行之间的空隙

    //!js:
  }
  apply(compiler) {
    compiler.hooks.emit.tapAsync(
      "MinifyPlugin",
      async (compilation, callback) => {
        //如果是生产模式 开启压缩
        const { assets } = compilation;
        for (const key in assets) {
          //如果是html文件才能使用html-minifier-terser
          if (extname(key) === ".html") {
            assets[key] = await htmlMinify(
              assets[key],
              this.minifyPluginOptions.html
            );
          }
          //如果是js文件
          else if (extname(key) === ".js") {
            const result = await jsMinify(
              assets[key],
              this.minifyPluginOptions.js
            );
            assets[key] = result.code;
          }
        }
        callback();
      }
    );
  }
}

module.exports = MinifyPlugin;
