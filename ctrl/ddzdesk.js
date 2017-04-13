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
	this.name="DdzDesk";

	this.m_nMaxUser=3;
	this.m_nMaxNum=8;
	this.t_out=11;
	this.m_pOutTimer=null;

	this.deskid=id;
	this.key=key;
	this.ownerid=ownerid;
	this.m_vUser=Array(this.m_nMaxUser);
	this.m_nState=0;//游戏等待中 0 叫地主阶段 1 走牌阶段2 一局结束等待2 无效桌子 -1
	this.m_nGameState=0;//一局牌状态 1 等待出牌 2 等待吃碰杠胡 3 等待补花
	this.m_nLunNum=num;

	this.m_CurUser=null;
	this.m_Zhuang=null;
	this.m_ChgZhuang=true;
	this.m_ZhuangNum=0;
	this.m_vPai=null;
	this.m_nHuang=0;
	this.m_Win=null;
	this.m_Loser=null;
	this.m_MoNum=0;
	this.m_OutNum=0;
	this.m_HuData=null;
	this.m_GenZhuang={pai:null,num:0};

	this.m_BiXia=[false,false];

	this.m_StartTime;

	this.m_Rule={game:"nanj",num:1};
	this.tr("new MjDesk:"+this.deskid+","+num);

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