const fs = require("fs");
const path = require("path");
class ClearOutputFilePlugin {
  apply(compiler) {
    compiler.hooks.beforeEmitAssets.tap(
      "ClearOutputFilePlugin",
      function (compilation) {
        let outputPath;
        const {
          options: { output, clear },
          context,
        } = compiler;
        //如果是一个string则就是output
        if (typeof output === "string") {
          outputPath = output;
        }
        //如果是一个对象就获取path属性为outputPath
        else if (typeof output === "object") {
          outputPath = output.path;
        }
        //获取绝对路径
        outputPath = path.resolve(context, outputPath);
        function recursiveDeletionFile(removeFilePath, callback) {
          const files = fs.readdirSync(removeFilePath);
          files.forEach((filename) => {
            const filePath = removeFilePath + "/" + filename;
            //获取文件状态信息
            const stats = fs.statSync(filePath);
            //如果是一个文件直接删除
            if (stats.isFile()) {
              fs.unlinkSync(filePath);
            }
            //如果是一个文件夹
            else if (stats.isDirectory()) {
              //如果是一个空文件夹则删除
              const nextCallback = function () {
                fs.rmdirSync(filePath);
              };
              recursiveDeletionFile(filePath, nextCallback);
            }
          });
          callback && callback();
        }
        if (fs.existsSync(outputPath)) {
          recursiveDeletionFile(outputPath);
        }
      }
    );
  }
}

module.exports = ClearOutputFilePlugin;
