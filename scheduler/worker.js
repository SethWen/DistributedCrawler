/**
 * author: Shawn
 * time  : 2017/9/4 14:04
 * desc  :
 * update: Shawn 2017/9/4 14:04
 */


let amqp = require('amqplib/callback_api');
let feature = require('../feature/feature');


/**
 * 消费普通事件
 */
function startConsumer() {
    amqp.connect('amqp://localhost', function (err, conn) {
        conn.createChannel(function (err, ch) {
            var q = 'task_queue';

            ch.assertQueue(q, {durable: true});
            ch.prefetch(1); // 该 scheduler 一次只接收一个 task，oldTask ack 后，接收新的 task

            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
            ch.consume(q, function (msg) {
                var secs = msg.content.toString().length;

                console.log(" [x] Received %s", msg.content.toString(), '开始处理业务');
                setTimeout(function () {
                    console.log(" [x] Done");
                    ch.ack(msg); // 完成任务后 告诉 RabbitMQ 可以删除消息了。如果该 scheduler 挂掉，该消息会被自动分配到其它 scheduler
                }, secs * 1000);
            }, {noAck: false});
        });
    });
}


/**
 * 消费 Rpc 事件并返回结果
 */
function startRpcConsumer() {
    amqp.connect('amqp://localhost', function (err, conn) {
        conn.createChannel(function (err, ch) {
            let q = 'rpc_queue';

            ch.assertQueue(q, {durable: false});
            ch.prefetch(1);
            console.log(' [x] Awaiting RPC requests');
            ch.consume(q, function reply(msg) {
                let n = parseInt(msg.content.toString());

                console.log(" [.] fib(%d)", n);

                let r = feature.fibonacci(n);
                console.log(' [x] Done');

                ch.sendToQueue(msg.properties.replyTo,
                    Buffer.from(r.toString()),
                    {correlationId: msg.properties.correlationId});

                ch.ack(msg);
            });
        });
    });
}


// startConsumer();
startRpcConsumer();