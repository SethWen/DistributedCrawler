# Node.js 基于 RabbitMQ 的分布式爬虫框架
本文是基于 Node.js 和 [RabbitMQ](https://www.rabbitmq.com/) 设计的分布式爬虫框架，适用于每次爬取数据量不大，但是高并发的爬虫。其中该项目中还用到了 [PM2](https://github.com/Unitech/pm2)(启动 server 及热更新，还能监控程序运行数据)和 [Express](https://github.com/expressjs/express)

现在的需求是，用户向我们的 Api Server 发送请求，然后我们的 Api Server 不会真正的去爬取数据，而是将这个任务放到队列之中，然后然后真正的 Crawler Server 去爬取数据，最后将数据返回给 Api Server，相应用户的请求。所以架构图是这个样子的：

![structure](https://i.imgur.com/aeXGOP8.png)

接下来就是撸码了，同时献上[项目传送门](https://github.com/SethWen/DistributedCrawler)。

### 1. 连接 RabbitMQ 服务
首先你需要配置一台 RabbitMQ Server ，需要安装 Erlang 环境和 RabbitMQ，以为 RabbitMQ具是用 Erlang 写的。具体安装过程可以[RabbitMQ官网](https://www.rabbitmq.com/download.html)。我是在 Windows 上配置的，很简单，安装完成后，RabbitMQ 会开机自启动。 
     
Node.js 中我们使用 RabbitMQ，借助 [amqplib](https://github.com/squaremo/amqp.node/)，这里面关于 RabbitMQ 的所有使用方式，都有示例代码，而且由于 RabbitMQ 只用作中间的任务分发，所以，代码几乎不用改动，当然为了保证 RabbitMQ 的通用性，这部分代码我也不建议大家更改。  

下面是连接 RabbitMQ 服务的代码，需要注意以下几点：

1. 代码中我们统一使用 amqplib 里的 callback_api，amqplib 下也有 promise 的 api，但是官方示例中，即便使用了 promise api，还是有好几层的嵌套，不是很好理解，所以不如使用  callback_api，因为不涉及到真正业务逻辑，都是固定的代码，也无所谓。
2. RabbitMQ 的连接地址写全的话，格式如下：`amqp://user:password@host:port`，比如： `amqp://guest:guest@192.168.10.63:5672` ，其中默认用户名好密码都是 guest，默认端口是 5672。如果你本机调试的话，那么直接写成 `amqp://localhost`  就 OK 了。
3. 如果你要配置集群可连接的话，那么，你需要更改配置文件。并重启 RabbitMQ 服务。 Windows 下配置文件的路径为：`C:\Users\user\AppData\Roaming\RabbitMQ\rabbitmq.config`，默认请况下，里面的内容是空的，你需要什么配置，把同级目录下的 `rabbitmq.config.example` 中的内容拷过去就好了，记得打开注释，笔者当时搞的时候，因为司机不够老，没反应过来 `%%` 是注释，搞了好几次配置文件，重启了后几次服务才恍然大悟，囧死了。对了，重点的，你只需要把本机 ip 和 port 添加到 tcp_listeners 中就好了，然后重启 RabbitMQ 服务，这样，之后你的集群就可以连接了。

		// rabbitmq.config
		{tcp_listeners, [{"127.0.0.1", 5672},
						 {"192.168.10.63", 5672}, %% 你添加的一行
		                  {"::1",       5672}]}


		// rabbit.js
		let amqp = require('amqplib/callback_api');
	
		let mqConn;
		
		/**
		 * 创建 RabbitMQ 连接
		 */
		function createMqConnection() {
		    amqp.connect('amqp://localhost', function (err, conn) {
		        if (err) {
		            console.log('error --> ', err);
		        } else {
		            mqConn = conn;
		            console.log('RabbitMQ 连接已建立');
		        }
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


### 2. 将任务添加到队列
因为在用户做出请求后，最终还要将数据返回给用户，所以，我们需要使用 RabbitMQ 的 RPC 模式(简单的理解就是，能接收任务，还能将任务的执行结果返回去)。下面直接撸码了：

		/**
		 * 添加一个 Rpc 任务
		 *
		 * 建议不要在此处处理 Api 传入的数据，也不要处理 Worker 返回的数据。数据最好在架构的两端处理，即交给 Api
		 * 和 Feature 处理，这样可以保证 RabbitMQ 的通用性，数据只与 Api 和 Feature 两层相关
		 *
		 * @param startingData
		 * @param uuid 任务号，用于区分返回的数据是哪个任务
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


### 3. Worker 从队列拿任务，并执行返回
这里我封装了一个 BaseWorker 的基类。其实现类只需要重新 `doFeature()`，实现相关的业务逻辑。然后调用 `startRpcConsumer()` 是从队列获取任务后并再调用`doFeature()` ，完成相关操作。具体使用方式可以参见项目中的 fibonacciWorker.js，这是一个斐波那契计算的逻辑

		// baseWorker.js
		let amqp = require('amqplib/callback_api');


		class BaseWorker {
		    constructor() {
		        this.queueName = '';
		    }
		
		
		    /**
		     * 消费 Rpc 事件并返回结果
		     *
		     * 建议不要在此处处理 Api 传入的数据，也不要处理 Worker 返回的数据。数据最好在架构的两端处理，即交给 Api
		     * 和 Feature 处理，这样可以保证 RabbitMQ 的通用性，数据只与 Api 和 Feature 两层相关
		     */
		    startRpcConsumer() {
		        amqp.connect('amqp://localhost', (err, conn) => {
		            if (err) return BaseWorker.handleError(err);
		
		            conn.createChannel((err, ch) => {
		                if (err) return BaseWorker.handleError(err);
		
		                ch.assertQueue(this.queueName, {durable: false});
		                ch.prefetch(1);
		                console.log(' [x] Awaiting RPC requests');
		                ch.consume(this.queueName, (msg) => {
		                    if (msg !== null) {
		                        this.doFeature(msg, ch);
		                    } else {
		                        console.log('msg is null.');
		                    }
		                });
		            });
		        });
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
		     * 错误处理
		     *
		     * @param err
		     */
		    static handleError(err) {
		        console.log('Error --> ', err);
		    }
		
		
		    /**
		     * 业务处理接口，子类实现该接口即可
		     *
		     * @param msg
		     * @param ch
		     */
		    doFeature(msg, ch) {
		    }
		}

### 4. 服务器
我是用 Express 写的服务器，当然你也可以根据自己的需求随意挑选，比如 [Restify](https://github.com/restify/node-restify) 等。在启动服务器时，要先连接 RabbitMQ。然后在 Api 中，不是直接操作业务逻辑，而是将请求当做一个任务，发送到 RabbitMQ 的队列，例如本利中的 `task.newRpcTask()`， 然后在回调中拿到最终的结果，返回给用户。

		// server.js
		let express = require('express');
		let app = express();
		let rabbit = require('../scheduler/rabbit');
		let task = require('../scheduler/task');
		
		/**
		 * 创建 RabbitMQ 连接
		 */
		rabbit.createMqConnection();
		
		
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

### 最后，上演示结果了
RabbitMQ 只需要在 RabbitMQ 服务器安装，其它设备通过 amqp 协议连接即可。我在演示的时候，Api Server 和 Rabbit Server 安装在我的 Windows 上，而另外三台 CentOS 作为 Worker Server 使用。 好的，终于要发车了：

0. 如果你的 Rabbit Server 没有启动需要先启动，我在 Windows 上已经开机自启，不在赘述
1. 启动 Api Server： `node server.js`(如果使用 PM2启动命令是 `pm2 start server.js`)
2. 在所有 Worker Server 上启动 worker： `node fibonacciWorker.js`(如果使用 PM2启动命令是 `pm2 start fibonacciWorker.js`)

	![startServer](https://i.imgur.com/ypyRNnM.gif)

3. 我在本例中定义的是 get 请求接口。值需要一个 num(指的是要计算斐波那契数列的第几个数值) 作为 query 参数。通过刘两年前发送请求：`http://172.16.10.63:3000/newRpcTask?num=42`， 获取计算结果。我们可以看到，RabbitMQ 其实达到了一个负载均衡的作用，它会根据 Worker 的工作情况，将任务自动分发给集群中的 Worker。

	![test](https://i.imgur.com/fRY11np.gif)

### 至此，本文全部结束([项目传送门](https://github.com/SethWen/DistributedCrawler))。感谢您的阅读，同时也欢迎您的指正。



	 
