const path = require("path");
const { SyncHook } = require("tapable");
const Parser = require("./Parser");
const parser = new Parser();
const NormalModuleFactory = require("./NormalModuleFactory");
const normalModuleFactory = new NormalModuleFactory();
const Chunk = require("./Chunk.js");
const ejs = require("ejs");
const { extname } = require("path");
const mainTemplate = require("./templates/deferredMain");
const chunkTemplate = require("./templates/chunk");
const mainRender = ejs.render;

class Compilation {
  constructor(compiler) {
    this.compiler = compiler; //编译器对象
    this.options = compiler.options; //选项是一样的
    this.context = compiler.context; //根目录
    this.inputFileSystem = compiler.inputFileSystem; //读取文件的模块的fs
    this.outputFileSystem = compiler.outputFileSystem; //写入文件的模块fs
    this.entries = []; //入口文件数组,这里放着所有的入口模块
    this.modules = []; //入口模块的数组
    this._modules = {}; //key是模块ID,值是模块对象
    this.startCompilationTime = new Date().getTime();
    this.hooks = {
      //当成功构建完成一个模块后就会触发这个钩子
      startCompilation: new SyncHook(["compilation"]), //开始构建的钩子
      succeedModule: new SyncHook(["module"]),
      seal: new SyncHook(),
      beforeChunks: new SyncHook(),
      afterChunks: new SyncHook(),
      beforeChangeAssets: new SyncHook([
        "compilation",
        "chunk",
        "emitFilename",
      ]),
      afterChangeAssets: new SyncHook(["compilation", "chunk", "emitFilename"]),
    };
    //这里放着所有的代码块
    this.chunks = [];
    this.files = []; //这里放着本次编译所有产出的文件名
    this.assets = {}; //存放生成资源 key是文件名,值是文件内容
    this.vendors = []; //放着所有的第三方模块 isArray
    this.commons = []; //放着同时被多个代码块加载的模块 title.js
    this.moduleCount = {}; //可以记录每个模块被代码块引用的次数,如果大于等于2就分离出去
  }
  //开始编译一个新的入口
  /**
   *
   * @param {*} context 根目录
   * @param {*} entry 入口模块的相对路径
   * @param {*} name  入口的名称
   * @param {*} callback 编译完成的回调
   */
  addEntry(context, entry, name, finalCallback) {
    this.hooks.startCompilation.call(this);
    this._addModuleChain(context, entry, name, false, (err, module) => {
      finalCallback(err, module);
    });
  }
  _addModuleChain(context, entry, name, async, callback) {
    this.createModule(
      {
        name, //main
        context: this.context, //根目录
        rawRequest: entry, //入口文件相对位置 ./src/index.js
        resource: path.posix.join(context, entry), //entry的绝对路径
        parser,
        moduleId: entry, //./src/index.js
        async,
      },
      (entryModule) => this.entries.push(entryModule),
      callback
    );
  }
  /**
   * @param {*} module //要编译的模块
   * @param {*} afterBuild  //编译完成后的回调
   */
  buildModule(module, afterBuild) {
    //模块的真正的编译逻辑其实是放在module内部完成的
    module.build(this, (err) => {
      //走到这里意味着一个module模块已经编译成功了
      this.hooks.succeedModule.call(module);
      afterBuild(err, module);
    });
  }
  /**
   * 处理模块依赖的函数
   * @param {*} module ./src/index.js
   * @param {*} callback
   */
  processModuleDependencies(module, callback) {
    function done(err, module) {
      if (--length === 0) {
        callback(err);
      }
    }
    //1.获取当前模块的依赖模块
    const dependencies = module.dependencies;
    let length = dependencies.length;
    //遍历依赖模块,全部开始编译,所有模块全部编译完成后才调用这个callback
    dependencies.forEach((dependency) => {
      const { name, context, rawRequest, resource, moduleId } = dependency;
      this.createModule({ parser, ...dependency }, null, done);
    });
  }
  /**
   * 创建并编译一个模块
   * @param {*} data 要编译的模块信息
   * @param {*} addEntry 可选的增加入口的方法,如果这个模块是入口模块,如果不是的话就什么都不做
   * @param {*} callback 编译完成之后可以调用callback回调
   */
  createModule(data, addEntry, callback) {
    let module = null;
    const findSameModule = this.modules.find(
      (module) =>
        module.moduleId === data.moduleId &&
        module.async === data.async &&
        module.name === data.name
    );
    if (!findSameModule) {
      const _module = normalModuleFactory.create(data);
      addEntry && addEntry({ ..._module }); //如果是入口模块,则添加到入口当中去
      //放所有的模块
      this.modules.push(_module);
      this._modules[_module.moduleId] = _module;
      module = _module;
    } else {
      module = findSameModule;
    }

    const afterBuild = (err, module) => {
      //如果大于0则有依赖
      if (module.dependencies.length > 0) {
        this.processModuleDependencies(module, (err) => {
          callback(err, module);
        });
      } else {
        callback(err, module);
      }
      //TODO
      // return callback(err, entryModule);
    };
    this.buildModule(module, afterBuild);
  }

