/**
 * author: Shawn
 * time  : 2017/9/4 14:04
 * desc  :
 * update: Shawn 2017/9/4 14:04
 */


let rabbit = require('./rabbit');


/**
 * 添加普通任务
 *
 * @param msg
 */
function newTask(msg) {
    rabbit.getMqConnection().createChannel(function (err, ch) {
        let q = 'task_queue';
        ch.assertQueue(q, {durable: true}); // 防止 RabbitMQ 挂掉后 消息丢失，Publisher 和 Consumer 配置 durable 选项
        ch.sendToQueue(q, Buffer.from(msg), {persistent: true}); // 提醒 RabbitMQ 将消息保存到 disk
        console.log(" [x] Sent '%s'", msg);
    });
}


/**
 * 添加一个 Rpc 任务
 *
 * @param numString
 * @param callback
 */
function newRpcTask(numString, callback) {
    rabbit.getMqConnection().createChannel(function (err, ch) {
        ch.assertQueue('', {exclusive: true}, function (err, q) {
            var corr = generateUuid();
            var num = parseInt(numString);

            console.log(' [x] Requesting fib(%d)', num);

            ch.consume(q.queue, function (msg) {
                if (msg.properties.correlationId === corr) {
                    console.log(' [.] Got %s', msg.content.toString());
                    callback(msg.content.toString())
                }
            }, {noAck: true});

            ch.sendToQueue('rpc_queue',
                Buffer.from(num.toString()),
                {correlationId: corr, replyTo: q.queue});
        });
    });
}


function generateUuid() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}


module.exports = {
    newTask: newTask,
    newRpcTask: newRpcTask,
};


