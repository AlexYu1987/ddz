var js_util = require('util');
var g_color = require('colors');
//var js_user = require('./NetUser');
var js_user = require('../net/user/netUser');
var js_sql = require('../net/db/db');

var js_mjuser = require('./mjuser');
var js_mj = require('./mjctrl');

var g_config = require('../net/config/db_config');

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

exports.onCreateUser = function(conn, netkey){
	//obj.Init(conn, netkey);
	return new SUser(conn, netkey);
}

var m_szDeskID = [];
var m_szDeskKey = [];
for(var ii=100000;ii<1000000;ii+=1){
	m_szDeskID.push(ii);
}

function SubDeskID(key)
{
	var r = Math.floor( Math.random() * m_szDeskID.length );
	var deskid = m_szDeskID[r];
    m_szDeskID.splice(r, 1);
	m_szDeskKey.push({"deskid":deskid,"key":key});
	return deskid;
}
function GetDeskIDByKey(key)
{
	var len = m_szDeskKey.length;
	for(var ii=0;ii<len;ii+=1){
		if(m_szDeskKey[ii].key == key)
			return m_szDeskKey[ii].deskid;
	}
	return 0;
}
function GetDeskKeyByID(deskid)
{
	var len = m_szDeskKey.length;
	for(var ii=0;ii<len;ii+=1){
		if(m_szDeskKey[ii].deskid == deskid)
			return m_szDeskKey[ii].key;
	}
	return "";
}

