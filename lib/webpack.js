const Compiler = require("./Compiler.js");
const NodeEnvironmentPlugin = require("./node/NodeEnvironmentPlugin.js");
const webpackOptionsApply = require("./webpackOptionsApply");

const webpack = (options, callback) => {
  //创建一个Compiler实例
  const compiler = new Compiler(options.context);
  compiler.options = options;
  //注册 fs系统(用于内部文件的读写)
  new NodeEnvironmentPlugin().apply(compiler);
  //注入webpack的内置插件
  new webpackOptionsApply().process(options, compiler);

  //挂载配置文件中提供的插件
  if (options.plugins && Array.isArray(options.plugins)) {
    for (const plugin of options.plugins) {
      plugin.apply(compiler);
    }
  }
  return compiler;
};

exports = module.exports = webpack;
