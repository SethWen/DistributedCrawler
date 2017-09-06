/**
 * author: Shawn
 * time  : 2017/9/6 14:58
 * desc  :
 * update: Shawn 2017/9/6 14:58
 */


let amqp = require('amqplib/callback_api');


let mqConn;


/**
 * 创建 RabbitMQ 连接
 */
function createMqConnection() {
    amqp.connect('amqp://localhost', function (err, conn) {
        mqConn = conn;
        console.log('RabbitMQ 连接已建立');
    });
}


/**
 * 获取 RabbitMQ 连接
 *
 * @returns {*}
 */
function getMqConnection() {
    return mqConn;
}


module.exports = {
    createMqConnection: createMqConnection,
    getMqConnection: getMqConnection,
};