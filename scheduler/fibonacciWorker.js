/**
 * author: Shawn
 * time  : 2017/9/7 11:14
 * desc  : Fibonacci 事件消费类
 * update: Shawn 2017/9/7 11:14
 */

let BaseWorker = require('./baseWorker');
let feature = require('../feature/feature');
let {FIBONACCI_QUEUE} = require('./mqConstant');


class FibonacciWorker extends BaseWorker {

    constructor() {
        super();
        this.queueName = FIBONACCI_QUEUE;
    }


    doFeature(msg, ch) {
        // 同步返回代码示例
        // let n = parseInt(msg.content.toString());
        // console.log(" [.] fib(%d)", n);
        // // 业务逻辑核心接口
        // let result = feature.fibonacci(n);
        // console.log(' [x] Done');
        // this.ackMsg(msg, ch, result)

        // 异步返回代码示例
        let n = parseInt(msg.content.toString());
        console.log(" [.] fib(%d)", n);
        // 业务逻辑核心接口
        feature.fibonacciAsync(n, (result) => {
            console.log(' [x] Async Done');
            this.ackMsg(msg, ch, result);
        });
    }
}


/**
 * 使用该 Worker 只需要 外部 new 出实例，然后调用 startRpcConsumer() 即可
 * @type {FibonacciWorker}
 */
let fibWorker = new FibonacciWorker();
fibWorker.startRpcConsumer();

