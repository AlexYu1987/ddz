var js_util = require('util');
var js_base = require('./baseobj');
var js_mj = require('./mjctrl');
var js_pai = require('./game/pai');
var js_sql = require('../net/db/db');

module.exports = MjUser;

function MjUser (suser,uid,ip){
	js_base.call(this);
	this.name="MjUser";
	this.uuid = Math.floor( Math.random()*10000 + 1);

	this.start=false;
	this.ip=ip;
	this.lat=0;
	this.lon=0;

	this.netuser=null;
	this.outtime=0;
	this.uid=-1;
	this.deskctrl=null;
	this.chairid=-1;
	this.tyclose=false;

	this.m_sNick="testuser";
	this.m_sHead="test";
	this.m_nSex=0;
	this.m_Money=0;
	this.m_Card=0;		//房卡
	this.m_CloseDesk=0;

	this.m_Pai=null;
	this.m_nFen=100;
	this.m_Action={eve:"non",param:null};
	this.m_Record={lose:0,win:0,ping:0,score:0};
	this.m_Cur={lose:0,win:0,ping:0,score:0,sumscore:0,jiegang:0,diangang:0};

	this.m_Num={zimo:0,jie:0,pao:0,agang:0,mgang:0,waibao:0};
	this.vgang={gang:0,vgang:[],diangang:[]};

	this.onInit=function (netuser,uid,ip){
		this.tr("onInit:uid="+uid);
		this.tr(JSON.stringify(netuser.m_Data));
		this.start=false;
		this.uid=uid;
		this.m_nFen=100;
		this.m_Cur={lose:0,win:0,ping:0,score:0,sumscore:0,jiegang:0,diangang:0};
		this.m_Num={zimo:0,jie:0,pao:0,agang:0,mgang:0,waibao:0};
		this.m_sNick=netuser.m_Data.nickname;
		this.m_sHead=netuser.m_Data.headurl;
		this.m_nSex=netuser.m_Data.sex;
		this.m_Record.lose=netuser.m_Data.failcount;
		this.m_Record.win=netuser.m_Data.wincount;
		this.m_Record.ping=netuser.m_Data.tiecount;
		if( !netuser.m_Data.score ) this.m_Record.score=0;
		else this.m_Record.score=netuser.m_Data.score;
		this.m_Money=netuser.m_Data.money;
		this.outtime=0;
		this.regNetuser(netuser,ip);
	}
	this.isNetUser=function(){
		if( this.uid<=0 ) return false;
		if( this.netuser==null ) return false;
		return true;
	}
	this.onNetBreak=function(){
		if(!this.outtime){
			var loc=new Date();
			this.outtime=Date.parse(loc)/1000;
		}
		this.netuser=null;
		this.tr("onNetBreak:"+this.uid+","+this.m_sNick);
		if( this.deskctrl!=null ){
			//this.deskctrl.NetBreakTimer();
			this.deskctrl.SendUser({event:"break",chairid:this.chairid});
			this.onUserQuitDesk(this.deskctrl.deskid);
			//下线变更, 用户在房间内时
			js_sql.query("update b_userinfo set `isol`=0 where `id`="+this.uid, this, null, null);
			return;
		}
		//删除user
		this.PreDelUser();
		//if( this.deskctrl.QuitDesk(this)>0 ) 
		//	this.PreDelUser();
	}
	this.regNetuser=function (netuser,ip){
		this.tr("regNetuser:uid="+this.uid);
		this.ip=ip;
		this.netuser=netuser;
		this.tyclose=false;
		this.outtime=0;
		if( this.deskctrl!=null ){
			if( this.onUserJoinDesk(this.deskctrl.deskid,this.deskctrl.key) ){
				this.deskctrl.SendState({event:"regNetuser"});
				this.deskctrl.SendDesk({event:"regNetuser"});
				if( this.deskctrl.m_nGameState ) this.SendSelf({event:"regNetuser"});
				if( !this.start && this.deskctrl.m_HuData!=null )
					this.toC("HuPai",this.deskctrl.m_HuData);
				if( this.deskctrl.m_nGameState && this.start && this.deskctrl.m_CurUser!=null ){
					if( this.deskctrl.m_CurUser==this ){
						if( this.m_Pai.ting ){
							if( this.m_Pai.mopai ){
								var pai=this.m_Pai.mopai;
								if( this.m_Pai.isGang(this,pai) ) this.toC("isGang",{paiid:pai.id,flag:4});
								if( this.m_Pai.isJiaGang(this,pai) ) this.toC("isGang",{paiid:pai.id,flag:5});
								this.SendHu(pai,null);
							}
						}
					}else{
						if( this.deskctrl.m_nGameState==2 ){
							if( this.m_Pai.ting ){
								var outpai=this.deskctrl.m_CurUser.m_Pai.outpai;
								if( this.m_Action.ishu==1 && this.m_Action.eve=="wait" ){
									this.SendHu(outpai,outpai);
								}
								if( this.m_Pai.isGang(this,outpai) ) this.toC("isGang",{paiid:outpai.id,flag:3});
							}
						}
					}
				}
			}
		}
		this.SendUserData();
		//上线变更
		js_sql.query("update b_userinfo set `isol`=1, `loginip`='"+this.ip+"' where `id`="+this.uid, this, null, null);
	}
	this.isInDesk=function(deskid){
		if( this.deskctrl==null ) return 0;
		var desk=this.deskctrl;
		this.chairid=desk.isInDesk(this);
		if( desk.deskid==deskid ){//进入老桌子

			if( !this.UserJoinDesk(desk) ){ 
				if( this.chairid<0 ) return -1;
				desk.DelUserByID(this.chairid); 
				return -1; 
			}
			return 1;
		}
		if( !js_mj.isUseDesk(desk) ){
			this.deskctrl=null;
			return 0;
		}
		if( this.chairid<0 ){//不在桌子内

			this.deskctrl=null;
			return 0;
		}
		if( this.UserJoinDesk(desk) ) return 1//进入老桌子

		desk.DelUserByID(this.chairid);//退出

		return 0;
	}
	this.onUserJoinDesk=function (deskid,key){		
		var re=this.isInDesk(deskid);
		if( re==1 ){
			this.toC("OnJoinDeskOk", {deskid:deskid,'key':key});
			return true;
		}else if( re==-1 ) return false;

		this.deskctrl=null;
		
		var desk=js_mj.findDesk(deskid);
		if( desk==null ){
			this.toC("onError", {"msg":"onUserJoinDesk:创建桌子失败"});
			return false;
		}
		if( this.UserJoinDesk(desk) ){
			this.tr("onUserJoinDesk:uid="+this.uid+","+this.m_sNick);
			return true;
		}
		return false;
	}
	this.UserJoinDesk=function (desk){
		var r=false;
		var re=desk.JoinDesk(this);
		switch(re[0]){
			case 1://成功加入
			case 2://用户已加入

				this.deskctrl=desk;
				this.chairid=re[1];
				this.toC("OnJoinDeskOk", {deskid:desk.deskid,'key':desk.key});
				r=true;
				break;
			case -10://已满
				this.toC("onError", {"msg":"人满了，新开一桌吧~~~"});
				break;
			case -100://游戏已经开始,新用户不可进入

				this.toC("onError", {"msg":"已经开始了，请到别桌试试~~~"});
				break;
			case -101://桌子已经关闭
				this.toC("onError", {"msg":"很抱歉，桌子已经关闭啦~~~"});
				break;
		}
		this.tr("JoinDesk:"+this.chairid);
		//更新数据
		return r;
	}
	this.onUserQuitDesk=function ( deskid ){		
		if( this.deskctrl==null ) return;
		if( deskid<=0 ) return;
		if( deskid!=this.deskctrl.deskid ){
			this.toC("onError", {"msg":"QuitDesk err 数据错误"});
			return;
		}
		var re=this.deskctrl.QuitDesk(this,false);
		if( re==0 ){
			//游戏已经开始,无法退出

			this.toC("onError", {"msg":"QuitDesk err 游戏已经开始，将无法退出"});
		}
	}
	this.onQuiteOk=function(isowner){
		if( isowner ) this.start=false;
		else{
			this.deskctrl=null;
			this.start=false;
			this.m_CloseDesk=0;
			this.chairid=-1;
			this.m_Pai=null;
		}
		this.toC("OnQuiteDeskOk",{uid:this.uid,nick:this.m_sNick});
	}
	this.onUserCloseDesk=function( deskid, att ){
		if( this.deskctrl==null ) return;
		if( deskid<=0 ) return;
		if( deskid!=this.deskctrl.deskid ){
			this.toC("onError", {"msg":"QuitDesk err 数据错误"});
			return;
		}
		var re=this.deskctrl.UserCloseDesk(this,att);
		switch(re){
			case -1:
			case -2:
			case -3:
			case 0: //游戏已经开始,无法退出

				this.toC("onError", {"msg":"申请解散失败"}); break;
			case -10: //等待大家同意
				this.toC("onError", {"msg":"桌主在线，请桌主申请解散"}); break;
		}
	}

	this.onTryClose=function(){
		if( this.deskctrl==null ) return;	
		this.deskctrl.TryCloseDesk(this.chairid);
	}

	this.onGameStart=function(lat, lon){ 
		this.lat= lat;
		this.lon= lon;
		if( this.deskctrl==null ) return;	
		this.start=true;
		this.vgang={gang:0,vgang:[],diangang:[]};
		this.ClearAction();
		this.deskctrl.onGameStart(this);
		if( this.deskctrl==null ) return;	
		this.deskctrl.SendState(null);
	}
	this.InitGame=function(vpai){
		this.outtime=0;
		this.m_Cur.jiegang=0;
		this.m_Cur.diangang=0;
		this.m_Pai=new js_pai(); 
		if( vpai.length<13 ){
			this.err("InitUserPai:["+vpai.length+"<13]"+vpai);
			return;
		}
		this.m_Pai.vpai=vpai;
		//this.SendSelf({event:"gamestart"});
	}
	this.onGameEnd=function(){
		this.start=false;
		this.ClearAction();
	}
	this.onMoPai=function(){
		if( this.deskctrl==null ) return;	
		//this.tr("onGameStart:"+this.deskid);
		var re=this.deskctrl.MoPai(this,0,null);
		//刷新自己 
		if( re==null ) return;
		this.SendSelf(re);
		//this.toC("MuoPai:"+this.m_Pai.mopai);
	}
	this.onChuPai=function(paiid){
		this.tr("onChuPai:["+paiid+"]");
		if( this.deskctrl==null ) return;	
		if( this.m_Pai==null ) return;
		if( paiid<0 ) return;
		
		if( this.m_Pai.ting ) return;
		var re=this.deskctrl.ChuPai(this,paiid);
		if( re==null ){
			this.err("onChuPai:["+paiid+"]");
			return;
		}
		//this.toC("ChuPai",{mopai:this.m_Pai.mopai});
	}
	this.onPeng=function( paiid ){
		if( paiid<0 ) return;
		if( this.deskctrl==null ) return;	
		if( this.m_Pai==null ) return;

		this.m_Action.eve="PengPai";
		this.m_Action.param=paiid;
		this.deskctrl.RunAction();
		//this.deskctrl.PengPai( this, paiid );
	}
	this.onChiPengOk=function(re){
		this.SendSelf(re);
	}
	this.onGang=function( paiid, flag ){
		if( paiid<0 ) return;
		if( this.deskctrl==null ) return;	
		if( this.m_Pai==null ) return;
		if( this.deskctrl.m_CurUser==null ) return;

		if( this.deskctrl.m_CurUser.uid==this.uid ){
			if( this.deskctrl.JiaGangPai(this, paiid)==null )
				this.deskctrl.GangPai( this, paiid, 1 );
		}else {
			this.m_Action.eve="GangPai";
			this.m_Action.param=paiid;
			this.deskctrl.RunAction();
		}
	}
	this.onGangOk=function(re,pai){
		this.SendSelf(re);
		
		re=this.deskctrl.MoPai(this,1,null);
		if( re==null ) return;
		this.SendSelf(re);
		if( re['event']=='wait' ) return;

		if( this.m_Pai.ting ){
			if( this.m_Pai.isGang(this.m_Pai.mopai) ) 
				this.toC("isGang",{paiid:this.m_Pai.mopai.id,flag:4});
			else if( this.m_Pai.isJiaGang(this.m_Pai.mopai) ) 
				this.toC("isGang",{paiid:this.m_Pai.mopai.id,flag:5});
			else 
				if( !this.m_Pai.isTingPai(this.m_Pai.mopai) ){ 
					var user=this;
					setTimeout( function(){user.deskctrl.ChuPai(user,user.m_Pai.mopai.id,null,null);}, 2000 );
				}
		}
	}
	this.onBaoTing=function(){
		if( this.deskctrl==null ) return;	
		if( this.m_Pai==null ) return;

		this.deskctrl.BaoTing(this);
	}
	this.onBaoTingOk=function(){
		if( this.deskctrl==null ) return;	
		if( this.m_Pai==null ) return;

		this.deskctrl.BaoTingOk(this);
	}
	this.onUserNotChi=function(){
		if( this.deskctrl==null ) return;
		if( this.m_Pai==null ) return;
		
		this.m_Action.eve="non";
		this.m_Action.param=null;
		this.deskctrl.NotChi();
	}
	this.onHu=function(){
		if( this.deskctrl==null ) return;	
		if( this.deskctrl.m_CurUser==null ) return;
		if( this.deskctrl.m_nGameState==1 ){
			if( this.deskctrl.m_CurUser.uid!=this.uid ){
				this.tr("JiaGangHu:"+JSON.stringify(this.m_Action));
				if( this.m_Action.eve=="JiaGangHu" && this.m_Action.ishu==1 ){//判断抢杠胡

					this.deskctrl.JiaGangHu( this, this.m_Action.param );
					return;
				}
			}
			this.deskctrl.HuPai( this );
			return;
		}

		this.m_Action.eve="HuPai";
		this.m_Action.param=null;
		this.deskctrl.RunAction();
	}
	this.ClearAction=function(){
		this.m_Action.eve="non";
		this.m_Action.param=null;
		this.m_Action.ishu=0;
		this.m_Action.ispeng=0;
		this.m_Action.isgang=0;
		this.m_Action.isting=0;
	}
	this.toC=function (fun,data){
		if( this.netuser==null ){
			//this.err("toC(onNetBreak):"+this.uid+"["+JSON.stringify(data)+"]");
			//this.onNetBreak(); 打开会死循环
			return;
		}
		this.netuser.toC(fun,data); 
	}
	this.GameRecord=function(flag,fen){//0 平 1 赢 -1 输

		switch(flag){
		case 0: this.m_Record.ping++; this.m_Cur.ping++; break;
		case 2:
		case 1: this.m_Record.win++; this.m_Cur.win++; break;
		case -1: this.m_Record.lose++; this.m_Cur.lose++; break;
		}
		this.m_Record.score+=fen;
		this.m_Cur.sumscore+=fen;
		this.m_Cur.score=fen;
		
		this.onDBSave();
	}
	this.GetLoseData=function(pai,sumfan,fan,gang,flag,x3){
		var win=0;
		var data={};
		data['vpai']=this.m_Pai.GetMiniVPai(this.m_Pai.vpai);
		data['fan']=0;
		data['subfan']=0;
		data['gang']=0;
		data['chair']=this.chairid;
		data['rhua']=this.m_Pai.ranhua;
		data['yhua']=this.m_Pai.GetHuaNum();
		this.m_Pai.vfan=[];

		if(pai==null){ //荒庄
			win=0;
			//if( this.deskctrl.m_Rule.game=='XF' && this.deskctrl.m_Rule.chadajiao )
			data['zfen']=sumfan;
		}else{
			if(flag){
				if(sumfan){
					if( sumfan>this.m_nFen ) sumfan=this.m_nFen;
					win=-1;
					data['subfan']=sumfan;
					if(x3){
						this.m_Pai.vfan.push({name:"包胡","fan":0});
					}
				}else win=0;
				data['zfen']=-sumfan;
			}else if( pai.from>0 ){
				if( pai.from!=this.uid ){
					win=0;
					data['zfen']=0;
				}else{// 点炮
					win=-1;
					data['pao']=1;
					if( sumfan>this.m_nFen ) sumfan=this.m_nFen;
					this.m_Pai.vfan.push({name:"点炮","fan":0});
					data['zfen']=-sumfan;
					data['subfan']=sumfan;
				}
			}else{
				win=-1;
				if( sumfan>this.m_nFen ) sumfan=this.m_nFen;
				data['zfen']=-sumfan;
				data['subfan']=sumfan;
			}
		}
		data['jiegang']=this.m_Cur.jiegang;
		data['diangang']=this.m_Cur.diangang;

		this.m_nFen+=data['zfen'];
		data['vfan']=this.m_Pai.vfan.concat(this.m_Pai.vgangname);
		data['deskfen']=this.m_nFen;
		data['deskzimo']=this.m_Num.zimo;
		data['deskjie']=this.m_Num.jie;
		data['deskpao']=this.m_Num.pao;
		data['deskagang']=this.m_Num.agang;
		data['deskmgang']=this.m_Num.mgang;
		data['deskwaibao']=this.m_Num.waibao;
		this.GameRecord(win,data['zfen']);
		return data;
	}
	this.GetWinData=function(pai,sumfan,fan,gang){
		var data={};
		data['gang']=0;
		data['chair']=this.chairid;
		data['vpai']=this.m_Pai.GetMiniVPai(this.m_Pai.vpai);
		data['win']=1;
		data['fan']=fan;
		data['subfan']=0;
		data['rhua']=this.m_Pai.ranhua;
		data['yhua']=this.m_Pai.GetHuaNum();
		data['zfen']=sumfan;
		data['paixing']=this.m_Pai.GetPaiXing(null,null);
		data['vfan']=this.m_Pai.vfan;
		data['jiegang']=this.m_Cur.jiegang;
		data['diangang']=this.m_Cur.diangang;

		this.m_nFen+=data['zfen'];
		data['deskfen']=this.m_nFen;
		data['deskzimo']=this.m_Num.zimo;
		data['deskjie']=this.m_Num.jie;
		data['deskpao']=this.m_Num.pao;
		data['deskagang']=this.m_Num.agang;
		data['deskmgang']=this.m_Num.mgang;
		data['deskwaibao']=this.m_Num.waibao;
		if( this.deskctrl.m_BiXia[0] ) this.GameRecord(2,data['zfen']);
		else this.GameRecord(1,data['zfen']);
		return data;
	}
	this.GetScoreData=function(sumfan,fan,rhua,win){
		var data={};
		data['gang']=0;
		data['chair']=this.chairid;
		data['vpai']=this.m_Pai.GetMiniVPai(this.m_Pai.vpai);
		data['win']=win;
		data['fan']=fan;
		data['subfan']=0;
		if( (sumfan+this.m_nFen)<0 ) sumfan=-this.m_nFen;
		if( sumfan<0 ) data['subfan']=-sumfan;
		data['rhua']=this.m_Pai.ranhua;
		data['yhua']=this.m_Pai.GetHuaNum();
		data['zfen']=sumfan;
		if( win>0 ){
			data['paixing']=this.m_Pai.GetPaiXing(null,null);
			data['vfan']=this.m_Pai.vfan;
		}
		data['jiegang']=this.m_Cur.jiegang;
		data['diangang']=this.m_Cur.diangang;

		this.m_nFen+=data['zfen'];
		data['deskfen']=this.m_nFen;
		data['deskzimo']=this.m_Num.zimo;
		data['deskjie']=this.m_Num.jie;
		data['deskpao']=this.m_Num.pao;
		data['deskagang']=this.m_Num.agang;
		data['deskmgang']=this.m_Num.mgang;
		data['deskwaibao']=this.m_Num.waibao;
		this.GameRecord(win,data['zfen']);
		return data;
	}

	this.PreDelUser=function (){
		this.toC("PreDelUser",{user:this.uid,nick:this.m_sNick});
		this.tyclose=true;
		this.onDBSave(1); //用户下线
	}
	this.onDBSave=function(down){
		if(down){
			var sql="update b_userinfo set `score`="+this.m_Record.score+
											",`failcount`="+this.m_Record.lose+
											",`wincount`="+this.m_Record.win+
											",`tiecount`="+this.m_Record.ping+
											",`isol`=0"+ //下线变更, 用户不在房间内时
				" where `id`="+this.uid;
		}else{
			var sql="update b_userinfo set `score`="+this.m_Record.score+
											",`failcount`="+this.m_Record.lose+
											",`wincount`="+this.m_Record.win+
											",`tiecount`="+this.m_Record.ping+
				" where `id`="+this.uid;
		}
		this.tr("onDBSave:"+sql);
		js_sql.query(sql, this, this.onDBSaveOk, this.onDBSaveErr);
	}
	this.onDBSaveOk=function (){
		if( this.tyclose ){
			this.toC("tyclose",{user:this.uid,nick:this.m_sNick});
			js_mj.UnRegGameUser(this.uid);
			this.delThis(); 
		}
	}
	this.onDBSaveErr=function(err){
		this.err("onDBSaveErr:"+err);
	}
	this.GetRecData=function(flag){
		var data={};
		data['uid']=this.uid;
		data['nick']=this.m_sNick;
		data['head']=this.m_sHead;
		data['sex']=this.m_nSex;
		if( flag=="desk" ) data['score']=this.m_Cur.sumscore;
		else data['score']=this.m_Cur.score;
		return data;
	}
	this.GetDeskData=function(){
		var data={};
		data['vpai']=[];
		data['tingpai']=[];
		data['hua']=0;
		if( this.m_Pai==null ){
			this.err("SendSelf:uid="+this.uid+"[pai=null]");
			data['showpai']=null;//吃 2 碰 3 杠

			data['voutpai']=null;
			data['pai']=null;
		}else{
			data['showpai']=this.m_Pai.GetMiniShowPai(this.m_Pai.showpai);//吃 2 碰 3 杠

			data['voutpai']=this.m_Pai.GetMiniVPai(this.m_Pai.voutpai);
			data['pai']=this.m_Pai.vpai.length;
			if( this.m_Pai.ting ){
				if( this.m_Pai.tingpai.length>0 ){
					data['tingpai']=this.m_Pai.tingpai[0].ting;
				}
			}
		}
		return data;
	}
	this.GetUserData=function(){
		var data={};
		data['ip']=this.ip;
		data['uid']=this.uid;
		data['nick']=this.m_sNick;
		data['head']=this.m_sHead;
		data['sex']=this.m_nSex;
		data['fen']=this.m_nFen;
		if(this.start) data['start']=1; else data['start']=0;
		data['net']=0;
		if( this.netuser!=null ) data['net']=1;
		data['ting']=0;
		if( this.m_Pai!=null )
			if( this.m_Pai.ting ) data['ting']=1;
		data['card']=this.m_Card;
		data['lat']=this.lat;
		data['lon']=this.lon;
		return data;
	}
	this.SendSelf=function(action){
		if( this.m_Pai==null ){
			this.err("SendSelf:uid="+this.uid+"["+action+"]");
			return;
		}
		if( this.deskctrl==null ) return;
		//if( this.deskctrl.m_nGameState==0 ) return;

		var data={};
		data['vpai']=this.m_Pai.GetMiniVPai(this.m_Pai.vpai);
		data['mopai']=this.m_Pai.GetMiniPai(this.m_Pai.mopai);
		data['action']=action;
		this.toC("SelfPai",data);
	}
	this.SendHu=function(hupai,outpai){
		if( this.deskctrl==null ) return;
		if( this.m_Pai==null ){
			this.err("SendSelf:uid="+this.uid+"["+action+"]");
			return false;
		}
		if( this.m_Pai.genpai && (hupai['from']!=this.uid) ){
			this.tr("跟胡:"+JSON.stringify( this.m_Pai.genpai ));
			return false;
		}

		this.tr(JSON.stringify(this.deskctrl.m_Rule));
		this.tr("outpai:"+JSON.stringify(outpai));
		if( !this.m_Pai.isWaiBao(this.deskctrl,this,outpai) ){
			if( !this.m_Pai.isHu(this.deskctrl,null,outpai) ) return false;
		}
		this.toC("SelfHu",hupai);
		return true;
	}
	this.SendUserData=function(){
		var data={};
		data['money']=this.m_Money;
		data['card']=this.netuser.m_Data.card;
		this.toC("SendUserData",data);
	}
	this.NorTalk=function(agv){
		if( this.deskctrl==null ) return;
		this.deskctrl.SendAll("NorTalk",agv);
	}
	this.AddGangFen=function(id){
		//this.tr("AddGangFen:"+id);
		if( id<0 || id>=this.m_Pai.showpai.length ) return;
		var diangang=this.GetGangFen(this.m_Pai.showpai[id],false);
		var fan=0;
		var szuser=this.deskctrl.m_vUser;
		var user;
		for( var i=0; i<diangang.length; i++ ){
			fan+=diangang[i].fan;
			if( diangang[i].from>=0 && diangang[i].from<szuser.length )
				szuser[diangang[i].from].m_nFen-=diangang[i].fan;
		}
		//this.tr("AddGangFen:"+JSON.stringify(diangang));
		//this.tr("AddGangFen:"+fan);
		this.m_nFen+=fan;
		if(this.deskctrl!=null) this.deskctrl.SendUser(null);
		if( this.deskctrl.IsEnd() ){
			this.deskctrl.GameWin(null,null);
			this.deskctrl.GameEnd();
		}
	}
	this.GetGangFen=function(pai,is){
		if( pai==null || pai.length<2 ) return [];

		var fan=1;
		if( this.deskctrl.m_BiXia[0] ) fan=2;
		var j, user;
		var diangang=[];
		switch(pai[0].flag){
		case 3:
				fan*=10;
				this.m_Num.mgang++;
				this.m_Cur.jiegang++;
				this.vgang['vgang'].push(pai[0]);
				for( j=0; j<pai.length; j++ ){
					if( pai[j].from==0 ) continue;
					user=this.deskctrl.FindUser(pai[j].from);
					if( user==null || user.m_Pai==null ) continue;

					user.m_Cur.diangang++;
					if( user.m_nFen<fan ) fan=user.m_nFen;
					this.vgang['gang']+=fan;
					if(is){
						user.m_Pai.AddVgangname({name:"点杠","fan":0});
						this.m_Pai.AddVgangname({name:"接杠","fan":0});
					}
					return [{from:user.chairid,fan:fan}];
				}
				break;
		case 4:
				fan*=5;
				var sub=fan;
				this.m_Num.agang++;
				this.vgang['vgang'].push(pai[0]);
				for( j=0; j<this.deskctrl.m_vUser.length; j++ ){
					if( this.deskctrl.m_vUser[j].uid==this.uid ) continue;
					if( this.deskctrl.m_vUser[j].m_nFen<fan ) sub=this.deskctrl.m_vUser[j].m_nFen;
					diangang.push({from:j,fan:sub});
					this.vgang['gang']+=sub;
				}
				if(is) this.m_Pai.AddVgangname({name:"暗杠","fan":0});
				return diangang;
		case 5:
				fan*=10;
				this.m_Num.mgang++;
				this.m_Cur.jiegang++;
				this.vgang['vgang'].push(pai[0]);
				for( j=0; j<pai.length; j++ ){
					if( pai[j].from==0 ) continue;
					user=this.deskctrl.FindUser(pai[j].from);
					if( user==null || user.m_Pai==null ) continue;

					user.m_Cur.diangang++;
					if( user.m_nFen<fan ) fan=user.m_nFen;
					this.vgang['gang']+=fan;
					if(is){
						user.m_Pai.AddVgangname({name:"点二次杠","fan":0});
						this.m_Pai.AddVgangname({name:"二次杠","fan":0});
					}
					return [{from:user.chairid,fan:fan}];
				}
				break;
		}
		return diangang;
	}
	this.GetGang=function(){
		var fan;
		var user;
		var pai,j;
		var diangang=[];
		this.m_Cur.jiegang=0;
		this.vgang={gang:0,vgang:[],diangang:[]};
		for( var i=0; i<this.m_Pai.showpai.length; i++ ){
			diangang=diangang.concat(this.GetGangFen(this.m_Pai.showpai[i],true));
		}
		this.tr("diangang:"+JSON.stringify(diangang));
		var sz=[0,0,0,0];
		for( i=0; i<diangang.length; i++ ){
			sz[diangang[i].from]-=diangang[i].fan;
		}
		this.vgang.diangang=sz;
		this.tr("this.vgang:"+JSON.stringify(this.vgang));
		this.tr("vgangname:"+JSON.stringify(this.m_Pai.vgangname));
	}
	this.onInit(suser,uid,ip);
}
js_util.inherits(MjUser, js_base);

