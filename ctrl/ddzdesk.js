var jsUtil = require('util');
var jsBase = require('./baseobj');
var jsCtrl = require('./mjctrl');
var jsSql = require('../net/db/db');

module.exports=DdzDesk;

Date.prototype.Format = function (fmt) {
	var o = {
		"M+": this.getMonth() + 1, //月份 
		"d+": this.getDate(), //日 
		"h+": this.getHours(), //小时 
		"m+": this.getMinutes(), //分 
		"s+": this.getSeconds(), //秒 
		"q+": Math.floor((this.getMonth() + 3) / 3), //季度 
		"S": this.getMilliseconds() //毫秒 
	};
	if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o)
	if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
}

function DdzDesk(id,key,owner,rule,num){
	jsBase.call(this);

	this.initDesk=function(){

	};

	this.joinDesk=function(){

	};

	this.quitDesk=function(){

	};

	this.delUserByChair=function(){

	};

	this.isInDesk=function(){

	};

	this.clearUser=function(){

	};

	this.tryCloseDesk=function(){

	};

	this.userCloseDesk=function(){

	};

	this.findUser=function(){

	};

	this.findUserChair=function(){

	};

	this.clearDesk=function(){

	};

	this.onGameStart=function(){

	};

	this.startGame=function(){

	};

	this.shuffle=function(){

	};

	this.chuPai=function(){

	};

	this.jiaoFen=function(){

	};
}

js_util.inherits(DdzDesk, jsBase);