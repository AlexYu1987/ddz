var g_color = require('colors');
var g_event = require('events');
var g_util = require("util");
var g_conn = require('./../websvr');
//用户对象列表
var m_vUser = [];
//去除数组中指定的项
Array.prototype.remove = function (val){
	var index = -1;
	for (var i=0; i<this.length; i++){
        if (this[i] === val){
            this.splice(i, 1);
            index = i;
            break;
        }
    }
    return index;
}
//暴露调用模板
module.exports = NetUser;
//继承 EventEmitter
g_util.inherits(NetUser, g_event.EventEmitter);
//NetUser构造函数
function NetUser(conn, netkey){
	//调用 EventEmitter 的构造方法
	g_event.EventEmitter.call(this);
	this.name = "NetUser";
	this.uuid = Math.floor( Math.random()*10000 + 1);
	//识别key
	this.m_nNetKey = netkey;
	//通信对象
	this.m_Con = conn;
	//入栈
	if(conn) m_vUser.push(this);
}
NetUser.prototype.getList = function(){
	return m_vUser;
}
//特殊回调对象, 可选
NetUser.prototype.callObj = null;
//对本地客户端进行通信
NetUser.prototype.toC = function(fun, json){
	if(typeof fun != "string" || typeof json != "object"){
		console.log( ("toC call err : " + fun + ":" + json).red );
		return;
	}
	this.m_Con.toc(fun, json);
}
//对出自己以外的用户进行广播
NetUser.prototype.toG = function(fun, jsonstr){
	for(var i=0;i<m_vUser.length;i++){
		if(m_vUser[i]==this) continue;
		m_vUser[i].toC(fun, jsonstr);
	}
}
//对包括自己在内的所有人广播
NetUser.prototype.toA = function(fun, jsonstr){
	for(var i=0;i<m_vUser.length;i++)
		m_vUser[i].toC(fun, jsonstr);
}
NetUser.prototype.onlogin = function(openid){
	try{
		if(this.callObj) eval("this.callObj.onLogin({\"openid\":\""+openid+"\"})");
		else eval("this.onLogin({\"openid\":\""+openid+"\"})");
	}catch(e){
		console.log("The inheritance class miss a function : onLogin !".red);
	}
}
//接收消息回调
NetUser.prototype.receive = function(json){
	if(typeof json != "object"){
		console.log( ("receive not json : " + json).red );
		return;
	}
	var fun = json['fun'];
	if(typeof fun != "string"){
		console.log( ("receive fun err : " + JSON.stringify(json)).red );
		return;
	}
	var agv = json['agv'];
	if(typeof agv != "object"){
		console.log( ("receive agv err : " + JSON.stringify(json)).red );
		return;
	}
	if(this.callObj) fun = "this.callObj.c_" + fun;
	else fun = "this.c_" + fun;
	try{
		if( fun=="this.c_JoinDesk" ) 
			this.c_JoinDesk(agv);
		else
			eval(fun+"("+JSON.stringify(agv)+")");
	}catch(e){
		console.log( ("receive call err : " + JSON.stringify(json)).red );
		console.log(e);
	}
}
NetUser.prototype.vaild = true;
//从socket发出的断开通知
NetUser.prototype.onbreak = function(){
	if(this.vaild){
		this.vaild = false;
		//通知继承类连接已断开, 并删除自身
		try{
			if(this.callObj) eval("this.callObj.onClose()");
			else eval("this.onClose()");
		}catch(e){
			console.log("The inheritance class miss a function : onclose !".red);
			console.log(e);
		}
		m_vUser.remove(this); //当 vaild 等于 false 时, 移出数组
		this.emit("del"); //触发删除事件
	}
}
//服务端主动断开
NetUser.prototype.delThis = function(){
	if(this.vaild){
		this.vaild = false;
		m_vUser.remove(this);
		this.emit("del");
	}
}