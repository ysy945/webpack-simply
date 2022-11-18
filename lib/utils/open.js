const cp = require("child_process");

/**
 * 打开浏览器
 * @param {} url  浏览器地址
 */
function open(options, callback) {
  const {
    port = undefined,
    url = "http://localhost",
    query = {},
    path = "",
    browser = "chrome",
  } = options;
  let cmd = ""; //开启浏览器的指令
  const queryString =
    "?" +
    Object.keys(query)
      .map((key) => {
        return `${key}=${query[key]}`;
      })
      .join("&");
  //结合整个url
  const openPath = `${url}${port ? ":" + port : ""}${path}${
    queryString.length > 1 ? queryString : ""
  }`;

  //兼容浏览器
  switch (process.platform) {
    case "win32":
      cmd = "start";
      break;
    case "linux":
      cmd = "xdg-open";
      break;
    case "darwin":
      cmd = "open";
      break;
  }
  cp.exec(`${cmd} ${browser} ${openPath}`, function (err, stdout, stderr) {
    if (err) {
      console.log(
        chalk.red(
          `There is no '${browser}'browser in your computer.Please install,starting default browser.`
        )
      );
      cp.exec(`${cmd} ${openPath}`, (err) => {
        if (err) throw new Error("Open browser failed! err:\r\n" + err);
        else callback(openPath);
      });
    } else {
      callback(openPath);
    }
  });
}

// open({
// port: 3000,
// });

module.exports = open;
