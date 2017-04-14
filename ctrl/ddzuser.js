var js_util = require('util');
var js_base = require('./baseobj');
var js_mj = require('./mjctrl');
var js_pai = require('./game/pai');
var js_sql = require('../net/db/db');

module.exports = DdzUser

function DdzUser(suser, uid, ip) {
	js_base.call(this);

	this.uid = -1;
	this.ip = null;
	this.netuser = null;
	this.start = false;
	this.outtime = 0;
	this.tyclose=false;
	this.deskctrl=null;
	this.chairid=-1;

	this.m_sNick = "testuser";
	this.m_sHead = "test";
	this.m_nSex = 0;
	this.m_Money = 0;
	this.m_Card = 0;
	this.m_fen = 0;

	this.onInit = function netuser(netuser, uid, ip) {
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

	this.SendUserData=function(){
		var data={};
		data['card']=this.netuser.m_Data.card;
		this.toC("SendUserData",data);
	}

	this.onInit()
}

js_util.inherits(DdzUser, js_base);
