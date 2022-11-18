class Chunk {
  constructor(entryModule) {
    //此代码的入口模块
    this.entryModule = entryModule;
    this.name = entryModule.name;
    this.files = []; //这个代码块生成了那些文件
    this.modules = []; //这个代码块里面包含那些模块
    this.async = entryModule.async;
  }
}
module.exports = Chunk;
