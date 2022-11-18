const webpack = require("./webpack");
const plugins = require("./plugins");
const loaders = require("./loaders");
module.exports = {
  webpack,
  ...plugins,
  ...loaders,
};
