function throttle(fn, interval, options = { leading: false }, callback) {
  let timer = null;
  let result;
  let { leading } = options;
  const returnFun = function (...args) {
    const context = null;
    if (leading) {
      result = fn.apply(context, args);
    } else {
      if (!timer) {
        timer = setTimeout(() => {
          result = fn.apply(context, args);
          callback && callback(result);
          timer = null;
        }, interval);
      }
    }
    if (leading) {
      leading = false;
      return result;
    }
  };

  return returnFun;
}

module.exports = throttle;
