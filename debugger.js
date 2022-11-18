const webpack = require("./lib/webpack");
const webpackOptions = require("./webpack.config");

const compiler = webpack(webpackOptions);
compiler.run((err, stats) => {
  // console.log(stats.toJson());
});
