/**
 * author: Shawn
 * time  : 2017/9/4 14:04
 * desc  :
 * update: Shawn 2017/9/4 14:04
 */


let express = require('express');
let app = express();
let rabbit = require('../scheduler/rabbit');
let task = require('../scheduler/task');

/**
 * 创建 RabbitMQ 连接
 */
rabbit.createMqConnection();


/**
 * 普通任务 Api
 */
app.get('/newTask', function (req, res) {
    let queryData = req.query;
    console.log('queryData = ', queryData);
    res.send('push new task');
    task.newTask(queryData.num)
});


/**
 * Rpc 任务 Api
 */
app.get('/newRpcTask', function (req, res) {
    let queryData = req.query;
    console.log('queryData = ', queryData);

    // 在将数据传递至 RabbitMQ 层时，要考虑好传递的格式，RabbitMQ 层不要对数据进行处理，最终交给 Feature 时再处理
    task.newRpcTask(queryData.num, generateUuid(), function (result) {
        res.send('fibonacci = ' + result);
    });
});

app.listen(3000);


function generateUuid() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}