function executeInNumber(
  { times = 0, isCallbackExecute = false, callbackPos = 0 },
  callback
) {
  let _times = times;
  const _isCallbackExecute = isCallbackExecute;
  const _callbackPos = callbackPos;
  return function (...args) {
    if (_isCallbackExecute && _times <= 0) {
      args[_callbackPos]();
    }
    if (_times-- > 0) {
      return callback(...args);
    }
  };
}
/*test*/
// function log() {
// console.log(111);
// }
// const oneTimesLog = executeInNumber(1, log);
// oneTimesLog();
// oneTimesLog();

module.exports = executeInNumber;
