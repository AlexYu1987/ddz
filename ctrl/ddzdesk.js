var jsUtil = require('util');
var jsBase = require('./baseobj');
var jsCtrl = require('./mjctrl');
var jsSql = require('../net/db/db');

module.exports = DdzDesk;

Date.prototype.Format = function(fmt) {
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

function DdzDesk(id, key, owner, rule, num) {
	jsBase.call(this);
	this.name = "DdzDesk";

	this.m_nMaxUser = 3;
	this.m_nMaxNum = 8;
	this.t_out = 11;
	this.m_pOutTimer = null;

	this.deskid = id;
	this.key = key;
	this.ownerid = ownerid;
	this.m_vUser = Array(this.m_nMaxUser);
	this.m_nState = 0; //游戏等待中 0 叫地主阶段 1 走牌阶段2 一局结束等待2 无效桌子 -1
	this.m_nGameState = 0; //一局牌状态 1 等待出牌 2 等待吃碰杠胡 3 等待补花
	this.m_nLunNum = num;

	this.m_CurUser = null;
	this.m_first = null;//上游
	this.m_ChgZhuang = true;
	this.m_ZhuangNum = 0;
	this.m_vPai = null;
	this.m_nHuang = 0;
	this.m_Win = null;
	this.m_Loser = null;
	this.m_MoNum = 0;
	this.m_OutNum = 0;
	this.m_HuData = null;
	this.m_GenZhuang = {
		pai: null,
		num: 0
	};

	this.m_BiXia = [false, false];

	this.m_StartTime;

	this.m_Rule = {
		game: "nanj",
		num: 1
	};
	this.tr("new MjDesk:" + this.deskid + "," + num);

	this.initDesk = function() {

	};

	this.joinDesk = function() {
		if (user == null) return [-1, 0]; //用户错误
		if (this.m_nState == -1) return [-101, 0]; //桌子已经关闭

		var action = {};
		var chairid = -1;
		var p;
		for (var i = 0; i < this.m_vUser.length; i++) {
			p = this.m_vUser[i];
			if (p == null) {
				if (chairid < 0) chairid = i; //空位
				continue;
			}
			if (p.uid == user.uid) {
				action = {
					event: "join",
					chairid: i
				};
				this.SendUser(action);
				return [2, i];
			} //已在桌子内，老用户重进
		}
		if (chairid < 0) return [-10, 0]; //已满
		if (this.m_nState > 0) return [-100, 0]; //游戏已经开始,新用户不可进入，老用户可重进

		this.m_vUser[chairid] = user;
		user.m_nFen = 0;
		//同步数据
		action = {
			event: "join",
			chairid: chairid
		};
		this.SendUser(action);
		return [1, chairid];
	};

	this.quitDesk = function(user, close) {
		if (user == null) {
			return -1;
		}
		if (this.m_nState > 0) {
			this.SendUser(null);
			return 0;
		}
		var cid = this.isInDesk(user);
		if (cid == -1) {
			return 2;
		}
		if (close) {
			this.DelUserByID(cid);
		} else {
			if (this.ownerid != user.uid) {
				this.DelUserByID(cid);
			} else {
				this.m_vUser[user.chairid].onQuitOk(true);
			}
		}

	};

	this.delUserByChair = function() {

	};

	this.DelUserByID = function(chairid) {
		if (this.m_nState > 0) return; //游戏已经开始
		if (chairid < 0 || chairid >= this.m_vUser.length) return;
		if (this.m_vUser[chairid] == null) return;
		var desk = this.m_vUser[chairid].deskctrl;
		if (desk != null) {
			if (desk.deskid == this.deskid) this.m_vUser[chairid].onQuiteOk(false);
		}
		this.m_vUser[chairid] = null;
	}

	this.isInDesk = function(user) {
		if (user == null) return -1; //用户错误
		if (user.chairid >= 0 && user.chairid < this.m_vUser.length) {
			if (this.m_vUser[user.chairid] != null) {
				if (this.m_vUser[user.chairid].uid == user.uid) return user.chairid;
			}
		}
		for (var i = 0; i < this.m_vUser.length; i++) {
			if (this.m_vUser[i] == null) continue;
			if (this.m_vUser[i].uid != user.uid) continue;
			return i;
		}
		return -1;
	};

	this.clearUser = function() {

	};

	this.tryCloseDesk = function() {

	};

	this.userCloseDesk = function() {

	};

	this.findUser = function() {

	};

	this.findUserChair = function() {

	};

	this.clearDesk = function() {

	};

	this.onGameStart = function(user) {
		if (this.m_nState == -1) {
			this.QuitDesk(user, true);
			this.SendState(null);
			return;
		}
		//游戏已经开始
		if (this.m_nState == 1 || this.m_nState == 2) {
			return;
		}

		if (this.IsEnd()) {
			this.DeskClose();
			this.QuitDesk(user, true);
			this.SendState(null);
			return;
		}

		var user;
		for(var i=0; i<this.m_vUser; ++i){
			user=this.m_vUser[i];
			if (user==null){
				this.SendUser(null);
				return;
			}

			if(user.deskctrl==null){
				if(user.UserJoinDesk(this)){
					continue;
				}
				this.DelUserByID(i);
				return;
			}

			if(user.start==false){
				this.SendUser(null);
				return;
			}
		}

		this.m_StartTime=new Date().Format("yyyy-MM-dd hh:mm:ss");
		this.m_nState=1;
		this.SendAll("GameStart",{lun:this.m_nLunNum});
		this.startgame();
	};

	this.startGame = function() {
		//TODO:开始游戏主体逻辑
	};

	this.shuffle = function() {

	};

	this.chuPai = function() {

	};

	this.jiaoFen = function() {

	};

	this.SendUser = function(action) {
		var data = {};
		var vuser = Array(this.m_nMaxUser);
		for (var i = 0; i < this.m_nMaxUser; i++) {
			if (i >= this.m_vUser.length) break;
			if (this.m_vUser[i] == null) continue;
			vuser[i] = this.m_vUser[i].GetUserData();
		}
		data['user'] = vuser;
		data['rule'] = this.m_Rule;
		data['owner'] = this.ownerid;
		data['action'] = action;
		for (var i = 0; i < this.m_vUser.length; i++) {
			if (this.m_vUser[i] == null) continue;
			data['chair'] = i;
			this.m_vUser[i].toC("UpdateUser", data);
		}
	}

	this.SendAll = function(fun, param) {
		for (var i = 0; i < this.m_nMaxUser; i++) {
			if (i >= this.m_vUser.length) break;
			if (this.m_vUser[i] == null) continue;
			this.m_vUser[i].toC(fun, param);
		}
	}

	this.SendState = function(action) {
		//TODO:重构桌面状态
		var data = {};
		data['deskid'] = this.deskid;
		data['state'] = this.m_nState;
		data['lun'] = this.m_nLunNum;
		data['ju'] = this.m_ZhuangNum;
		data['zhuang'] = '0';
		if (this.m_Zhuang != null) data['zhuang'] = this.m_Zhuang.chairid;
		data['action'] = action;

		for (var i = 0; i < this.m_vUser.length; i++) {
			if (this.m_vUser[i] == null) continue;
			data['chair'] = i;
			this.m_vUser[i].toC("UpdateDesk", data);
		}
	};

	this.SendDesk = function(action) {
		//TODO:重构桌面牌状态
		if (this.m_vPai == null) return;
		if (this.m_nGameState == 0) return; //游戏结束

		var data = {};
		data['gamestate'] = this.m_nGameState;
		data['curuser'] = '0';
		if (this.m_CurUser != null) data['curuser'] = this.m_CurUser.chairid;
		data['leftpai'] = this.GetHuangLeft();
		data['outpai'] = null;
		var outpai = this.m_CurUser.m_Pai.outpai;
		if (this.m_CurUser.m_Pai != null) data['outpai'] = this.m_CurUser.m_Pai.GetMiniPai(outpai);

		var hua = 0;
		var vuser = Array(this.m_nMaxUser);
		for (var i = 0; i < this.m_nMaxUser; i++) {
			if (i >= this.m_vUser.length) break;
			if (this.m_vUser[i] == null) continue;
			vuser[i] = this.m_vUser[i].GetDeskData();
			hua += this.m_vUser[i].m_Pai.GetHuaNum();
		}
		data['user'] = vuser;
		data['action'] = action;
		data['lhua'] = 20 - hua;

		this.SendAll("UpdatePai", data);
	};
}

js_util.inherits(DdzDesk, jsBase);