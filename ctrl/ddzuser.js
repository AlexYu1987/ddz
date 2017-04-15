var js_util = require('util');
var js_base = require('./baseobj');
var js_mj = require('./mjctrl');
var js_pai = require('./game/ddzpai');
var js_sql = require('../net/db/db');

module.exports = DdzUser

function DdzUser(suser, uid, ip) {
	js_base.call(this);

	this.uid = -1;
	this.ip = null;
	this.netuser = null;
	this.start = false;
	this.outtime = 0;
	this.tyclose = false;
	this.deskctrl = null;
	this.chairid = -1;

	this.m_sNick = "testuser";
	this.m_sHead = "test";
	this.m_nSex = 0;
	this.m_Money = 0;
	this.m_Card = 0;
	this.m_fen = 0;
	this.m_closeDesk = 0;
	//手牌
	this.m_vPai = [];
	//TODO:action需要重新设计参数。
	this.m_Action = {
		eve: 'non',
		param: null
	};

	this.onInit = function netuser(netuser, uid, ip) {
		debugger;
		this.tr("onInit:uid=" + uid);
		this.tr(JSON.stringify(netuser.m_Data));
		this.start = false;
		this.uid = uid;
		this.m_fen = 0;
		this.m_sNick = netuser.m_Data.nickname;
		this.m_sHead = netuser.m_Data.headurl;
		this.m_nSex = netuser.m_Data.sex;

		this.regNetuser(netuser, ip);
	};

	this.onUserJoinDesk = function(deskid, key) {
		var re = this.isInDesk(deskid);
		if (re == 1) {
			this.toC("OnJoinDeskOk", {
				deskid: deskid,
				'key': key
			});
			return true;
		} else if (re == -1) return false;

		this.deskctrl = null;

		var desk = js_mj.findDesk(deskid);
		if (desk == null) {
			this.toC("onError", {
				"msg": "onUserJoinDesk:创建桌子失败"
			});
			return false;
		}
		if (this.UserJoinDesk(desk)) {
			this.tr("onUserJoinDesk:uid=" + this.uid + "," + this.m_sNick);
			return true;
		}
		return false;
	}

	this.onGameStart = function() {
		if (this.deskctrl == null) {
			return;
		}
		this.start = true;
		this.clearAction();
		this.deskctrl.onGameStart(this);
		this.deskctrl.SendState(null);
	};

	this.onQuitOK = function(isowner) {
		if (isowner) {
			this.start = false;
		} else {
			this.deskctrl = null;
			this.start = false;
			this.m_closeDesk = 0;
			this.chairid = -1;
			this.m_Pai = null;
		}
		this.toC("OnQuitDeskOK", {
			uid: this.uid,
			nick: this.m_sNick
		});
	};

	this.onJiaoDZ = function(baseFen) {
		this.deskctrl.onJiaoDZ(this, baseFen);
	};

	this.regNetuser = function(netuser, ip) {
		this.tr("regNetuser:uid=" + this.uid);
		this.ip = ip;
		this.netuser = netuser;
		this.tyclose = false;
		this.outtime = 0;
		if (this.deskctrl != null) {
			if (this.onUserJoinDesk(this.deskctrl.deskid, this.deskctrl.key)) {
				this.deskctrl.SendState({
					event: "regNetuser"
				});
				this.deskctrl.SendDesk({
					event: "regNetuser"
				});
				if (this.deskctrl.m_nGameState) this.SendSelf({
					event: "regNetuser"
				});
				if (!this.start && this.deskctrl.m_HuData != null)
					this.toC("HuPai", this.deskctrl.m_HuData);

				//TODO:重写游戏已开始，且轮到自身走牌的逻辑。
				if (this.deskctrl.m_nGameState && this.start && this.deskctrl.m_CurUser != null) {
					if (this.deskctrl.m_CurUser == this) {
						if (this.m_Pai.ting) {
							if (this.m_Pai.mopai) {
								var pai = this.m_Pai.mopai;
								if (this.m_Pai.isGang(this, pai)) this.toC("isGang", {
									paiid: pai.id,
									flag: 4
								});
								if (this.m_Pai.isJiaGang(this, pai)) this.toC("isGang", {
									paiid: pai.id,
									flag: 5
								});
								this.SendHu(pai, null);
							}
						}
					} else {
						if (this.deskctrl.m_nGameState == 2) {
							if (this.m_Pai.ting) {
								var outpai = this.deskctrl.m_CurUser.m_Pai.outpai;
								if (this.m_Action.ishu == 1 && this.m_Action.eve == "wait") {
									this.SendHu(outpai, outpai);
								}
								if (this.m_Pai.isGang(this, outpai)) this.toC("isGang", {
									paiid: outpai.id,
									flag: 3
								});
							}
						}
					}
				}
			}
		}
		this.SendUserData();
		//上线变更
		js_sql.query("update b_userinfo set `isol`=1, `loginip`='" + this.ip + "' where `id`=" + this.uid, this, null, null);
	};

	this.isInDesk = function(deskid) {
		if (this.deskctrl == null) return 0;
		var desk = this.deskctrl;
		this.chairid = desk.isInDesk(this);
		if (desk.deskid == deskid) { //进入老桌子

			if (!this.UserJoinDesk(desk)) {
				if (this.chairid < 0) return -1;
				desk.DelUserByID(this.chairid);
				return -1;
			}
			return 1;
		}
		if (!js_mj.isUseDesk(desk)) {
			this.deskctrl = null;
			return 0;
		}
		if (this.chairid < 0) { //不在桌子内

			this.deskctrl = null;
			return 0;
		}
		if (this.UserJoinDesk(desk)) return 1 //进入老桌子

		desk.DelUserByID(this.chairid); //退出

		return 0;
	}

	this.UserJoinDesk = function(desk) {
		var r = false;
		var re = desk.JoinDesk(this);
		switch (re[0]) {
			case 1: //成功加入
			case 2: //用户已加入

				this.deskctrl = desk;
				this.chairid = re[1];
				this.toC("OnJoinDeskOk", {
					deskid: desk.deskid,
					'key': desk.key
				});
				r = true;
				break;
			case -10: //已满
				this.toC("onError", {
					"msg": "人满了，新开一桌吧~~~"
				});
				break;
			case -100: //游戏已经开始,新用户不可进入

				this.toC("onError", {
					"msg": "已经开始了，请到别桌试试~~~"
				});
				break;
			case -101: //桌子已经关闭
				this.toC("onError", {
					"msg": "很抱歉，桌子已经关闭啦~~~"
				});
				break;
		}
		this.tr("JoinDesk:" + this.chairid);
		//更新数据
		return r;
	}

	this.SendUserData = function() {
		var data = {};
		data['card'] = this.netuser.m_Data.card;
		this.toC("SendUserData", data);
	}

	this.SendSelf = function(action) {
		//TODO:重写自身状态。
		if (this.m_Pai == null) {
			this.err("SendSelf:uid=" + this.uid + "[" + action + "]");
			return;
		}
		if (this.deskctrl == null) return;
		//if( this.deskctrl.m_nGameState==0 ) return;

		var data = {};
		data['vpai'] = this.m_Pai.GetMiniVPai(this.m_Pai.vpai);
		data['mopai'] = this.m_Pai.GetMiniPai(this.m_Pai.mopai);
		data['action'] = action;
		this.toC("SelfPai", data);
	}

	this.clearAction = function() {
		this.m_Action.eve = "non";
		this.m_Action.param = null;
	}

	this.onInit()
}

js_util.inherits(DdzUser, js_base);