  /**
   * 把模块封装成代码块
   * @param {} callback
   */
  seal(callback) {
    this.hooks.seal.call();
    this.hooks.beforeChunks.call();
    //循环所有的modules数组
    debugger;
    for (const module of this.modules) {
      //如果模块id中有node_modules内容,说明是一个第三方模块
      if (/node_modules/.test(module.moduleId)) {
        module.name = "vendors";
        if (
          this.vendors.findIndex((item) => item.moduleId === module.moduleId) ==
          -1
        ) {
          this.vendors.push(module);
        }
      } else {
        let count = this.moduleCount[module.moduleId];
        if (count) {
          this.moduleCount[module.moduleId].count++;
        } else {
          //如果没有则给他赋初始值{module,count:1(模块的引用次数)}
          this.moduleCount[module.moduleId] = { module, count: 1 };
        }
      }
    }
    for (const moduleId in this.moduleCount) {
      const { module, count } = this.moduleCount[moduleId];
      if (count >= 2) {
        module.name = "commons";
        this.commons.push(module);
      }
    }

    //第三方的模块和引用两次以上的模块
    let deferredModules = [...this.vendors, ...this.commons].map(
      (module) => module.moduleId
    );

    //过滤掉剩下的模块
    this.modules = this.modules.filter(
      (module) => !deferredModules.includes(module.moduleId)
    );
    //一般来说 循环每一个入口生成一个代码块
    for (const entryModule of this.entries) {
      const chunk = new Chunk(entryModule); //根据入口模块得到一个代码块
      this.chunks.push(chunk);
      //对所有的模块进行过滤找出名称与当前chunk一样的模块组成一个数组赋值给chunk的modules
      chunk.modules = this.modules.filter(
        (module) => module.name === chunk.name
      );
    }
    if (this.vendors.length > 0) {
      const chunk = new Chunk(this.vendors[0]); //根据入口模块得到一个代码块
      chunk.async = true;
      this.chunks.push(chunk);
      chunk.modules = this.vendors;
    }
    if (this.commons.length > 0) {
      const chunk = new Chunk(this.commons[0]); //根据入口模块得到一个代码块
      chunk.async = true;
      this.chunks.push(chunk);
      chunk.modules = this.commons;
    }
    this.hooks.afterChunks.call(this.chunks);
    //生成代码块之后要生成代码块对应的资源

    this.createChunksAssets();
    callback();
  }
  createChunksAssets() {
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      const file = extname(chunk.name) === "" ? chunk.name + ".js" : chunk.name;
      chunk.files.push(file);
      let source;
      //异步的代码生成
      if (chunk.async) {
        source = chunkTemplate(
          chunk.name, // ./src/index.js
          chunk.modules //此代码块对应的模板数组[{moduleId:"./src/index.js"}]
        );
        //同步的代码生成
      } else {
        const deferredChunks = [];
        if (this.commons.length > 0) deferredChunks.push("commons");
        if (this.vendors.length > 0) deferredChunks.push("vendors");
        source = mainTemplate(
          chunk.modules, //所有的代码块
          deferredChunks, //此代码块对应的模板数组[{moduleId:"./src/index.js"}]
          chunk.entryModule.moduleId // ./src/index.js
        );
      }
      this.hooks.beforeChangeAssets.call(this, chunk, file);
      this.changeAssets(file, source);
      this.hooks.afterChangeAssets.call(this, chunk, file);
    }
  }
  changeAssets(file, source) {
    this.assets[file] = source;
    this.files.push(file);
  }
}
module.exports = Compilation;
