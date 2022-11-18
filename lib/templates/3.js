function add(...args) {
  return args.reduce((pre, cur) => pre + cur);
}

function curring(fn, length) {
  const args = [];
  const _length = length;
  //每次调用需要初始化长度和args删除之前保留得参数
  function init() {
    //重置长度
    length = _length;
    //初始化
    args.length = 0;
  }
  function returnValue(fn, rest) {
    //可添加其他逻辑(面向切面编程)
    const result = fn.apply(null, rest);
    init();
    return result;
  }
  function recursion(...rest) {
    //多覆盖一层函数(可添加其他逻辑)
    return callback.apply(null, rest);
  }
  const callback = function (...rest) {
    args.push(...rest);
    if (--length === 0) {
      return returnValue(fn, args);
    } else {
      return recursion;
    }
  };
  return callback;
}

class Curring {
  constructor(name) {
    this._name = name;
  }
  init(fn, _length, length, args) {
    this.length = length || this.length;
    this._length = _length || this._length;
    this._args = args || this._args;
    this._fn = fn || this._fn;
  }
  returnValue(fn, rest) {
    //可添加其他逻辑(面向切面编程)
    const result = fn.apply(this, rest);
    this.init(undefined, this._length, this._length, []);
    return result;
  }
  recursion(...rest) {
    //多覆盖一层函数(可添加其他逻辑)
    return this.callback.apply(this, rest);
  }
  callback(...rest) {
    this._args.push(...rest);
    if (--this.length === 0) {
      return this.returnValue(this._fn, this._args);
    } else {
      return this.recursion.bind(this);
    }
  }
  create(fn, length) {
    this.init(fn, length, length, []);
    return this.callback.bind(this);
  }
}

class CurringFactory {
  create(name, fn, length) {
    return new Curring(name).create(fn, length);
  }
}

const curringAdd = curring(add, 3);
console.log(curringAdd(1, 2, 3)(4)(2));
console.log(curringAdd(1)(10)(8));
const classCurringAdd = new CurringFactory().create("加法", add, 3);
console.log(classCurringAdd(1, 2, 3)(4)(2));
console.log(classCurringAdd(1)(10)(8));