function SUser(conn, netkey){
	this.m_user=null;
	js_user.call(this, conn, netkey);

	//H5登陆
	this.onLogin = function(agv){
		if( !agv['openid'] ) return;
		if( agv['openid']=='' || agv['openid']==0 ) return;
		js_sql.query("select * from b_userinfo where openid='"+agv["openid"]+"'", this,  this.loadDBOk, this.loadDBErr);
	}
	//账号登陆
	this.c_Login = function(agv){
		//验证版本号
		if(	!agv['ver'] || !g_config.minver){
			this.toC("onError", {"msg":"当前游戏版本号过低, 需要更新."});
			return;
		}
		var ver = agv['ver'].split(".");
		if(	ver[ver.length-1]<g_config.minver){
			this.toC("onError", {"msg":"当前游戏版本号过低, 需要更新."});
			return;
		}
		if( !agv['accname'] || !agv['pass']) {
			if( !agv['openid'] ) {
				this.toC("onError", {"msg":"请输入账号密码"});
				return;
			}
			this.wechatLogin(agv['openid'],agv['nickname'],agv['headimgurl'],agv['sex']);
			return;
		}
		//账号密码不允许存在空格和半角单引号, 以防止SQL语句注入
		if( agv['accname'].match(/ |\'/g) || agv['pass'].match(/ |\'/g) ){ 
			this.toC("onError", {"msg":"账号密码不合法"});
			return;
		}
		js_sql.query("select * from b_userinfo where openid='"+agv["accname"]+"' and password='"+agv["pass"]+"'", this,  this.loadDBOk, this.loadDBErr);
	}
	//微信注册登陆
	this.wechatLogin= function(openid, nickname, headimgurl, sex){
		var search = "select * from b_userinfo where openid='"+openid+"'";
		js_sql.query(search, this,  
			function(info){
				if(!info[0]){ //需要注册
					var sdate = new Date().Format("yyyy-MM-dd hh:mm:ss");
					var sql= "INSERT INTO `b_userinfo` (`id`, `openid`, `regdate`, `logindate`, `nickname`, `sex`, `headurl`, `money`, `card`) VALUES " +
						"(NULL,'"+openid+"','"+sdate+"','"+sdate+"','"+nickname+"',"+sex+",'"+headimgurl+"',0,"+g_config.regcard+")";
					js_sql.query(sql, this, 
						function(info){
							js_sql.query(search, this,  this.loadDBOk, this.loadDBErr);
							if(g_config.regcard)
								this.toC("onError", {"msg":"欢迎来到"+g_config.appname+",新用户奖励"+g_config.regcard+"张房卡,祝您游戏愉快!"});
						}
						,function(err){
							this.toC("onError", {"msg":"注册账号失败"});
						});
					js_sql.query("INSERT INTO `log_reg` (`id`,`openid`,`dodate`,`info`) VALUES (NULL,'"+openid+"', '"+new Date().Format("yyyy-MM-dd")+"', 'WT')", this,  null, null);
					return;
				}
				//更新头像和昵称
				try{
					var sqll = "";
					if(headimgurl && headimgurl!="undefined"){
						if(info[0].headurl!=headimgurl){
							sqll= "UPDATE `b_userinfo` SET headurl='"+headimgurl+"' WHERE id="+info[0].id;
							js_sql.query(sqll, this, function(){}, function(){});
							info[0].headurl = headimgurl;
							console.log("update Head:"+sqll);
						}
					}
					if(nickname && nickname!="undefined"){
						if(info[0].nickname!=nickname){
							var sqll= "UPDATE `b_userinfo` SET nickname='"+nickname+"' WHERE id="+info[0].id;			
							js_sql.query(sqll, this, function(){}, function(){});
							info[0].nickname = nickname;
							console.log("update Nick:"+sqll);
						}
					}
				}catch(e){
					console.log(e);
				}
				this.loadDBOk(info);
			},function(err){
				this.toC("onError", {"msg":"登录失败"});
			});
	}
	//注册账号
	this.c_Reg = function(agv){
		if( !agv['accname'] || !agv['pass'] || !agv['nick']) {
			this.toC("onError", {"msg":"请输入注册账号密码"});
			return;
		}	
		if( agv['accname'].match(/[ |()\',.$`"+&]/g) || agv['pass'].match(/[ |()\',.$`"+&]/g) || agv['nick'].match(/[ |()\',.$`"+&]/g) ){ 
			this.toC("onError", {"msg":"账号密码存在非法字符"});
			return;
		}
		if( typeof agv['accname'] == "string" && (agv['accname'].length>12 || agv['accname'].length<3)){
			this.toC("onError", {"msg":"账号长度为3~12个字符"});
			return;
		}
		if( typeof agv['pass'] == "string" && (agv['pass'].length>12 || agv['pass'].length<3)){
			this.toC("onError", {"msg":"密码长度为3~12个字符"});
			return;
		}
		if( typeof agv['nick'] == "string" && (agv['nick'].length>8 || agv['nick'].length<2)){
			this.toC("onError", {"msg":"昵称长度为2~8个字符"});
			return;
		}
		var sdate = new Date().Format("yyyy-MM-dd hh:mm:ss");
		var sql= "INSERT INTO `b_userinfo` (`id`,`openid`,`password`,`regdate`,`logindate`,`nickname`,`money`,`card`) VALUES "+
			"(NULL,'"+agv["accname"]+"','"+agv["pass"]+"','"+sdate+"','"+sdate+"','"+agv['nick']+"',0,"+g_config.regcard+")";
		js_sql.query(sql, this,  this.addDBOk, this.addDBErr);
		js_sql.query("INSERT INTO `log_reg` (`id`,`openid`,`dodate`,`info`) VALUES (NULL,'"+agv["accname"]+"', '"+new Date().Format("yyyy-MM-dd")+"', 'AP')", this,  null, null);
	}
	//创建房间/桌子
	this.c_CreateDesk = function ( agv ) {
		if( !this.m_Data ){
			this.toC("onError", {"msg":"请先登录游戏"});
			return;
		}
		if( !this.m_Data["id"] ){
			this.toC("onError", {"msg":"请先登录游戏"});
			return;
		}
		if(!agv["rule"]){
			this.toC("onError", {"msg":"请确认游戏规则"});
			return;
		}
		var deskey = "K"+new Date().Format("yyyyMMddhhmmss") + netkey;
		var deskid = SubDeskID(deskey);
		if(deskid==0){
			this.toC("onError", {"msg":"array error!"});
			return;
		}

		var sql= "INSERT INTO `mj_desk` (`id`, `key`, `deskid`, `creator`, `createid`, `creatime`, `num`, `state`, `overtime`, `rule`) VALUES (NULL, '"+deskey+"', "+deskid+", '"+this.m_Data['openid']+"', '"+this.m_Data['id']+"', '"+new Date().Format("yyyy-MM-dd hh:mm:ss")+"', '0', '0', '1970-01-01 00:00:00', '"+agv["rule"]+"');";
		//添加新房间数据
		js_sql.query(sql, this, function(){
			sql = "select * from `mj_desk` where `key`='"+deskey+"'";
			//查询新房间数据
			js_sql.query(sql, this, function(info){
				if(!info || !info[0]){
					this.toC("onError", {"msg":"房间号错误"});
					return;
				}
				this.toC("CreateDeskOk", {"deskid":info[0]["deskid"]});
			},function(){
				this.toC("onError", {"msg":"未找到已经创建的房间"});
			});
		},function(){
			this.toC("onError", {"msg":"创建房间失败"});
		});
	}
	this.c_JoinDesk= function( agv ){

	}
	//创建房间,并且进入
	this.c_JoinDesk2= function( agv ){
		if( agv['deskid']=='undefinde' ) return;
		//console.log("c_JoinDesk2:"+agv);
		if( agv['deskid']=='' || agv['deskid']==0 ) return;
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		var key = GetDeskKeyByID(agv['deskid']);
		if(!key){
			this.toC("onError", {"msg":"房间号不存在!"});
			return;
		}
		//this.m_user.onUserJoinDesk(agv.id);
		js_sql.query("select * from mj_desk where `key`='"+key+"'", this,  this.loadDeskDBOk, this.loadDeskDBErr);
	}
	this.c_TryClose=function( agv ){
		console.log("TryClose");
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onTryClose();
	}
	this.c_CloseDesk= function( agv ){
		console.log("c_CloseDesk:"+agv.deskid);
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onUserCloseDesk(agv.deskid,agv.att);
	}
	this.c_QuitDesk= function( agv ){
		console.log("c_QuitDesk:"+agv.deskid);
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onUserQuitDesk(agv.deskid);
	}
	this.c_NotChi=function(){
		console.log("c_NotChi");
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onUserNotChi();
	}
	this.loadDeskDBOk= function(info)
	{
		var data = info[0];
		if(!data){
			this.toC("onError", {"msg":"房间号不存在，请重新输入！"});
			return;
		}
		try{
			var rule = JSON.parse(data["rule"]);
		}catch(e){
			this.toC("onError", {"msg":"房间数据异常"});
			return;
		}
		if( this.dbak ){
			this.toC("onError", {"msg":"操作中, 请稍后"});
			return;
		}
		this.dbak = rule;
		this.databak = this.m_Data;
		this.createError = function(msg){
			delete this.dbak;
			delete this.databak;
			this.toC("onError", {"msg":msg});
		}
		this.createOk= function(sub){
			delete this.dbak;
			delete this.databak;
			this.toC("SendUserData", {"money":this.m_Data["money"],"card":this.m_Data["card"]});
			
			switch(data.state){
				case 0:			
					js_mj.NewDesk(data.deskid,data.key,data.createid,rule,data.num);
					this.m_user.onUserJoinDesk(data.deskid,data.key);//data.createid
					//房卡消费记录
					sql= "INSERT INTO `log_card` (`id`, `uid`, `dodate`, `dotime`, `num`) VALUES (NULL, '"+this.m_Data["id"]+"', '"+new Date().Format("yyyy-MM-dd")+"', '"+new Date().Format("hh:mm:ss")+"', "+sub+");";
					js_sql.query(sql, this, null, null);
					break;
				case 1:
					this.toC("onError", {"msg":"对不起，游戏已开始！"});
					break;
				case 2:
					this.toC("onError", {"msg":"对不起，游戏已结束！"});
					break;
				default :
					this.toC("onError", {"msg":"The desk data error !"});
					break;
			}
		}
		//查询可用房卡数量
		var sql= "select * from b_userinfo where id ="+this.m_Data["id"];
		js_sql.query(sql, this, function(info){
			if(!this.dbak){
				this.createError("创建失败");
				return;
			}
			if(!info || !info[0]){
				this.createError("您的账号登陆已过期");
				return;
			}
			var sub = 4;
			if(!rule["num"]) {
				this.createError("请设置圈数");
				return;
			}
			if(rule.num == 1) sub =1; //1圈扣1,4圈扣4
			if(!info[0]['card'] || info[0]['card'] < sub){
				this.createError("房卡余量不足");
				return;
			}
			//借机更新
			this.m_Data = info[0];
			//变更房卡数量
			sql= "update b_userinfo set card=card-"+sub+" where id="+this.m_Data["id"];
			js_sql.query(sql, this, function(){
				//房卡变动
				if(this.m_Data){
					this.m_Data["card"] = this.m_Data["card"]-sub;
					//变更房卡
					if(this.m_user) this.m_user.m_Card = this.m_Data["card"];
				}
				if(!this.dbak){
					this.createError("unknow action");
					return;
				}
				this.createOk(sub);
			}, function(){
				this.createError("扣除房卡失败");
			});
		},function(){
			this.createError("查询房卡余量失败");
		});
	}
	this.loadDeskDBErr= function(err)
	{
		console.log(("db err : " + err.code).red);
		console.log(err);
		this.toC("onError", {"msg":"get desk err !"});
	}
	this.c_ReadyGame= function( agv ){
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onGameStart(agv.lat, agv.lon);
	}
	this.c_OutPai = function( agv ){
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onChuPai( agv.id );
	}
	this.c_BaoTing = function(agv){
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onBaoTing();
	}
	this.c_UnShowKePai = function(agv){
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.TingKePaiOk(agv.ting,agv.ke);
	}
	this.c_PengPai = function( agv ){
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onPeng(agv.id);
	}
	this.c_GangPai = function( agv ){
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onGang(agv.id,0);
	}
	this.c_AnGang = function( agv ){
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onGang(agv.id,1);
	}
	this.c_HuPai = function(){
		if( this.m_user==null ){
			this.toC("onError", {"msg":"无效用户，请重新登录! user=null"});
			return;
		}
		this.m_user.onHu();
	}
	this.c_NorTalk = function( agv ){
		/*
			这里要向桌上所有人公布消息
			json结构:
				agv.deskid
				agv.chairid
				agv.msgtype
				agv.content 只有当msgtype='text'才有
				agv.mediaid 只有当msgtype='voice'才有
		*/
		//测试:向自己公布消息( 原样返回 agv )
		//this.toC("NorTalk", agv);
		if( this.m_user!=null ) this.m_user.NorTalk(agv);
	}
	this.NewGameUser=function(data){
		//获取用户数据 uid
		if( data<=0 ){
			this.toC("onError", {"msg":"无效用户，请重新登录!"});
			//若需要重连 删除netuser
			return;
		}
		if( this.m_user!=null ){
			if( this.m_user.uid==data ) return;
			this.toC("onError", {"msg":"user 数据错误，请重新登录!"});
		}
		//判断重复
		var user=js_mj.FindUser(data);
		if(user!=null){
			if( user.netuser!=null ){
				//err不应该出现: netkey相同, 创建了两个SUser
				if( user.netuser.m_nNetKey==this.m_nNetKey ){
					console.log("[error] SUser 重复: m_nNetKey="+this.m_nNetKey+",uid="+user.uid+","+user.m_sNick);
					user.regNetuser(this,conn.remoteAddress);
					user.m_Card = this.m_Data["card"]; //变更房卡
					this.m_user=user;
					return user;
				}

				user.netuser.toC("onError", {"msg":"重复登录强迫下线"});
				user.netuser.delThis();
				//console.log("重复登录强迫下线: m_nNetKey="+user.netuser.m_nNetKey+",uid="+user.uid+","+user.m_sNick);
			}
			//重置netuser
			this.toC("onLoginOk", this.m_Data);
			user.regNetuser(this,conn.remoteAddress);
			user.m_Card = this.m_Data["card"]; //变更房卡
			this.m_user=user;
			return;
		}
		user=js_mj.FindUserByNetkey(this.m_nNetKey);
		if(user!=null){
			//err不应该出现: netkey相同, 尝试创建两个gameuser对象
			console.log("MjUser error: m_nNetKey="+this.m_nNetKey+",uid="+user.uid+","+user);

			this.toC("onError", {"msg":"另一个游戏正在运行，请稍后尝试"});
			//可尝试关闭

			return;
		}
		
		//新建gameuser
		user=new js_mjuser(this,data,conn.remoteAddress);//js_mjuser.onCreateUser(this,uid);//
		user.m_Card = this.m_Data["card"]; //变更房卡
		this.m_user=user;
		js_mj.m_vGameUser.push(user);
		this.toC("onLoginOk", this.m_Data);
		//console.log(m_vGameUser);
	}
	this.onClose=function(){
		if( this.m_user==null ){
			var user=js_mj.FindUserByNetkey(this.m_nNetKey);
			if( user==null ) return;
			this.m_user=user;
		}

		this.m_user.onNetBreak();
	}
	//获取本人参与的所有房间
	this.c_getHistory=function(){
		if(!this.m_Data)
			return;		
		var sql= "select * from stat_desk where joinuser like '%|"+this.m_Data["id"] +"|%' order by endtime desc";
		//只显示近几天的记录
		if(g_config.historydays){
			var timestamp = new Date().getTime();
			var newDate = new Date();
			newDate.setTime(timestamp - 3600 * 24 * g_config.historydays * 1000);
			sql= "select * from stat_desk where endtime>'"+ newDate.Format("yyyy-MM-dd hh:mm:ss") +"' and joinuser like '%|"+this.m_Data["id"] +"|%' order by endtime desc";
		}
		js_sql.query(sql, this, function(info){
			if(!info[0]){
				this.toC("onError", {"msg":"没有获取到任何记录!!"});
				return;
			}
			for(var i=0;i<info.length;i++){
				info[i]['startime'] = info[i]['startime'].Format("yyyy-MM-dd hh:mm:ss");
				info[i]['endtime'] = info[i]['endtime'].Format("yyyy-MM-dd hh:mm:ss");
			}
			this.toC("loadHistroy", info);
		},function(err){
			this.toC("onError", {"msg":"没有获取到任何记录!"});
		});
	}
	//获取房间内所有局简要信息
	this.c_getRound=function(agv){
		if(!this.m_Data || !agv.deskid)
			return;
		var sql= "select * from stat_round where deskid="+agv.deskid+" order by round";
		js_sql.query(sql, this, function(info){
			if(!info[0]){
				this.toC("onError", {"msg":"没有找到该房间记录!"});
				return;
			}
			for(var i=0;i<info.length;i++){
				info[i]['startime'] = info[i]['startime'].Format("yyyy-MM-dd hh:mm:ss");
				info[i]['endtime'] = info[i]['endtime'].Format("yyyy-MM-dd hh:mm:ss");
			}
			this.toC("loadDeskHistroy", info);
		},function(err){
			this.toC("onError", {"msg":"没有找到该房间记录!"});
		});
	}
	//获取回看数据
	this.c_getReplay=function(agv){
		if(!this.m_Data || !agv.replayid)
			return;
		var sql= "select * from mj_repaly where replayid='"+agv.replayid+"'";
		js_sql.query(sql, this, function(info){
			if(!info[0]){
				this.toC("onError", {"msg":"没有找到该回放记录!"});
				return;
			}
			this.toC("loadReplayHistroy", info[0]);
		},function(err){
			this.toC("onError", {"msg":"没有找到该回放记录!"});
		});
	}
	//查询在线人数
	this.c_getOnLineNum=function(agv){
		this.toC("setLineNum",{"num":js_mj.m_vGameUser.length});
	}
	this.c_getSign=function(){
		if(!g_config.signcard){
			this.toC("onError", {"msg":"活动已经结束"});
			return;
		}
		var signCount = this.m_Data.signcount;	//累计签到次数
		var signDate = this.m_Data.signdate;	//上一次签到时间
		var signtime = new Date().Format("yyyy-MM-dd 00:00:00"); //本次签到时间
		var subsec=Date.parse( signtime.toString() )-Date.parse( signDate.toString() );
		if( subsec>=48*3600*1000 ) signCount=0;
		this.toC('getSignOK',{count:signCount});
	}
	//每日签到领房卡
	this.c_sign=function(agv){
		if(!g_config.signcard){
			this.toC("onError", {"msg":"活动已经结束"});
			return;
		}
		if(!this.m_Data){
			this.toC("onError", {"msg":"无效用户，请重新登录!"});
			return;
		}
		//判断阈值
		if( this.dbak ){
			this.toC("onError", {"msg":"操作中, 请稍后"});
			return;
		}
		this.dbak = agv;				//设置阈值
		this.databak = this.m_Data;		//备份当前数据
		//失败处理
 		this.createError = function(msg){
			//多次操作数据库后 this.m_Data != this.databak 时, 可数据库回滚
			delete this.dbak;
			delete this.databak;
			this.toC("onError", {"msg":msg});
		}
		//成功处理
		this.createOk= function(){
			delete this.dbak;
			delete this.databak;
			//增加房卡刷新
			this.toC("SendUserData", {"money":this.m_Data["money"],"card":this.m_Data["card"]});
			//签到数据刷新
			this.toC("RefSignData", {"signdate": this.m_Data.signdate,"signcount":this.m_Data.signcount});
		}
		//发放房卡逻辑
		var signCount = this.m_Data.signcount;	//累计签到次数
		var signDate = this.m_Data.signdate;	//上一次签到时间
		var signtime = new Date().Format("yyyy-MM-dd 00:00:00"); //本次签到时间
		var subsec=Date.parse( signtime.toString() )-Date.parse( signDate.toString() );

		if( subsec<24*3600*1000 ){
			this.createError("今天已经签过了~~~");
			return;
		}
		if( subsec<48*3600*1000 ) signCount++;
		else signCount=1;

		var add = (signCount == 7)?2:1;
		signCount = signCount % 7;
		//变更房卡数量&签到信息
		var sql= "update b_userinfo set card=card+"+add+",signdate='"+signtime+"',signcount="+signCount+" where id="+this.m_Data["id"];
		js_sql.query(
			sql, 
			this, 
			function(){
				this.m_Data["card"] += add;
				this.m_Data["signcount"] = signCount;
				this.m_Data["signdate"] = signtime;
				this.createOk();
			},
			function(){
				this.createError("领奖失败!");
			}
		);
	}
	//分享领卡
	this.c_share = function(agv){
		if(!g_config.sharecard) return;
		if(!this.m_Data) return;
		//判断阈值
		if( this.dbak ) return;
		this.dbak = agv;				//设置阈值
		this.databak = this.m_Data;		//备份当前数据
		//失败处理
 		this.createError = function(msg){
			//多次操作数据库后 this.m_Data != this.databak 时, 可数据库回滚
			delete this.dbak;
			delete this.databak;
		}
		//成功处理
		this.createOk= function(){
			delete this.dbak;
			delete this.databak;
			if(user && user.m_Card)
				user.m_Card = this.m_Data["card"];
			//增加房卡刷新
			this.toC("SendUserData", {"money":this.m_Data["money"],"card":this.m_Data["card"]});
			this.toC("onError", {"msg":"分享成功,获得"+g_config.sharecard+"张房卡."});
		}
		//发放房卡逻辑
		var signDate = this.m_Data.signdate;	//上一次签到时间
		var signtime = new Date().Format("yyyy-MM-dd 00:00:00"); //本次签到时间
		var subsec=Date.parse( signtime.toString() )-Date.parse( signDate.toString() );
		if( subsec<24*3600*1000 ){
			this.createError("今天已经领过了~~~");
			return;
		}
		//变更房卡数量&签到信息
		var sql= "update b_userinfo set card=card+"+g_config.sharecard+",signdate='"+signtime+"' where id="+this.m_Data["id"];
		js_sql.query(
			sql, 
			this, 
			function(){
				this.m_Data["card"] += g_config.sharecard;
				this.m_Data["signdate"] = signtime;
				this.createOk();
			},
			function(){
				this.createError("领奖失败!");
			}
		);
	}
	this.c_feedBack = function(agv){
		if(!this.m_Data){
			this.toC("onError", {"msg":"无效用户，请重新登录!"});
			return;
		}
		var sdate = new Date().Format("yyyy-MM-dd hh:mm:ss");
		var sql= "INSERT INTO `mj_report` (`id`, `uid`, `nick`, `redate`, `info`) VALUES " +
			"(NULL,"+this.m_Data["id"]+",'"+this.m_Data["nickname"]+"','"+sdate+"','"+agv.info+"')";
		js_sql.query(sql, this, 
			function(info){
				this.toC("onError", {"msg":"反馈成功"});
			}
			,function(err){
				this.toC("onError", {"msg":"反馈失败"});
			});
		return;

	}
	this.c_getNoice = function(agv){
		if(!this.m_Data){
			//this.toC("onError", {"msg":"无效用户，请重新登录!"});
			return;
		}
		var sql = "SELECT * FROM `mj_gg` WHERE id >= 4 AND id <= 6 AND info<>''";
		js_sql.query(sql, this, function(info){
				if(!info[0]){
					this.toC("recNoice", []);
					return;
				}
				this.toC("recNoice", info);
			}
			,function(err){
			});
		//var sql = "SELECT * FROM `mj_node` WHERE showtime>'"+new Date().Format("yyyy-MM-dd hh:mm:ss")+"'";
	}
	this.c_getRechMsg = function(agv){
		if(!this.m_Data){
			this.toC("onError", {"msg":"无效用户，请重新登录!"});
			return;
		}
		var sql = "SELECT * FROM `mj_gg` WHERE id <= 3";
		js_sql.query(sql, this, function(info){
				if(!info[0]){
					this.toC("onShowRechDlg", {"t1":"","t2":"敬请期待","t3":""});
					return;
				}
				var t1= "";
				var t2= "";
				var t3= "";
				for(var i=0; i<info.length; i++){
					if(info[i]['id']==1) t1 = info[i]['info'];
					if(info[i]['id']==2) t2 = info[i]['info'];
					if(info[i]['id']==3) t3 = info[i]['info'];
				}
				if(t1+t2+t3=="") t2 = "敬请期待";
				this.toC("onShowRechDlg", {"t1":t1,"t2":t2,"t3":t3});
			}
			,function(err){
			});
	}
}
SUser.prototype.loadDBErr = function(err){
	console.log(("db err : " + err.code).red);
	console.log(err);
	this.toC("onError", {"msg":"get data err !"});
}
SUser.prototype.loadDBOk = function(info){
	this.m_Data = info[0];
	if( !this.m_Data ){
		this.toC("onError", {"msg":"账号错误"});
		return;
	}
	if( this.m_Data["black"]==1 ){
		this.toC("onError", {"msg":"账号处于冻结状态, 请联系管理员"});
		return;
	}
	js_sql.query("INSERT INTO `log_login` (`id`,`openid`,`dodate`,`info`) VALUES (NULL,'"+this.m_Data["openid"]+"', '"+new Date().Format("yyyy-MM-dd")+"', 'LG')", this,  null, null);
	//this.m_Data = {id:0,nickname:"",headurl:""};
	this.NewGameUser(this.m_Data.id);
	//if(this.m_Data) this.toC("onLoginOk", this.m_Data);
	//else this.toC("onError", {"msg":"error key !"});
}
SUser.prototype.addDBErr = function(err){
	this.toC("onError", {"msg":"用户名重复"});
}
SUser.prototype.addDBOk = function(info){
	this.toC("onRegOk", {"msg":"注册成功"});
	if(g_config.regcard)
		this.toC("onError", {"msg":"欢迎来到"+g_config.appname+",新用户奖励"+g_config.regcard+"张房卡,祝您游戏愉快!"});
}
js_util.inherits(SUser, js_user);

function checkOnline()
{
	js_sql.query("SELECT count(*) as num FROM b_userinfo WHERE isol=1", this, function(info){
		if(!info[0]) return;
		js_sql.query("INSERT INTO b_onlinenum (`id`,`num`,`nodedate`,`nodetime`) VALUES (NULL,"+info[0]['num']+",'"+new Date().Format("yyyy-MM-dd")+"','"+new Date().Format("hh:mm:ss")+"')",
			function(err, info){
				try{
					if(err) {
						console.log("DB error 201 : ".red);	
						console.log(err);
					}
				}catch(e){
					console.log(e);
				}
			},null);
		},null);
	//每五分钟统计一次在线人数
	setTimeout( checkOnline , 300000);
}
setTimeout( checkOnline , 10000);