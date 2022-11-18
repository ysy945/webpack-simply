const express = require("express");
const chalk = require("chalk");
const { existsSync, readFileSync } = require("fs");
const { isAbsolute, resolve } = require("path");
const {
  executeInNumber,
  open: openBrowser,
  executeUntil,
} = require("../utils");
const mime = require("mime");
const http = require("http");
const io = require("socket.io");

class DevServerPlugin {
  apply(compiler) {
    //如果没有watch选项 必须要配置watch选项为true才可以开启服务器
    if (compiler.options.watch !== true) {
      throw new Error(
        `If you want to use 'devServer',please change 'watch:true' in options`
      );
    }
    const doneCallback = (stats, callback) => {
      const { devServer: devServerOptions, output, context } = compiler.options;
      let outputPath = output.path;
      if (!isAbsolute(outputPath)) {
        outputPath = resolve(context, outputPath);
      }
      const {
        port = 8080,
        open = false,
        static: _static = {},
      } = devServerOptions;
      let { directory = "" } = _static;
      const devServer = new DevServer({
        port, //指定服务器端口号
        open, //是否打包完成后自动打开浏览器
        directory, //静态文件路径
        outputPath, //打包文件的输出路径
        compiler, //webpack的编译对象
      });
      //开启express服务器
      devServer.listen(callback);
      compiler.devServer = devServer;
    };

    compiler.hooks.done.tapAsync(
      "DevServerPlugin",
      executeInNumber(
        { times: 1, isCallbackExecute: true, callbackPos: 1 },
        doneCallback
      )
    );

    // 第一次不执行 不刷新浏览器 以后才执行
    compiler.hooks.done.tapAsync(
      "DevServerPlugin",
      executeUntil(
        { times: 1, isCallbackExecute: true, callbackPos: 1 },
        function (stats, callback) {
          compiler.devServer.sockets.forEach((socket) => {
            // 完成编译 告诉客户端刷新浏览器
            socket.emit("compiled");
          });
          callback();
        }
      )
    );
  }
}

class DevServer {
  constructor(options) {
    const { port, open, directory, outputPath, compiler } = options;
    this.port = port;
    this.open = open; //编译完成后是否自动打开浏览器
    this.directory = directory; //静态资源目录
    this.outputPath = outputPath; //webpack打包输出的目录
    this.compiler = compiler; //webpack编译对象
    this.sockets = []; //存放所有的socket客户端
    this.app = express(); //路由中间件
    this.createHttpServer(); //生成http服务器并插入express中间件
    this.init(); //安装中间件等
    this.createSocketServer(); //创建socket服务器
  }
  init() {
    const app = this.app;
    const htmlWebpackPluginOutputName =
      this.compiler.HtmlWebpackPlugin.outputName;
    const { directory } = this;
    const outputPath = this.outputPath;
    app.use(function (req, res, next) {
      //返回目录下的index.html文件
      if (req.url === "" || req.url === "/") {
        const currentPath = resolve(
          outputPath,
          `./${htmlWebpackPluginOutputName}`
        );
        const html = readFileSync(currentPath, "utf-8");
        res.setHeader("content-type", mime.getType(currentPath));
        res.send(html);
      }
      //如果是请求图标
      else if (req.url === "/favicon.ico") {
        const currentPath = resolve(outputPath, "./favicon.ico");
        if (existsSync(currentPath)) {
          res.setHeader("content-type", mime.getType(currentPath));
          res.send(readFileSync(currentPath, "utf-8"));
        } else {
          res.send(null);
        }
      } else if (req.url === "/@websocket.js") {
        const str = `
           const socket = io();
           socket.on('compiled',()=>{
               window.location.reload()
           })
        `;
        res.setHeader("content-type", "application/javascript");
        res.send(str);
      }
      // 否则是请求文件
      else {
        const currentPath = resolve(outputPath, `.${req.url}`);
        if (existsSync(currentPath)) {
          const content = readFileSync(currentPath, "utf-8");
          res.setHeader("content-type", mime.getType(currentPath));
          res.send(content);
        } else {
          next();
        }
      }
    });
    if (!directory) return;
    if (directory !== "" && !isAbsolute(directory)) {
      directory = resolve(context, directory);
    }
    //如果路径正确且有这个文件夹则使用暴露静态资源文件
    if (existsSync(directory)) {
      app.use(express.static(directory));
    }
    //如果没有这个文件则报错
    else {
      throw new Error(
        `The options 'devServer->static-> 'directory'' is not right. can not find file or directory in ${directory}`
      );
    }
  }
  createHttpServer() {
    this.server = http.createServer(this.app);
  }
  listen(callback = () => {}) {
    this.server.listen(this.port, () => {
      console.log(chalk.underline.blue(`express服务器在${this.port}上运行了.`));
      if (this.open) {
        openBrowser({ port: this.port, browser: "chrome" }, function (url) {
          console.log(chalk.underline.blue(`浏览器在 '${url}' 上打开了.`));
          callback();
        });
      }
      !this.open && callback();
    });
  }
  createSocketServer() {
    const webSocketServer = io(this.server);
    webSocketServer.on("connection", (socket) => {
      this.sockets.push(socket); //推入客服端socket
      //服务器断开则 去掉这个socket
      socket.on("disconnect", () => {
        const index = this.sockets.indexOf(socket);
        this.sockets.splice(index, 1);
      });
    });
  }
}

module.exports = DevServerPlugin;
