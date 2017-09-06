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
    // task.newTask(queryData.num)

});


/**
 * Rpc 任务 Api
 */
app.get('/newRpcTask', function (req, res) {
    let queryData = req.query;
    console.log('queryData = ', queryData);

    task.newRpcTask(queryData.num, function (result) {
        res.send('fibonacci = ' + result);
    });
});

app.listen(3000);