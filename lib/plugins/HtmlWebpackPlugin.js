const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const { parser } = require("posthtml-parser");
const { render } = require("posthtml-render");

class HtmlWebpackPlugin {
  constructor({ template = "", outputName = "index.html" }) {
    this.template = template;
    this.outputName = outputName;
    this.templatePath = "";
    this.htmlTree = null;
  }
  apply(compiler) {
    compiler.HtmlWebpackPlugin = this;
    const devServerOptions = compiler.options.devServer;
    const addSocketJs = [];
    //有devServer配置则需要添加socket.io 以及 websocket.js脚本
    if (typeof devServerOptions === "object") {
      addSocketJs.push(
        this.createScript("/socket.io/socket.io.js"),
        this.createScript("/@websocket.js")
      );
    }
    const context = compiler.context;
    //获取模板路径
    const templatePath = path.resolve(context, this.template);
    try {
      this.htmlTree = parser(fs.readFileSync(templatePath).toString());
    } catch (err) {
      console.log(
        chalk.yellow(
          `Warm: We did not find template in '${this.templatePath}' please check options 'template'.`
        )
      );
      this.htmlTree = parser(`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Document</title>
        </head>
        <body></body>
      </html>
      `);
    }
    const htmlTree = this.htmlTree;
    htmlTree.forEach((node) => {
      if (typeof node === "object") {
        node.content.forEach((child) => {
          if (child.tag === "body") {
            compiler.hooks.make.tapAsync(
              "HtmlWebpackPlugin",
              (compilation, callback) => {
                compilation.hooks.beforeChangeAssets.tap(
                  "HtmlWebpackPlugin",
                  (compilation, chunk, filename) => {
                    if (!child.content) child.content = [];
                    if (chunk.entryModule.async === false) {
                      push.call(this, filename, addSocketJs);
                    }
                    if (compilation.commons.length > 0) {
                      push.call(this, "/commons.js");
                    }
                    if (compilation.vendors.length > 0) {
                      push.call(this, "/vendors.js");
                    }
                    function push(type, other = []) {
                      let boolean = true;
                      child.content.forEach((content) => {
                        if (
                          typeof content === "object" &&
                          content.attrs.src === type
                        ) {
                          boolean = false;
                        }
                      });
                      if (boolean) {
                        child.content.push(this.createScript(type), ...other);
                      }
                      return boolean;
                    }

                    this._source = render(htmlTree);
                  }
                );
                callback();
              }
            );
          }
        });
      }
    });
    compiler.hooks.beforeEmitAssets.tap("HtmlWebpackPlugin", (compilation) => {
      compilation.assets[this.outputName] = this._source;
    });
  }
  createScript(src) {
    return {
      tag: "script",
      attrs: {
        src,
      },
    };
  }
}

module.exports = HtmlWebpackPlugin;
