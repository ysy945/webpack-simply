const { watch: watchSystem } = require("watch-ysy");
const { throttle } = require("../utils");

class WatchFilePlugin {
  apply(compiler) {
    const { watch, watchOptions = {} } = compiler.options;
    const {
      aggregateTimeout = 1000, //!用于增加延迟在重新构建之前
      poll = 100, //!每100ms检查一次变动
    } = watchOptions;
    const allWatchFile = new Set();
    let _cancel = null;
    if (watch) {
      compiler.hooks.afterCompile.tapAsync(
        "WatchFilePlugin",
        (compilation, callback) => {
          compilation.modules.forEach((module) => {
            allWatchFile.add(module._resource);
          });
          compilation.entries.forEach((entry) => {
            allWatchFile.add(entry._resource);
          });
          //在这里重新监听
          const watchCallback = throttle(function (data) {
            // 重新执行run函数(重新编译);
            compiler.hooks.reRun.call(compiler);
            compiler.running(compiler.finallyCallback);
          }, aggregateTimeout);
          //如果文件存在的话 则启动watch去监视文件
          watchSystem(
            [...allWatchFile],
            watchCallback,
            { poll: 1000 / poll, monitorTimeChange: true },
            function (cancel) {
              _cancel = cancel;
              callback();
            }
          );
        }
      );
      compiler.hooks.reRun.tap("WatchFilePlugin", function () {
        allWatchFile.clear();
        _cancel();
        // _cancel = null;
      });
    }
  }
}
module.exports = WatchFilePlugin;
