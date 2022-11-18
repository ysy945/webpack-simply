const QUEUED_STATE = 0; //已经入队 等待执行
const PROCESSING_STATE = 1; //处理中
const DONE_STATE = 2; //处理完成

/**
 * 实现一个异步并发的控制队列类
 * 1.ArrayQueue是一个类 用于存储操作异步的函数
 *  (1).包含一个_list属性用于存放异步函数
 *  (2).有一个enqueue(入队列的方法)
 *  (3).有一个dequeue(出队列的方法)
 */
function checkType(value) {
  const types = {
    "[object Object]": "object",
    "[object Array]": "array",
    "[object Null]": "null",
    "[object Undefined]": "undefined",
    "[object Function]": "function",
    "[object Number]": "number",
    "[object Boolean]": "boolean",
  };
  return types[Object.prototype.toString.call(value)];
}

function createError(data) {
  return new Error(data);
}

class ArrayQueue {
  constructor() {
    this._list = [];
  }
  enqueue(item) {
    if (checkType(item) !== "function") {
      createError("Function 'enqueue' arguments should be function!");
    }
    this._list.push(item);
    return true;
  }
  dequeue() {
    return this._list.shift(); //移除并返回数组中的第一个元素
  }
}

class AsyncQueueEntry {
  constructor(item, callback) {
    this.item = item;
    this.callback = callback;
    this.state = QUEUED_STATE;
  }
}

class AsyncQueue {
  constructor({ name, parallelism, parent, processor, getKey }) {
    this._name = name; //队列的名字
    this._parallelism = parallelism; //并发数
    this._processor = processor; //针对队列中的每个条目执行什么操作
    this._getKey = getKey; //函数,返回以个key用来唯一标识每个元素
    this._entries = new Map(); //条目map key:Map (entry)
    this._queued = new ArrayQueue(); //存放的队列
    this._activeTasks = 0; //档期那的执行任务数
    this._willEnsureProcessing = false; //是否将要开始处理
  }
  add(item, callback) {
    const key = this._getKey(item); //获取这个条目对应的key
    let entry = this._entries.get(key); //获取这个key对应的老的条目
    if (!entry) {
      entry = new AsyncQueueEntry(item, callback); //创建一个新的条目
    }
    this._entries.set(key, entry); //放到_entries
    this._queued.enqueue(entry); //把这个新条目放入队列
    if (this._willEnsureProcessing === false) {
      this._willEnsureProcessing = true;
      setImmediate(this._ensureProcessing.bind(this)); //开始处理任务
    }
  }
  _ensureProcessing() {
    debugger;
    while (this._activeTasks < this._parallelism) {
      const entry = this._queued.dequeue(); //出队 先入先出
      if (entry === undefined) break;
      entry.state = PROCESSING_STATE;
      this._activeTasks++;
      this._startProcessing(entry);
    }
    this._willEnsureProcessing = false;
  }
  _startProcessing(entry) {
    this._processor(entry.item, (e, r) => {
      this._handleResult(entry, e, r);
    });
  }
  _handleResult(entry, err, result) {
    const callback = entry.callback;
    entry.state = DONE_STATE; //把条目的状态设置为已经完成
    entry.callback = undefined; //把callback
    entry.result = result; //把结果复制给entry
    entry.error = err; //把错误赋值给entry
    callback(err, result);
    this._activeTasks--;
    if (this._willEnsureProcessing === false) {
      this._willEnsureProcessing = true;
      setImmediate(this._ensureProcessing.bind(this)); //开始处理任务
    }
  }
}

function processor(item, callback) {
  setTimeout(() => {
    // console.log(item);
    callback();
  }, 1000);
}

// const getKey = (item) => item.key;

// const asyncQueue = new AsyncQueue({
// name: "异步队列",
// parallelism: 3,
// processor,
// getKey,
// });
// const time = Date.now();
// asyncQueue.add({ key: "module1" }, () => {
// console.log(Date.now() - time);
// });
// asyncQueue.add({ key: "module2" }, () => {
// console.log(Date.now() - time);
// });
// asyncQueue.add({ key: "module3" }, () => {
// console.log(Date.now() - time);
// });
// asyncQueue.add({ key: "module4" }, () => {
// console.log(Date.now() - time);
// });

module.exports = AsyncQueue;
