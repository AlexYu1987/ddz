var js_util = require('util');
var g_color = require('colors');
var g_config = require('../net/config/db_config');
var js_user = require('../net/user/netUser');

exports.onCreateUser = function(conn, netkey) {
	//obj.Init(conn, netkey);
	return new SUser(conn, netkey);
}

function SUser(conn, netkey) {
	this.m_user = null; //就是userBO
	js_user.call(this, conn, netkey);

	this.c_login() = function(agv) {

	};

	this.c_CreateDesk() = function() {

	};

	this.c_joinDesk() = function() {

	};

	this.c_jiaoDz() = function() {

	};

	this.c_outCard() = function() {

	};

	this.c_overCall() = function() {

	};

	this.wechatLogin = function(openid, nickname, headimgurl, sex) {

	}

	this.NewGameUser = function(data) {
		user = new js_mjuser(this, data, conn.remoteAddress); //js_mjuser.onCreateUser(this,uid);//
		user.m_Card = this.m_Data["card"]; //变更房卡
		this.m_user = user;
		js_mj.m_vGameUser.push(user);
		this.toC("onLoginOk", this.m_Data);
	}
}

SUser.prototype.loadDBOk = function(info) {
	this.m_Data = info[0];
	if (!this.m_Data) {
		this.toC("onError", {
			"msg": "账号错误"
		});
		return;
	}
	if (this.m_Data["black"] == 1) {
		this.toC("onError", {
			"msg": "账号处于冻结状态, 请联系管理员"
		});
		return;
	}

	this.NewGameUser(this.m_Data.id);
}

js_util.inherits(SUser, js_user);