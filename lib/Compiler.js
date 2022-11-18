const {
  AsyncSeriesBailHook,
  SyncBailHook,
  AsyncParallelBailHook,
  AsyncSeriesHook,
  SyncHook,
} = require("tapable");
const NormalModuleFactory = require("./NormalModuleFactory");
const Compilation = require("./Compilation");
const Stats = require("./Stats");
const mkdirp = require("mkdirp");
const path = require("path");
const watchAPI = require("watch-ysy");
const fs = require("fs");
const { throttle } = require("./utils");

class Compiler {
  constructor(context) {
    this.context = context || process.cwd();
    this.isStartCompile = false;
    // this.options = options 用户传入得webpack.config.js配置
    this.hooks = {
      entryOption: new SyncBailHook(["context", "entry", "output"]), //context项目根目录 entry入口位置
      beforeRun: new AsyncSeriesHook(["compiler"]), //运行前
      run: new AsyncSeriesHook(["compiler"]), //运行
      beforeCompile: new AsyncSeriesHook(["params"]), //编译前
      compile: new SyncHook(["params"]), //编译
      make: new AsyncParallelBailHook(["compilation"]), //make构建
      thisCompilation: new SyncHook(["compilation", "params"]), //开始一次新的编译
      compilation: new SyncHook(["compilation", "params"]), //创建完成一个新的compilation
      afterCompile: new AsyncSeriesHook(["compilation"]), //编译完成
      beforeEmitAssets: new SyncHook(["compilation"]),
      emit: new AsyncSeriesHook(["compilation"]), //发射,写入
      afterEmitAssets: new SyncHook(["compilation"]),
      done: new AsyncSeriesHook(["stats"]), //编译完成后会触发这个钩子执行
      reRun: new SyncHook(["compiler"]),
    };
  }
  run(callback = () => {}) {
    this.finallyCallback = callback;
    this.running(callback);
  }
  running(callback = () => {}) {
    console.log(
      "----------------------------------------------------------------------------------\r\n"
    );
    if (this.isStartCompile === true) {
      return;
    }
    //标识正在进行编译
    this.isStartCompile = true;
    //编译入口
    // console.log("Compiler run");
    //编译完成后的最终回调
    const finalCallback = (err, stats) => {
      callback(err, stats);
    };

    const onCompiled = (err, compilation) => {
      this.emitAssets(compilation, (err) => {
        //先收集编译信息 chunks entries modules files
        const stats = new Stats(compilation);
        //在触发done这个钩子的执行
        this.hooks.done.callAsync(stats, (err) => {
          console.log(
            "\r\n----------------------------------------------------------------------------------\r\n"
          );
          this.isStartCompile = false; //标识编译完成可以进行下一编译
          finalCallback(err, stats); //TODO
        });
      });
    };

    this.hooks.beforeRun.callAsync(this, (err) => {
      this.hooks.run.callAsync(this, (err) => {
        this.compile(onCompiled);
      });
    });
  }
  watch() {
    //讲配置项中的watch改为true
    this.options.watch = true;
  }
  emitAssets(compilation, callback) {
    // console.log("onCompiled");
    //编译chunk变成文件写入硬盘
    this.hooks.beforeEmitAssets.call(compilation);
    const emitFiles = (err) => {
      const assets = compilation.assets;
      const outputPath = this.options.output.path; // dist
      for (const file in assets) {
        const source = assets[file];
        //是输出文件的绝对路径
        const targetPath = path.posix.join(outputPath, file);
        this.outputFileSystem.writeFileSync(targetPath, source, "utf-8");
      }
      this.hooks.afterEmitAssets.call(compilation);
      callback();
    };
    //先触发emit的回调,在写插件的时候emit的钩子用的很多,因为他是我们修改输出内容的最后机会
    this.hooks.emit.callAsync(compilation, () => {
      //先创建输出目录dist ,在写入文件
      mkdirp(this.options.output.path).then(() => emitFiles());
    });
  }
  compile(onCompiled) {
    const params = this.newCompilationParams();
    this.hooks.beforeCompile.callAsync(params, (err) => {
      this.hooks.compile.call(params);
      const compilation = this.newCompilation(params);
      //触发make钩子的回调函数执行
      debugger;
      this.hooks.make.callAsync(compilation, (err) => {
        //触发代码块封装的方法
        compilation.seal((err) => {
          //触发编译完成之后的钩子
          this.hooks.afterCompile.callAsync(compilation, (err) => {
            //调用完成编译的函数
            onCompiled(null, compilation);
          });
        });
      });
    });
  }
  newCompilationParams() {
    const params = {
      //创建compilation之前已经创建了一个普通模块工厂
      normalModuleFactory: new NormalModuleFactory(),
    };
    return params;
  }
  createCompilation() {
    return new Compilation(this);
  }
  newCompilation(params) {
    const compilation = this.createCompilation();
    this.hooks.thisCompilation.call(compilation, params);
    this.hooks.compilation.call(compilation, params);
    return compilation;
  }
}

module.exports = Compiler;
