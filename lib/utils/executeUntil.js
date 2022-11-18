/**
 * 第几次之后才开始执行
 * @param {} times
 * @param {*} func
 */
function executeUntil(
  { times = 0, isCallbackExecute = false, callbackPos = 0 },
  func
) {
  let _times = times;
  const _isCallbackExecute = isCallbackExecute;
  const _callbackPos = callbackPos;
  return function (...args) {
    if (_times > 0 && _isCallbackExecute === true) {
      args[_callbackPos]();
    }
    if (_times-- <= 0) {
      func(...args);
    }
  };
}
/* 
test:
function log() {
  console.log(111);
}

executeLog = executeUntil(2, log);
executeLog();
executeLog();
executeLog();
*/
module.exports = executeUntil;
