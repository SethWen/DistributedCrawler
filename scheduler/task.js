/**
 * author: Shawn
 * time  : 2017/9/4 14:04
 * desc  :
 * update: Shawn 2017/9/4 14:04
 */


let rabbit = require('./rabbit');
let {FEATURE_EXCHANGE, FIBONACCI_QUEUE, FEATURE_BINDER} = require('./mqConstant');


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
 * 建议不要在此处处理 Api 传入的数据，也不要处理 Worker 返回的数据。数据最好在架构的两端处理，即交给 Api
 * 和 Feature 处理，这样可以保证 RabbitMQ 的通用性，数据只与 Api 和 Feature 两层相关
 *
 * @param startingData
 * @param uuid
 * @param callback
 */
function newRpcTask(startingData, uuid, callback) {
    rabbit.getMqConnection().createChannel(function (err, ch) {
        if (err) return handleError(err);

        ch.assertQueue('', {exclusive: true}, function (err, q) {
            if (err) return handleError(err);

            let corr = uuid;
            console.log('Starting data: %s', startingData.toString());

            ch.consume(q.queue, function (msg) {
                if (msg.properties.correlationId === corr) {
                    console.log('Return data: %s', msg.content.toString());
                    // Feature 返回的数据不要处理，交回给 Api 处理
                    callback(msg.content.toString())
                }
            }, {noAck: true});

            ch.sendToQueue(FIBONACCI_QUEUE, Buffer.from(startingData.toString()), {correlationId: corr, replyTo: q.queue});
        });
    });
}


/***
 * 异常处理
 *
 * @param err
 */
function handleError(err) {
    console.log('Error ---> ', err);
}


module.exports = {
    newTask: newTask,
    newRpcTask: newRpcTask,
};


