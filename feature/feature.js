/**
 * author: Shawn
 * time  : 2017/9/6 14:19
 * desc  :
 * update: Shawn 2017/9/6 14:19
 */


/**
 * 计算 fibonacci
 *
 * @param n
 * @returns {*}
 */
function fibonacci(n) {
    if (n === 0 || n === 1)
        return n;
    else
        return fibonacci(n - 1) + fibonacci(n - 2);
}


/**
 * 异步 fibonacci
 *
 * @param n
 * @param callback
 * @returns {*}
 */
function fibonacciAsync(n, callback) {
    if (n === 0 || n === 1)
        callback(n);
    else
        callback(fibonacci(n - 1) + fibonacci(n - 2));
}


module.exports = {
    fibonacci: fibonacci,
    fibonacciAsync: fibonacciAsync,
};