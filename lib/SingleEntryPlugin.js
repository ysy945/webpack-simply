class SingleEntryPlugin {
  constructor(context, entry, name) {
    this.context = context; //上下文绝对路径
    this.entry = entry; //入口模块路径:./src/index.js
    this.name = name; //入口的名字main
  }
  apply(compiler) {
    compiler.hooks.make.tapAsync(
      "SingleEntryPlugin",
      (compilation, callback) => {
        const { context, entry, name } = this;
        //重此入口开始编译,编译入口文件和他的依赖
        // console.log("SingleEntryPlugin make");
        //开始编译一个新的入口context根目录 entry入口
        compilation.addEntry(context, entry, name, callback);
      }
    );
  }
}

module.exports = SingleEntryPlugin;
