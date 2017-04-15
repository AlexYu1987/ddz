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
	//回合数
	this.m_roundNum = num;
	//本局地主座位号
	this.m_DZ = -1;
	//当前走牌用户
	this.m_CurUser = null;
	//上一局的上游座位号
	this.m_nFirst = null;
	this.m_StartTime;
	//叫分人数统计
	this.m_nJiao = 0;
	//底分
	this.m_nBaseFen = 0;
	//地主的三张底牌
	this.m_v3Pai = [];
	//本局牌的倍数
	this.m_nScale = 1;
	//当前走牌的牌型,-1牌型错误，1单张，2对子，3三不带，4三带一，5三带一对，6飞机，7顺子，8四带二，9炸弹
	this.m_nCardType = -1;
	//本轮次各用户所走的牌。
	this.m_vOutCard = null;
	this.m_Rule = {
		game: "ddz",
		num: 4
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
		//TODO:每局开始清理桌面
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
		for (var i = 0; i < this.m_vUser; ++i) {
			user = this.m_vUser[i];
			if (user == null) {
				this.SendUser(null);
				return;
			}

			if (user.deskctrl == null) {
				if (user.UserJoinDesk(this)) {
					continue;
				}
				this.DelUserByID(i);
				return;
			}

			if (user.start == false) {
				this.SendUser(null);
				return;
			}
		}

		this.m_StartTime = new Date().Format("yyyy-MM-dd hh:mm:ss");
		this.m_nState = 1;
		this.SendAll("GameStart", {
			round: this.m_roundNum
		});
		this.startgame();
	};

	this.startGame = function() {
		/*
			如果是第一局则初始化桌面用户的分数,
			清理桌面
			当前活动用户设置为上局的上游用户
			洗牌，并给用户发手牌，保留地主的三张底牌
			设置游戏状态进入叫地主阶段

		*/
		if (this.m_roundNum == 0) {
			this.m_vUser.forEach(function(user) {
				user.m_nFen = 0;
				user.m_first = 0;
			});
		}
		this.m_roundNum++;
		this.clearDesk();
		this.m_CurUser = this.m_vUser[user.m_nFirst];
		var vPai = jsCtrl.shuffle();

		//随机取三张放入底牌
		for (var i = 0; i < this.m_nMaxUser; ++i) {
			var r = Math.floor(Math.random() * vPai.length);
			this.m_v3Pai.push(vPai.splice(r, 1));
		}

		//分发手牌
		this.m_nMaxUser.forEach(function(user) {
			//TODO:需要验证下此算法是否正确
			user.m_vPai = vPai.splice(0, Math.floor(vPai.length / this.m_nMaxUser));
		});

		this.m_nState = 1;
		var action = {
			event: 'StartJiaoDZ'
		};
		this.sendDesk(action);
	};

	this.chuPai = function() {

	};

	this.jiaoDZ = function(user, baseFen) {
		//状态不是叫地主
		if (this.m_nState != 1) {
			return;
		}
		//不轮到当前用户叫分
		if (user != this.m_CurUser) {
			return;
		}
		if(typeof baseFen != 'number' || baseFen < 0 || baseFen > 3) {
			return;
		}

		this.m_nJiao ++;

		if (this.m_nJiao == this.m_nMaxUser){
			if (this.m_nBaseFen == 0 && baseFen == 0) {
				return;
			}
			if (baseFen > this.m_nBaseFen) {
				this.m_nBaseFen = baseFen;
				this.m_CurUser = user;
				this.m_DZ = user.chairid;
				this.m_nState = 2;
				this.sendDesk({event:'StartChuPai'});
			} else
		} else {
			//不叫
			if (baseFen == 0){
				this.m_CurUser = this.m_vUser[(user.chairid + 1) % this.m_nMaxUser];
				this.sendDesk({event:'StartJiaoDZ'})
			} else if()
		}

		}
		if (baseFen == 3) {
			this.m_DZ = user.chairid;
			this.m_nBaseFen = baseFen;
			this.m_nState = 2;
			this.m_CurUser = user;
			this.sendDesk({
				event: 'StartChuPai',
			});
		} else {

			if (this.baseFen == 1 && user.chairid == 1) {

			}
		}
		this.m_nJiao++;
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
		data['round'] = this.m_roundNum;
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