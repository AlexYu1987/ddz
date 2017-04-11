/*
* 测试用 TCP socket 连接, 主要测试主要逻辑，剥离持久化层
*/
var colors = require('colors');
var net = require('net');
var suser = require('../ctrl/suser');		//onCreateUser 接口所在域
var log = require('./log');
var g_config = require('./config/db_config');

var server=net.createServer(function(socket){

});

server.listen(g_config.tcport, g_config.tcphost, function(){
	console.log('tcp listening on :'+g_config.tcport);
});

server.on("error", function(d){
	console.log(d);
});