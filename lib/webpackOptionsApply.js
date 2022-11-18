const EntryOptionPlugin = require("./EntryOptionsPlugin");
const OutputCompilationDataPlugin = require("./OutputCompilationDataPlugin");
const {
  MinifyPlugin,
  DevServerPlugin,
  ClearOutputFilePlugin,
  WatchFilePlugin,
} = require("./plugins");
//挂载各种各样的内置插件
class webpackOptionsApply {
  process(options, compiler) {
    const { clear, devServer, mode } = options;
    new WatchFilePlugin().apply(compiler);
    //注册插件
    new EntryOptionPlugin().apply(compiler);
    //输出系统的插件
    new OutputCompilationDataPlugin().apply(compiler);
    //删除输出目录文件
    clear && new ClearOutputFilePlugin().apply(compiler);
    // 注册服务器插件;
    if (typeof devServer === "object") {
      new DevServerPlugin().apply(compiler);
    }
    //注册压缩插件(生产模式才开启压缩)
    if (mode === "production")
      new MinifyPlugin({
        html: {
          removeComments: true, //删除html注释
          removeEmptyAttributes: true, //删除所有空格做属性值
          collapseInlineTagWhitespace: true, //行内空隙
          collapseWhitespace: true, //两行之间的空隙}
        },
        js: {},
      }).apply(compiler);

    //触发entryOptions钩子 context也就是根目录的路径 "./src/index.js"
    compiler.hooks.entryOption.call(
      options.context,
      options.entry,
      options.output
    );
  }
}

module.exports = webpackOptionsApply;
