const chalk = require("chalk");

class OutputCompilationDataPlugin {
  apply(compiler) {
    compiler.hooks.afterEmitAssets.tap(
      "OutputCompilationDataPlugin",
      function (compilation) {
        const { log } = console;
        // console.log(new Date().getTime(), compilation.startCompilationTime);
        log(
          chalk.green("本次生成文件用的时为:") +
            chalk.red("'") +
            chalk.red(
              new Date().getTime() - compilation.startCompilationTime + "ms"
            ) +
            chalk.red("'")
        );
        log(chalk.underline.blue("产出的文件有:"));
        Object.keys(compilation.assets).forEach((key) => {
          log(
            `${chalk.green("'" + key + "'")} ${chalk.red(
              ": '" +
                Buffer.byteLength(compilation.assets[key], "utf-8") / 1000 +
                "kiBs'"
            )}`
          );
        });
        // log(compilation);
      }
    );
  }
}

module.exports = OutputCompilationDataPlugin;
