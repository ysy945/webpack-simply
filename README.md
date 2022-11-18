#
  这是一个简易版的webpack库
```
 //你可以这样使用他
 const {webpack} = require("webpack-ysy");
 const webpackOptions = require("./webpack.config.js");

 const compiler = webpack(webpackOptions);
 compiler.run((err, stats) => {
    // console.log(stats.toJson());
 });
```

```
 //监视的方式开启
 const {webpack} = require('webpack-ysy')
 const options = require('./webpack.config.js)
 const compiler = webpack(options)
 compiler.watch()
```
# webpack的一些配置
```
const path = require("path");
const {HtmlWebpackPlugin} = require("webpack-ysy");

module.exports = {
  context: process.cwd(),
  mode: "development",//"production"会压缩
  devtool: false,
  entry: "./test/index.js",
  clear: true, //是否在打包的时候清空目标文件夹在写入
  watch: true, //是否开启监视模式
  //开启服务器
  devServer: {
    port: 8080,
    open: true,
    static: {
      directory: path.resolve(__dirname, "./test"),
    },
  },
  watchOptions: {
    poll: 10,
    aggregateTimeout: 0,
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.js",
  },
  module: {
    rules: [
      {
        test: /\.less$/,
        use: ["style-loader", "less-loader"],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      //template: "./public/index.html",可以不指定路径
      //outputName: "test.html",默认值'index.html'
    }),
  ],
};

```