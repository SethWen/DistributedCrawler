/**
 * author: Shawn
 * time  : 2017/9/4 14:04
 * desc  : 消息队列事件消费基类
 * update: Shawn 2017/9/4 14:04
 */


let amqp = require('amqplib/callback_api');


class BaseWorker {
    constructor() {
        this.queueName = '';
    }


    /**
     * 消费普通事件
     */
    startConsumer() {
        amqp.connect('amqp://guest:guest@172.16.10.63:5672', function (err, conn) {
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
     * 业务处理接口，子类实现该接口即可
     *
     * @param msg
     * @param ch
     */
    doFeature(msg, ch) {
    }


    /**
     * 完成业务后删除消息
     *
     * @param msg
     * @param ch
     * @param result
     */
    ackMsg(msg, ch, result) {
        ch.sendToQueue(msg.properties.replyTo,
            Buffer.from(result.toString()),
            {correlationId: msg.properties.correlationId});

        ch.ack(msg);
    }


    /**
     * 消费 Rpc 事件并返回结果
     */
    startRpcConsumer() {
        amqp.connect('amqp://guest:guest@172.16.10.63:5672', (err, conn) => {
            conn.createChannel((err, ch) => {

                ch.assertQueue(this.queueName, {durable: false});
                ch.prefetch(1);
                console.log(' [x] Awaiting RPC requests');
                ch.consume(this.queueName, (msg) => {
                    this.doFeature(msg, ch);
                });
            });
        });
    }

}


module.exports = BaseWorker;