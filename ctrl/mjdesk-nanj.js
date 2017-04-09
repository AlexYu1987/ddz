var js_util = require('util');
var js_base = require('./baseobj');
var js_ctrl = require('./mjctrl');
var js_sql = require('../net/db/db');

module.exports = MjDesk;
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

function MjDesk(id,key,ownerid,rule,num){
	js_base.call(this);
	this.name="MjDesk";

	this.m_nMaxUser=4;
	this.m_nMaxNum=8;
	this.t_out=11;
	this.m_pOutTimer=null;

	this.deskid=id;
	this.key=key;
	this.ownerid=ownerid;
	this.m_vUser=Array(this.m_nMaxUser);
	this.m_nState=0;//游戏开始 1 游戏等待中 0 一局结束等待2 无效桌子 -1
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
	this.InitDesk=function(rule){
		var def={game:"nanj",num:1};
		this.m_Rule=def;
		this.m_nMaxNum=this.m_Rule.num*4;
		if( rule==null ) return;

		if( rule['num'] ) 
			if( rule.num==4 ) this.m_Rule.num=4;
		this.m_nMaxNum=this.m_Rule.num*4;
		this.tr("rule:"+JSON.stringify(this.m_Rule));
	}
	this.InitDesk(rule);
	this.JoinDesk=function(user){
		if( user==null ) return [-1,0];//用户错误
		if( this.m_nState==-1 ) return [-101,0];//桌子已经关闭

		var action={};
		var chairid=-1;
		var p;
		for( var i=0; i<this.m_vUser.length; i++ ){
			p=this.m_vUser[i];
			if( p==null ){ 
				if( chairid<0 ) chairid=i;//空位
				continue;
			}
			if( p.uid==user.uid ){ 
				action={event:"join",chairid:i};
				this.SendUser(action); 
				return [2,i];
			}//已在桌子内，老用户重进
		}
		if( chairid<0 ) return [-10,0];//已满
		if( this.m_nState>0 ) return [-100,0];//游戏已经开始,新用户不可进入，老用户可重进

		this.m_vUser[chairid]=user;
		user.m_nFen=100;
		//同步数据
		action={event:"join",chairid:chairid};
		this.SendUser(action);
		return [1,chairid];
	}
	this.QuitDesk=function(user,close){
		if( user==null ) return -1;//用户错误
		if( this.m_nState>0 ){//游戏已经开始
			this.SendUser(null);
			return 0;
		}
		var cid=this.isInDesk(user);
		if( cid==-1 ) return 2;//未找到用户
		if( close ){
			this.DelUserByID(cid);
		}else{
			if( this.ownerid!=user.uid ) this.DelUserByID(cid);
			else this.m_vUser[user.chairid].onQuiteOk(true);
		}
		//同步数据
		action={event:"out",chairid:cid};
		this.SendUser(action);
		return 1;
	}
	this.DelUserByID=function (chairid){
		if( this.m_nState>0 ) return;//游戏已经开始
		if( chairid<0 || chairid>=this.m_vUser.length ) return;
		if( this.m_vUser[chairid]==null ) return; 
		var desk=this.m_vUser[chairid].deskctrl;
		if(desk!=null){
			if(desk.deskid==this.deskid) this.m_vUser[chairid].onQuiteOk(false);
		}
		this.m_vUser[chairid]=null;
	}
	this.isInDesk=function(user){
		if( user==null ) return -1;//用户错误
		if( user.chairid>=0 && user.chairid<this.m_vUser.length ){
			if( this.m_vUser[user.chairid]!=null ){
				if(  this.m_vUser[user.chairid].uid==user.uid ) return user.chairid;
			}
		}
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			if( this.m_vUser[i].uid!=user.uid ) continue;
			return i;
		}
		return -1;
	}
	this.ClearUser=function (){
		if( this.m_nState>0 ) return;
				
		clearTimeout(this.m_pOutTimer);
		for( var i=0; i<this.m_vUser.length; i++ ){
			this.DelUserByID(i);
		}
	}
	this.TryCloseDesk=function(chairid){
		this.m_nState=-1;

		this.DelUserByID(chairid);
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]!=null ) return;
		}
		this.ClearUser();
	}
	this.m_LeftClose=300;
	this.m_AskCloseId=0;
	this.m_UserTryClose=false;
	this.UserCloseTimer=null;
	this.UserCloseDesk=function (user,att){
		this.tr("UserCloseDesk:"+att);
		if( user==null ) return -1;//用户错误
		if( this.m_nState<0 ){
			if( user.uid!=this.ownerid ) return -2;
			this.ClearUser();
			this.DeskClose();
			return 1;
		}
		if( this.m_nState==0 && this.m_nLunNum==0 ){
			if( user.uid!=this.ownerid ) return -2;
			this.m_nState=-1;
			var add=this.m_Rule.num;
			var sql= "update b_userinfo set card=card+"+add+" where id="+user.uid;
			this.tr("UserCloseDesk:"+sql);
			js_sql.query(sql, this, function(){ 
				if(user.netuser!=null) user.netuser.m_Data.card+=add; 
				user.SendUserData();
				this.ClearUser();
				this.DeskClose();
				this.tr("UserAddCardOk");
				//退卡记录
				sql= "INSERT INTO `log_card` (`id`, `uid`, `dodate`, `dotime`, `num`) VALUES (NULL, '"+user.uid+"', '"+new Date().Format("yyyy-MM-dd")+"', '"+ new Date().Format("hh:mm:ss")+"', -"+add+");";
				js_sql.query(sql, this, null, null);
			} , this.SetDBStateErr);
			return 1;
		}
		this.tr("this.UserCloseDesk:"+this.m_UserTryClose);
		//游戏已经开始
		var ask=[0,0,0,0];
		var userid=[0,0,0,0];
		if( this.m_UserTryClose==false ){
			if( att!="agree" ) return -3;
			this.m_AskCloseId=user.uid;
			this.m_UserTryClose=true;

			var a=this;
			this.m_LeftClose=300;
			this.UserCloseTimer=setInterval( function(){
				a.m_LeftClose--;
				if( a.m_LeftClose<1 ){
					clearInterval(a.UserCloseTimer);
					a.m_HuData=Array(a.m_vUser.length);
					for( var i=0; i<a.m_vUser.length; i++ ){				
						if( a.m_vUser[i]==null ) continue;
						a.m_HuData[i]=a.m_vUser[i].GetLoseData(null,0,0,0,false,0);
						a.m_HuData[i]['score']=a.m_vUser[i].m_Num;
					}		
					a.GameEnd();
					a.AddBack('huang',0,0);
					a.SaveBack();
					a.m_nState=-1;
					a.ClearUser();
					a.DeskClose();
				}
			}, 1000 );
		}else{
			if( att!="agree" ){
				this.m_UserTryClose=false;
				user.m_CloseDesk=-1;
				for( var i=0; i<this.m_vUser.length; i++ ){
					if( this.m_vUser[i]==null ) continue;
					ask[i]=this.m_vUser[i].m_CloseDesk;
					userid[i]=this.m_vUser[i].uid;
				}
				this.SendAll("onAskClose",{asker:this.m_AskCloseId,user:userid,close:ask,time:this.m_LeftClose});
				this.m_AskCloseId=0;
				clearInterval(this.UserCloseTimer);
				for( i=0; i<this.m_vUser.length; i++ ){
					if( this.m_vUser[i]==null ) continue;
					this.m_vUser[i].m_CloseDesk=0;
				}
				return 1;
			}
		}
		var hav=false;
		user.m_CloseDesk=1; 			
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			ask[i]=this.m_vUser[i].m_CloseDesk;
			userid[i]=this.m_vUser[i].uid;
			if( ask[i]!=1 ) hav=true;
		}
		this.SendAll("onAskClose",{asker:this.m_AskCloseId,user:userid,close:ask,time:this.m_LeftClose});
		if( hav ) return 10;
		
		//this.m_nState=-1;
		//this.ClearUser();
		//this.DeskClose();
		clearInterval(this.UserCloseTimer);
		//退出积分
		this.m_HuData=Array(this.m_vUser.length);
		for( var i=0; i<this.m_vUser.length; i++ ){				
			if( this.m_vUser[i]==null ) continue;
			this.m_HuData[i]=this.m_vUser[i].GetLoseData(null,0,0,0,false);
			this.m_HuData[i]['score']=this.m_vUser[i].m_Num;
		}		
		this.GameEnd();
		this.AddBack('huang',0,0);
		this.SaveBack();
		this.SendAll("HuPai2",{hu:this.m_HuData,end:1});
		this.DeskClose();
		this.TryCloseDesk();
		return 1;
	}
	this.FindUser=function(uid){
		if( uid<0 ) return null;
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			if( this.m_vUser[i].uid!=uid ) continue;
			return this.m_vUser[i];
		}
		return null;
	}
	this.FindUserChair=function(uid){
		if( uid<=0 ) return -1;
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			if( this.m_vUser[i].uid!=uid ) continue;
			return i;
		}
		return -1;
	}
	this.ClearDesk=function (){
		//if( this.m_nState>0 ) return;
		this.m_CurUser=null;
		this.m_vPai=null;
		this.m_nGameState=0;
		this.m_MoNum=0;
		this.m_OutNum=0;
		this.m_Win=null;
		this.m_Loser=null;
		this.m_nHuang=0;
		this.m_HuData=null;
		this.m_BiXia[0]=this.m_BiXia[1];
		this.m_BiXia[1]=false;
		this.m_ChgZhuang=true;
	}
	this.onGameStart=function (user){
		if( this.m_nState==-1 ){
			this.QuitDesk(user,true);
			this.SendState(null);
			return;//桌子已经关闭
		}
		if( this.m_nState==1 ) return;//游戏已经开始
		if( this.IsEnd() ){//游戏已经满8局
			this.DeskClose();
			this.QuitDesk(user,true);
			this.SendState(null);
			return;
		}

		var user;
		for( var i=0; i<this.m_vUser.length; i++ ){
			user=this.m_vUser[i];
			if( user==null ){ this.SendUser(null); return; }
			if( user.deskctrl==null ){
				if( user.JoinDesk(this) ) continue;//桌子上有用户，但用户上没桌子，则再次进入
				this.DelUserByID(i);//再次进入失败，踢出用户
				return;
			}
			if( user.start==false ) { this.SendUser(null); return; }//未点开始
		}		
		this.m_StartTime=new Date().Format("yyyy-MM-dd hh:mm:ss");
		this.m_nState=1;
		this.SendAll("GameStart",{lun:this.m_nLunNum});
		this.StartGame();
	}
	this.StartGame=function(){
		if( this.m_nLunNum==0 ){
			for( i=0; i<this.m_vUser.length; i++ ){
				this.m_vUser[i].m_nFen=100;
				this.m_vUser[i].m_Cur={lose:0,win:0,ping:0,score:0,sumscore:0,jiegang:0,diangang:0};
				this.m_vUser[i].m_Num={zimo:0,jie:0,pao:0,agang:0,mgang:0,waibao:0};
			}
		}
		this.m_nLunNum++;
		this.ClearDesk();
		if( this.m_ZhuangNum==0 || this.m_Zhuang==null ){
			this.m_Zhuang=this.m_vUser[0];
			this.m_ZhuangNum++;
		}
		this.m_CurUser=this.m_Zhuang;
		this.m_nGameState=3;
		this.m_vPai=js_ctrl.InitDeskPai();
		//this.err("m_vPai"+this.m_vPai.length);

		if( this.m_BiXia[0] ) this.SendAll("bixia",{});
		this.tr("onGameStart:"+this.deskid);

		var a=this;
		setTimeout( function(){a.InitUserPai();}, 500 );
	}
	this.InitUserPai=function(){
		if( this.m_nState!=1 ) return;//未开始
		for( var i=0; i<this.m_nMaxUser; i++ ){
			this.m_vUser[i].InitGame(this.GetPai(13,true,i));
		}
		this.InitBack();
		//this.m_CurUser.SendSelf(action);
		var action={event:"firstpai"};
		this.SendUser(null);
		this.SendState(action);
		this.SendDesk(action);

		for( i=0; i<this.m_nMaxUser; i++ ){
			//if( this.m_CurUser==this.m_vUser[i] ) continue;
			this.m_vUser[i].SendSelf(action);
		}
		this.InitUserHua(0);
	}
	this.InitUserHua=function( chairid ){
		this.tr("InitUserHua:"+chairid);
		if( this.m_nState!=1 ) return;//未开始
		var sec=0, num, user;
		for( var i=chairid; i<this.m_nMaxUser; i++ ){
			if( this.m_vUser[i].m_Pai.InitUserHua(this) ){
				sec=800;
				this.SendAll("BuHua",{c:i});

				user=this.m_vUser[i];
				num=user.m_Pai.HuaGangPai();
				if( num ){
					for( var j=0; j<this.m_vUser.length; j++ ){
						if( this.m_vUser[j]==null ) continue;
						if( this.m_vUser[j]==user ) continue;
						this.m_vUser[j].m_nFen-=6*num;
						user.m_nFen+=6*num;
					}
					this.m_BiXia[1]=true;
					this.SendAll("HuaGang",{c:i});
				}
				break;
			}
		}
		var a=this;
		if( sec ){
			setTimeout( function(){
				a.m_vUser[chairid].SendSelf({event:"buhua"});
				a.SendDesk({event:"buhua"});
				chairid++;
				if( chairid>=this.m_nMaxUser ) chairid=0;
				//a.InitUserHua(chairid);
				setTimeout( function(){a.InitUserHua(chairid);}, sec );
				//a.StartGameOk();
			}, 300 );
		} else this.StartGameOk();
	}
	this.StartGameOk=function(){
		this.MoPai(this.m_CurUser,0,action);
		this.m_nGameState=1;
		for( var i=0; i<this.m_nMaxUser; i++ ){
			this.m_vUser[i].SendSelf({event:"gamestart"});
		}
		//客户端同步
		var action={event:"gamestart"};
		this.SendDesk(action);
		
		//天听
		var ting;
		for( i=0; i<this.m_nMaxUser; i++ ){
			ting=this.m_vUser[i].m_Pai.DelTing(this,null);
			if( ting.length>0 ) this.m_vUser[i].toC("BaoTing",{});
		}
		/*var ting=this.m_CurUser.m_Pai.DelTing(this,null);//显示报听按钮
		if( ting.length>0 ) this.m_CurUser.toC("BaoTing",{});*/
	}
	this.GetPai=function(num,flag,chair){
		if( num <1 ) return null;
		if( num>this.m_vPai.length ){
			this.err("GetPai:["+num+"]"+this.m_vPai);
			return null;
		}

		var sztest=null;
		if( flag && js_ctrl.gm_pai[chair] ){
//			if( js_ctrl.gm_pai.desk==this.deskid && js_ctrl.gm_pai.chair==chair ){
			if( js_ctrl.gm_pai[chair].length>0 ) sztest=js_ctrl.gm_pai[chair];
		}

		var pai, id=-1;
		if( num==1 ){
			id=parseInt(Math.random()*this.m_vPai.length);
			pai=this.m_vPai[id];
			this.m_vPai.splice(id,1);
			return pai;
		}
		var vpai=[];
		for( var i=0; i<num; i++ ){
			id=-1;
			if( sztest && i<sztest.length ){
				for( var j=0; j<this.m_vPai.length; j++ ){
					pai=this.m_vPai[j];
					if( pai.type!=sztest[i].type || pai.value!=sztest[i].value ) continue;
					id=j;
					break;
				}
			}
			if(id==-1) id=parseInt(Math.random()*this.m_vPai.length);
			pai=this.m_vPai[id];
			this.m_vPai.splice(id,1);
			vpai.push(pai);
		}
		return vpai;
	}
	this.RunAction=function(){
		this.tr("RunAction");
		var hav=false;
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			if( this.m_vUser[i].m_Action.eve=="non" ) continue; 
			this.tr("RunAction:"+JSON.stringify(this.m_vUser[i].m_Action));
			if( this.m_vUser[i].m_Action.ishu==0 ) continue;

			if( this.m_vUser[i].m_Action.eve=="wait" ){ 
				this.tr("RunAction:等待【胡】"); 
				return true; 
			}
			if( this.m_vUser[i].m_Action.eve=="HuPai" ) hav=true;
		}
		if( hav ){
			this.HuPaiAll(); return true;
		}

		hav=false;
		for( i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			if( this.m_vUser[i].m_Action.eve=="non" ) continue; 
			if( this.m_vUser[i].m_Action.isgang==0 ) continue; 

			if( this.m_vUser[i].m_Action.eve=="wait" ){ hav=true; continue; }
			if( this.m_vUser[i].m_Action.eve=="GangPai" ){
				if( this.GangPai( this.m_vUser[i], this.m_vUser[i].m_Action.param, 0 )!=null )
					return true;
			}
		}
		if( hav ){ this.tr("RunAction:等待【杠】"); return true; }

		hav=false;
		for( i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			if( this.m_vUser[i].m_Action.eve=="non" ) continue; 
			if( this.m_vUser[i].m_Action.ispeng==0 ) continue; 

			if( this.m_vUser[i].m_Action.eve=="wait" ){ hav=true; continue; }
			if( this.m_vUser[i].m_Action.eve=="PengPai" )
				if( this.PengPai( this.m_vUser[i], this.m_vUser[i].m_Action.param )!=null )
					return true;
		}
		if( hav ){ this.tr("RunAction:等待【碰】"); return true; }

		return false;
	}
	this.NotChi=function(){
		if( this.m_nGameState==1 ){
			if( this.m_CurUser==null ) return;
			if( this.m_CurUser.m_Pai==null ) return;
			if( !this.m_CurUser.m_Pai.ting ) return;
			if( this.m_CurUser.m_Pai.mopai==null ) return;
			this.ChuPai(this.m_CurUser,this.m_CurUser.m_Pai.mopai.id,null,null);
			return;
		}

		if( this.m_nGameState!=2 ) return null;
		if( this.RunAction() ) return;
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			if( this.m_vUser[i].m_Action.eve!="non" ) return; 
		}
		clearTimeout(this.m_pOutTimer);
		this.ChuPaiOk();
	}
	this.GenZhuang=function(pai){
		if( !pai ) return;
		if(this.m_GenZhuang.pai){
			if( this.m_GenZhuang.pai.type==pai.type && this.m_GenZhuang.pai.value==pai.value ){
				this.m_GenZhuang.num++;
				if( this.m_GenZhuang.num<4 ) return;
			}else{
				this.m_GenZhuang.pai=pai;
				this.m_GenZhuang.num=1;
				return;
			}
		} else {
			this.m_GenZhuang.pai=pai;
			this.m_GenZhuang.num=1;
			return;
		}
		pai=this.m_GenZhuang.pai;
		var fen=0, subfen=15;
		if( this.m_BiXia[0] ) subfen*=2;
		var user=this.FindUser(pai.from);
		if( user && user.m_nFen>=subfen ){
			user.m_nFen-=subfen;
			fen=parseInt(subfen/3);
			for( var i=0; i<this.m_vUser.length; i++ ){
				if( !this.m_vUser[i] ) continue;
				if( this.m_vUser[i].uid==user.uid ) continue;
				this.m_vUser[i].m_nFen+=fen;
			}
			this.SendUser(null);
		}
		this.SendAll( "GenZhuagn", {pai:pai,fen:fen} );
		this.m_GenZhuang.pai=null;
		this.m_GenZhuang.num=0;
		this.m_BiXia[1]=true;
	}
	this.ChuPaiOk=function(){
		if( this.m_nGameState!=2 ) return;
		if( this.m_CurUser==null ){
			this.err("ChuPaiOk[curuser=null]:deskid="+this.deskid);
			return;
		}
		if( this.RunAction() ) return;

		this.tr("ChuPaiOk:user="+this.m_CurUser.uid);
		var pai=this.m_CurUser.m_Pai.outpai;
		this.m_CurUser.m_Pai.ChuPaiOk();
		this.GenZhuang(pai);
		if( this.GetHuangLeft()<=0 ){//荒庄
			this.GameWin(null,null);
			this.GameEnd();
			return;
		}

		this.m_CurUser=this.GetNextUser();
		if( this.m_CurUser==null ) return;
		this.m_CurUser.onMoPai();
		this.m_nGameState=1;
		if( this.m_CurUser.m_Pai==null ) return;
		if( this.m_CurUser.m_Pai.ting && this.m_CurUser.m_Pai.mopai!=null ){
			pai=this.m_CurUser.m_Pai.mopai;
			if( this.m_CurUser.m_Pai.isGang(this,pai) ) 
				this.m_CurUser.toC("isGang",{paiid:pai.id,flag:4});
			else if( this.m_CurUser.m_Pai.isJiaGang(pai) ) 
				this.m_CurUser.toC("isGang",{paiid:pai.id,flag:5});
			else
				if( !this.m_CurUser.m_Pai.isTingPai(pai) ){
					var desk=this;
					setTimeout( function(){desk.ChuPai(desk.m_CurUser,pai.id,null,null);}, 2000 );
				}
		}
	}
	this.GetHuangLeft=function(){
		if( this.m_vPai==null ) return 0;
		return this.m_vPai.length;
	}
	this.MoPai=function(user,isghua,action){
		if( this.m_nState!=1 ) return null;//未开始
		if( user==null ) return null;
		if( this.m_CurUser==null ) return null;
		if( this.m_CurUser.uid!=user.uid ) return null;

		var pai=this.GetPai(1);
		this.tr("MoPai:["+this.m_MoNum+"]"+pai.id);
		user.m_Pai.MoPai(pai,isghua);
		this.AddBack('mo',this.m_CurUser.chairid,pai.id);
		if( action==null )
			action={event:"mopai",chairid:this.m_CurUser.chairid};
		this.SendDesk(action);
		if( !user.m_Pai.isHua(pai) ){//硬花
			this.m_MoNum++;
			this.tr("ting:"+user.m_Pai.ting);
			if( user.m_Pai.ting ){
				var wait=false;
				if( user.m_Pai.isGang(this,pai) ){ wait=true; user.toC("isGang",{paiid:pai.id,flag:4}); }
				if( user.m_Pai.isJiaGang(this,pai) ){ wait=true; user.toC("isGang",{paiid:pai.id,flag:5}); }
				if( user.SendHu(pai,null)) wait=true;
				if(wait) return {event:"wait"};
			} else{
				user.SendHu(pai,null);
				if( this.m_MoNum==1 ){
					//天听
					var ting;
					ting=user.m_Pai.DelTing(this,null);
					if( ting.length>0 ) user.toC("BaoTing",{});
				}
			}
		}else{ this.BuHua(user,pai); return null; }
		return action;
	}
	this.BuHua=function(user,pai){
		if( this.m_nState!=1 ) return;//未开始
		if( user==null || pai==null ) return;
		if( this.GetHuangLeft()<=0 ){//荒庄
			this.GameWin(null,null);
			this.GameEnd();
			return;
		}
		//this.SendAll("BuHua",{hua:pai});
		if( !user.m_Pai.ChuPai(pai.id,user.uid) ) return;
		user.m_Pai.ChuPaiOk();
		var pos=-1;
		for( var i=0; i<user.m_Pai.huapai.length; i++ ){
			if( user.m_Pai.huapai[i][0].type!=pai.type ) continue;
			if( pai.type==5 ){
				if( user.m_Pai.huapai[i][0].value>3 && pai.value<=3 ) continue;
				if( user.m_Pai.huapai[i][0].value<=3 && pai.value>3 ) continue;
			} else {
				if( user.m_Pai.huapai[i][0].value!=pai.value ) continue;
			}
			user.m_Pai.huapai[i].push(pai);
			pos=i;
			break;
		}
		if( pos==-1 ){ pos=user.m_Pai.huapai.length; user.m_Pai.huapai.push([pai]); }

		user.SendSelf({event:"buhua"});
		this.SendDesk({event:"buhua"});
		this.SendAll("BuHua",{c:user.chairid});
		
		var num=user.m_Pai.HuaGangPai();
		if( num ){
			num*=6;
			if( this.m_BiXia[0] ) num*=2;
			for( var i=0; i<this.m_vUser.length; i++ ){
				if( this.m_vUser[i]==null ) continue;
				if( this.m_vUser[i]==user ) continue;
				if(this.m_vUser[i].m_nFen>num){
					this.m_vUser[i].m_nFen-=num;
					user.m_nFen+=num;
				}else{
					this.m_vUser[i].m_nFen=0;
					user.m_nFen+=this.m_vUser[i].m_nFen;
				}
			}
			this.m_BiXia[1]=true;
			this.SendUser(null);
			this.SendAll("HuaGang",{c:user.chairid});
		}

		clearTimeout(this.m_pOutTimer);
		if( this.IsEnd() ){
			this.GameWin(null,null);
			this.GameEnd();
			return;
		}
		
		var a=this;
		this.m_pOutTimer=setTimeout( function(){ 
			var re=null;
			if( num ) re=a.MoPai(user,3,null);
			else re=a.MoPai(user,2,null); 
			if(re) user.SendSelf(re);
		}, 1000 );
	}
	this.ChuPai=function(user,paiid){
		if( this.m_nState!=1 ) return null;//未开始
		if( this.m_nGameState!=1 ) return null;
		if( user==null ) return null;
		if( this.m_CurUser==null ) return null;
		if( this.m_CurUser.uid!=user.uid ){
			//网络卡时可能会产生多个出牌消息,"还没轮到"和"已经出过"比较混淆,不再提示
			//user.toC("onError", {"msg":"Msg:还没轮到你出牌."+user.uid+","+user.m_sNick});
			return null;
		}

		if( !user.m_Pai.ChuPai(paiid,user.uid) ) return null;
		var outpai=user.m_Pai.outpai;
		
		this.m_OutNum++;
		this.tr("ChuPai:["+paiid+"] user="+user.uid+","+this.m_OutNum);
		if( !user.m_Pai.ting && user.m_Pai.tingpai.length>0 ){//已经报听，出牌后听
			if( user.m_Pai.BaoTingOk(this) ){
				this.SendAll("SendBaoTing",{chairid:user.chairid});
				user.m_Pai.ting=true;
			}
		}

		var action={event:"chupai",chairid:this.m_CurUser.chairid};
		this.SendDesk(action);
		this.AddBack('out',user.chairid,paiid);
		user.SendSelf(action);
		this.ChuPai2(user);
		return action;
	}
	this.ChuPai2=function(user){
		if( this.m_nGameState!=1 ) return null;
		if( user==null ) return null;
		if( this.m_CurUser==null ) return null;
		if( this.m_CurUser.uid!=user.uid ){
			//网络卡时可能会产生多个出牌消息,"还没轮到"和"已经出过"比较混淆,不再提示
			//user.toC("onError", {"msg":"Msg:还没轮到你出牌."+user.uid+","+user.m_sNick});
			return null;
		}
		if( user.m_Pai.outpai==null ) return null;

		var action={event:"chupai",chairid:this.m_CurUser.chairid};
		this.m_nGameState=2;

		var outpai=user.m_Pai.outpai;

		var lastgen=null;
		var sec=0;
		var next=this.GetNextUser();
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			this.m_vUser[i].ClearAction();
			if( this.m_vUser[i].uid==user.uid ) continue;

			//跟打不能胡、碰
			lastgen=this.m_vUser[i].m_Pai.genpai;
			if( !lastgen && this.m_vUser[i].SendHu(outpai,outpai) ){ 
				this.m_vUser[i].m_Action.eve="wait";
				this.m_vUser[i].m_Action.ishu=1;
				sec=1; 
				this.m_vUser[i].m_Pai.genpai=outpai;
			}
			if( this.m_vUser[i].m_Pai.isGang(this,outpai) ){ 
				this.m_vUser[i].m_Action.eve="wait";
				this.m_vUser[i].m_Action.isgang=1;
				sec=1; 
				if( this.m_vUser[i].m_Pai.ting ) this.m_vUser[i].toC("isGang",{paiid:outpai.id,flag:3});
			}
			if( this.m_vUser[i].m_Pai.ting ) continue;
			if( lastgen && lastgen.type==outpai.type && lastgen.value==outpai.value )
				continue;
			if( this.m_vUser[i].m_Pai.isPeng(outpai) ){ 
				this.m_vUser[i].m_Action.eve="wait";
				this.m_vUser[i].m_Action.ispeng=1;
				sec=1; 
				this.m_vUser[i].m_Pai.genpai=outpai;
			}
		}
		this.OnNextUser( user, sec );
		return action;
	}
	this.OnNextUser=function( user, sec ){
		clearTimeout(this.m_pOutTimer);
		if( sec==0 ){
			if( user!=null && user.m_Pai.ting ) sec=3;
			else sec=0.5; 
		}else sec=this.t_out;
		var a=this;
		this.m_pOutTimer=setTimeout( function(){a.ChuPaiOk();}, 1000*sec );
	}
	this.GetNextUser=function(){
		var chairid=(this.m_CurUser.chairid+1)%this.m_nMaxUser;
		return this.m_vUser[chairid];
	}
	this.GetNextUserByChair=function(cid){
		var chairid=(cid+1)%this.m_nMaxUser;
		return this.m_vUser[chairid];
	}
	this.PengPai=function(user,paiid){
		if( this.m_nState!=1 ) return null;//未开始
		if( this.m_nGameState!=2 ) return null;
		if( user==null ) return null;
		if( this.m_CurUser==null ) return null;

		var peng=this.m_CurUser.m_Pai.outpai;
		if( peng.id!=paiid ){
			user.toC("onError", {"msg":"碰失败.牌错误paiid="+paiid+","+user.uid+","+user.m_sNick});
			return null;
		}

		if( !user.m_Pai.PengPai(peng,this.m_CurUser.uid) ) return null;
		this.m_GenZhuang.pai=null;
		this.SendAll("PengPai",{chairid:user.chairid});
		clearTimeout(this.m_pOutTimer);
		this.m_MoNum++;
		var action={event:"pengpai",fromid:this.m_CurUser.chairid,toid:user.chairid,pai:peng};
		this.m_CurUser.m_Pai.outpai=null;
		this.m_CurUser=user;
		this.m_nGameState=1;
		this.SendDesk(action);
		this.AddBack('peng',user.chairid,peng.id);
		user.onChiPengOk(action);
		return action;
	}
	this.BaoTing=function(user){//报听
		if( this.m_nState!=1 ) return null;//未开始
		if( this.m_nGameState!=1 ) return null;
		if( this.m_OutNum>0 ) return null;
		if( this.m_MoNum>1 ) return null;
		if( user==null ) return null;

		if( !user.m_Pai.BaoTingPai(this,null) ) return null;

		user.toC("BaoTingOk",{ting:user.m_Pai.tingpai});
		return {event:"baoting",ting:user.m_Pai.tingpai};
	}
	this.BaoTingOk=function(user){
		if( this.m_nState!=1 ) return null;//未开始
		if( this.m_MoNum>1 ) return null;
		if( user==null ) return null;

		if( !user.m_Pai.BaoTingOk(this) ) return null;
		if( user.m_Pai.ting ) return {event:"tingok",ting:user.m_Pai.tingpai};
	}
	this.JiaGangTimer=null;
	this.JiaGangPai=function(user,paiid){
		if( this.m_nState!=1 ) return null;//未开始
		if( user==null ) return null;
		if( this.m_CurUser==null ) return null;
		if( this.m_CurUser.uid!=user.uid ) return null;
		if( this.m_nGameState!=1 ) return null;

		var id=user.m_Pai.FindPai(paiid);
		if( id<0 ){
			user.toC("onError", {"msg":"杠失败.牌错误paiid="+paiid+","+user.uid+","+user.m_sNick});
			return null;
		}
		var gang=user.m_Pai.vpai[id];
		if( !user.m_Pai.isJiaGang(gang) ) return null;

		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			this.m_vUser[i].ClearAction();
			if( user.uid==this.m_vUser[i].uid )  continue;
			if( this.m_vUser[i].SendHu(gang,gang) ){ 
				this.m_vUser[i].m_Action.eve="JiaGangHu";
				this.m_vUser[i].m_Action.param=paiid;
				this.m_vUser[i].m_Action.ishu=1;
				user.m_Action.eve="JiaGangPai";
				user.m_Action.param=paiid;
				user.m_Action.isgang=1;
				/*if( this.m_vUser[i].m_Pai.ting ){ 
					this.m_vUser[i].onHu(); 
					return true;
				}*/
				var a=this;
				this.JiaGangTimer=setTimeout( function(){ a.GangPai(user,paiid,10); }, 1000*this.t_out );
				return true;
			}
		}
		return this.GangPai(user,paiid,10);
		return true;
	}
	this.GangPai=function(user,paiid,flag){
		clearTimeout(this.JiaGangTimer);
		if( this.m_nState!=1 ) return null;//未开始
		if( user==null ) return null;
		if( this.m_CurUser==null ) return null;

		var gang=null;
		if( this.m_CurUser.uid==user.uid ) {
			this.tr("GangPai:"+user.uid+","+this.m_nGameState+","+paiid);
			if( this.m_nGameState!=1 ) return null;
			
			if( flag==0 ) flag=10;//加杠
			var id=user.m_Pai.FindPai(paiid);
			if( id<0 ){
				user.toC("onError", {"msg":"杠失败.牌错误paiid="+paiid+","+user.uid+","+user.m_sNick});
				return null;
			}
			gang=user.m_Pai.vpai[id];
		}else{
			if( this.m_nGameState!=2 ) return null;
			this.tr("MingGangPai:"+user.uid+","+this.m_CurUser.uid+","+this.m_nGameState+","+paiid);
		
			if( flag==1 ){
				user.toC("onError", {"msg":"暗杠错误.不能杠"+user.uid+","+user.m_sNick});
				return null;
			}
			if( this.m_CurUser.m_Pai.outpai==null ){
				user.toC("onError", {"msg":"明杠失败.未出牌"+user.uid+","+user.m_sNick});
				return null;
			}
			gang=this.m_CurUser.m_Pai.outpai;
		}
		if( gang==null ){
			user.toC("onError", {"msg":"杠失败.牌错误paiid="+paiid+","+user.uid+","+user.m_sNick});
			return null;
		}
		if( gang.id!=paiid ){
			user.toC("onError", {"msg":"杠失败.牌错误paiid="+paiid+","+user.uid+","+user.m_sNick});
			return null;
		}

		var re=user.m_Pai.GangPai(gang,flag,this.m_CurUser.uid);
		if( re<0 ) return null;
		user.AddGangFen(re);
		this.m_GenZhuang.pai=null;
		this.SendAll("GangPai",{chairid:user.chairid});
		clearTimeout(this.m_pOutTimer);
		this.m_MoNum++;
		var action={event:"gangpai",fromid:this.m_CurUser.chairid,toid:user.chairid,pai:gang};
		this.m_CurUser.m_Pai.outpai=null;
		this.m_CurUser=user;
		this.m_nGameState=1;
		this.SendDesk(action);
		this.AddBack('gang',user.chairid,paiid);
		user.onGangOk(action,gang);
		return action;
	}
	this.JiaGangHu=function( user, paiid ){
		this.tr("JiaGangHu:"+user.uid+","+paiid+",cureve:"+this.m_CurUser.m_Action.eve);
		if( this.m_nState!=1 ) return;//未开始
		if( user==null ) return;
		if( this.m_CurUser==null ) return;
		if( this.m_CurUser.uid==user.uid ) return;
		//if( this.m_CurUser.m_Action.eve!="JiaGangPai" ) return;

		var id=this.m_CurUser.m_Pai.FindPai(paiid);
		if( id<0 ){
			user.toC("onError", {"msg":"抢杠胡失败.牌错误paiid="+paiid+","+user.uid+","+user.m_sNick});
			this.GangPai(this.m_CurUser,paiid,10);
			user.ClearAction();
			return;
		}
		var gang=this.m_CurUser.m_Pai.vpai[id];
		gang.flag=5;
		gang.from=this.m_CurUser.uid;
		if( !user.m_Pai.HuPai(this,gang,user) ){
			gang.flag=0;
			this.GangPai(this.m_CurUser,paiid,10);
			user.ClearAction();
			return;
		}
		this.m_BiXia[1]=true;
		user.m_Num.jie++;
		this.m_CurUser.m_Num.pao++;
		this.GameWin(user,gang);
		this.GameEnd();
	}
	this.HuPai=function(user){
		if( this.m_nState!=1 ) return false;//未开始
		if( user==null ) return false;
		if( this.m_CurUser==null ) return false;

		if( this.m_CurUser.uid==user.uid ) {
			if( this.m_nGameState!=1 ) return false;
			if( !user.m_Pai.HuPai(this,null,user) )
				return false;			
			user.m_Num.zimo++;
			this.GameWin(user,user.m_Pai.mopai);
		}else{
			if( this.m_nGameState!=2 ) return false;
			if( !user.m_Pai.HuPai(this,this.m_CurUser.m_Pai.outpai,user) )
				return false;
			user.m_Num.jie++;
			this.m_CurUser.m_Num.pao++;
			this.GameWin(user,this.m_CurUser.m_Pai.outpai);
		}
		
		this.GameEnd();
		return true;
	}
	this.GameWinGang=function(){
		var guser, i;
		var gang=Array(this.m_vUser.length);
		for( i=0; i<this.m_vUser.length; i++ ) this.m_vUser[i].GetGang();
		for( i=0; i<this.m_vUser.length; i++ ){
			gang[i]=this.m_vUser[i].vgang.gang;
			for( var j=0; j<this.m_vUser.length; j++ ){
				if( i==j ) continue;
				guser=this.m_vUser[j];
				gang[i]+=guser.vgang.diangang[i];
			}
		}
		return gang;
	}
	this.HuPaiAll=function(){
		if( this.m_nState!=1 ) return false;//未开始
		if( this.m_nGameState!=2 ) return false;
		if( this.m_CurUser==null ) return false;

		var user, szhu=[], cci=this.m_CurUser.chairid;
		for( var i=1; i<this.m_vUser.length; i++ ){
			user=this.m_vUser[(i+cci)%this.m_vUser.length];
			if( user==null ) continue;
			if( user.m_Action.eve!="HuPai" ) continue;
			szhu.push(user);
		}
		if( szhu.length<0 ) return false;
		if( szhu.length == 1 ){ return this.HuPai(szhu[0]); }

		var hupai=this.m_CurUser.m_Pai.outpai;
		for( var i=0; i<szhu.length; i++ ){
			user=szhu[i];
			if( !user.m_Pai.HuPai(this,hupai,user) ) continue;
			user.m_Num.jie++;
			this.m_CurUser.m_Num.pao++;
		}
		this.GameWinAll(szhu,hupai);
		this.GameEnd();
		return true;
	}
	this.GameWinAll=function( szhu, hupai ){
		if( szhu.length<2 ) return;
		if( lose==null || hupai==null ) return;
		this.tr("GameWinAll:lose="+lose.uid+",win:"+szhu[0].uid+","+szhu[1].uid);

		this.m_BiXia[1]=true;
		this.m_Win=szhu[0];
		this.m_HuData=Array(this.m_vUser.length);

		var fen=0;
		var user;
		var allfen=0;
		var re;
		var lose, szfen=Array(this.m_vUser.length), fen;
		for( var i=0; i<szhu.length; i++ ){
			user=szhu[i];
			fan=user.m_Pai.fan;//fan:8
			fen=fan;
			lose=user.m_Pai.waiuser;
			if(!lose){ //包胡非外包
				lose=user.m_Pai.isBao(this,user,hupai);
				if(lose) fen=fan*3;
			}
			if( !lose ){
				lose=this.FindUser(hupai.from);
				if( !lose ) continue;
			}
			if( lose.m_nFen<fen ) fen=lose.m_nFen;
			szfen[lose.chairid]-=fen;
			szfen[user.chairid]+=fen;

			this.tr("fen["+user.chairid+"]:"+fen);
			re=user.GetScoreData(hupai,fan,0);
			this.m_HuData[user.chairid]=re;
			if(this.m_Zhuang && user==this.m_Zhuang) this.m_ChgZhuang=false;
		}
		for( var i=0; i<this.m_vUser.length; i++ ){
			user=this.m_vUser[i];
			if( !szfen[i] )
				re=user.GetScoreData(0,0,0);
			else if( szfen[i]<0 )
				re=user.GetScoreData(szfen[i],user.m_Pai.fan,-1);
			else
				re=user.GetScoreData(szfen[i],user.m_Pai.fan,1);
			this.m_HuData[i]=re;
		}

		if( this.m_ChgZhuang ){
			this.m_Zhuang=this.GetNextUserByChair(this.m_Zhuang.chairid);
			this.m_ZhuangNum++;
		}

		var end=0;
		if( this.IsEnd() ){
			for( i=0; i<this.m_vUser.length; i++ ){
				if( this.m_vUser[i]==null ) continue;
				this.m_HuData[i]['score']=this.m_vUser[i].m_Num;
				this.m_HuData[i]['deskwin']=this.m_vUser[i].m_Cur.win;
				this.m_HuData[i]['desklose']=this.m_vUser[i].m_Cur.lose;
			}
			end=1;
		}
		this.AddBack('hu',lose.chairid,hupai.id);
		this.SaveBack();
		this.SendAll("HuPai",{hu:this.m_HuData,end:end});
	}
	this.GameWin=function( user, hupai ){
		var re;
		this.m_Win=user;		
		this.m_HuData=Array(this.m_vUser.length);

		var guser, i, j;
		if( user==null ){//荒庄
			this.m_ChgZhuang=false;
			for( i=0; i<this.m_vUser.length; i++ ){
				re=this.m_vUser[i].GetLoseData(null,0,0,0,false,false);
				this.m_HuData[i]=re;
			}
			this.AddBack('huang',0,0);
			this.m_BiXia[1]=true;
		}else {
			var fan=user.m_Pai.fan; this.tr("fan:"+fan);
			var fen=fan;

			if( this.m_Zhuang && this.m_Zhuang==user ) this.m_ChgZhuang=false;

			//外包
			var lose=user.m_Pai.waiuser;
			if(!lose){ //包胡非外包
				lose=user.m_Pai.isBao(this,user,hupai);
				if(lose) fen=fan*3;
			}

			if( lose ){
				this.m_BiXia[1]=true;
				for( i=0; i<this.m_vUser.length; i++ ){
					if( user==this.m_vUser[i] ) continue;
					if( lose==this.m_vUser[i] ){
						re=lose.GetLoseData(hupai,fen,fan,0,true,true);
						fen=re.subfan;
					}else{
						re=this.m_vUser[i].GetLoseData(hupai,0,fan,0,true,false);
					}
					this.m_HuData[i]=re;
				}
				this.tr("包胡+外包:"+fen);
			}else{
				fen=0;
				for( i=0; i<this.m_vUser.length; i++ ){
					if( user==this.m_vUser[i] ) continue;
					re=this.m_vUser[i].GetLoseData(hupai,fan,fan,0,false,false);
					fen+=re.subfan;
					this.tr("subfan:"+re.subfan);
					this.m_HuData[i]=re;
				}
			}

			re=user.GetWinData(hupai,fen,fan,0);
			this.m_HuData[user.chairid]=re;
			this.AddBack('hu',user.chairid,hupai.id);
		}

		if( this.m_ChgZhuang ){
			this.m_Zhuang=this.GetNextUserByChair(this.m_Zhuang.chairid);
			this.m_ZhuangNum++;
		} else this.m_BiXia[1]=true;

		for( i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			if( this.m_vUser[i].m_Pai.isBaoZi() ){
				this.m_BiXia[1]=true;
				this.tr("包子:"+i);
				break;
			}
		}
		var end=0;
		if( this.IsEnd() ){
			for( i=0; i<this.m_vUser.length; i++ ){
				if( this.m_vUser[i]==null ) continue;
				this.m_HuData[i]['score']=this.m_vUser[i].m_Num;
				this.m_HuData[i]['deskwin']=this.m_vUser[i].m_Cur.win;
				this.m_HuData[i]['desklose']=this.m_vUser[i].m_Cur.lose;
			}
			end=1;
		}
		this.SaveBack();
		this.SendAll("HuPai",{hu:this.m_HuData,end:end});
	}
	this.IsEnd=function(){
		var num=0;
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			if( this.m_vUser[i].m_nFen<=0 ) num++;
		}
		if(num>=2) return true;

		if( this.m_ZhuangNum>this.m_nMaxNum ) return true;
		return false;
	}
	this.GameEnd=function(){
		//this.SetDBState();
		this.tr("GameEnd"+this.deskid);
		clearTimeout(this.JiaGangTimer);
		clearTimeout(this.m_pOutTimer);
		this.m_nGameState=0;
		this.m_nState=2;
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			this.m_vUser[i].onGameEnd();
		}
		this.SetDBState();

		var endtime=new Date().Format("yyyy-MM-dd hh:mm:ss");
		var userdata;
		var sql="INSERT INTO stat_round (`deskid`,`round`,`startime`,`endtime`,`chair1`,`chair2`,`chair3`,`chair4`,`replayid`) VALUES ("+
			this.deskid+","+this.m_nLunNum+",'"+this.m_StartTime+"','"+endtime+"','";
		for( i=0; i<4; i++ ){
			userdata={};
			if( i>=this.m_vUser.length ){ sql+="{}','"; continue; }
			if( this.m_vUser[i]==null ){ sql+="{}','"; continue; }
			userdata=this.m_vUser[i].GetRecData("lun");
			sql+=JSON.stringify(userdata)+"','";
		}
		sql+=this.deskid+"|"+this.m_nLunNum+"')"; 
		this.tr("sql:"+sql);
		js_sql.query(sql, this, this.onDBSaveOk, this.onDBSaveErr); 
		//var a=this;
		//this.m_pOutTimer=setTimeout( function(){a.onGameStart();}, 1000*this.t_out );
	}

	this.SendState=function(action){
		var data={};
		data['deskid']=this.deskid;
		data['state']=this.m_nState;
		data['lun']=this.m_nLunNum;
		data['ju']=this.m_ZhuangNum;
		data['zhuang']='0';
		if( this.m_Zhuang!=null ) data['zhuang']=this.m_Zhuang.chairid;
		data['action']=action;

		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			data['chair']=i;
			this.m_vUser[i].toC("UpdateDesk",data);
		}
	}
	this.SendDesk=function(action){
		if( this.m_vPai==null ) return;
		if( this.m_nGameState==0 ) return;//游戏结束

		var data={};
		data['gamestate']=this.m_nGameState;
		data['curuser']='0';
		if( this.m_CurUser!=null ) data['curuser']=this.m_CurUser.chairid;
		data['leftpai']=this.GetHuangLeft();
		data['outpai']=null;
		var outpai=this.m_CurUser.m_Pai.outpai;
		if( this.m_CurUser.m_Pai!=null ) data['outpai']=this.m_CurUser.m_Pai.GetMiniPai(outpai);

		var hua=0;
		var vuser=Array(this.m_nMaxUser);
		for( var i=0; i<this.m_nMaxUser; i++ ){
			if( i>=this.m_vUser.length ) break;
			if( this.m_vUser[i]==null ) continue;
			vuser[i]=this.m_vUser[i].GetDeskData();
			hua+=this.m_vUser[i].m_Pai.GetHuaNum();
		}
		data['user']=vuser;
		data['action']=action;
		data['lhua']=20-hua;

		this.SendAll("UpdatePai",data);
	}
	this.SendUser=function(action){
		var data={};
		var vuser=Array(this.m_nMaxUser);
		for( var i=0; i<this.m_nMaxUser; i++ ){
			if( i>=this.m_vUser.length ) break;
			if( this.m_vUser[i]==null ) continue;
			vuser[i]=this.m_vUser[i].GetUserData();
		}
		data['user']=vuser;
		data['rule']=this.m_Rule;
		data['owner']=this.ownerid;
		data['action']=action;
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			data['chair']=i;
			this.m_vUser[i].toC("UpdateUser",data);
		}
	}
	this.SendAll=function(fun,param){
		for( var i=0; i<this.m_nMaxUser; i++ ){
			if( i>=this.m_vUser.length ) break;
			if( this.m_vUser[i]==null ) continue;
			this.m_vUser[i].toC(fun,param);
		}
	}

	this.trydel=0;
	this.m_nState_DB;
	this.m_vSaveData;
	this.m_vSaveDataOk;
	this.m_deltimer=null;
	this.onDBSaveOk=function (data){
		//this.m_vSaveDataOk=this.m_vSaveData;
	}
	this.onDBSaveErr=function (err){
		this.err("onDBSaveErr:"+err);
	}
	this.SetDBState=function(){
		if( this.m_nState==this.m_nState_DB ) return;

		var state=0;
		switch(this.m_nState){
		case 0: state=0; break; //刚创建		
		case 1: state=1; break; //已开局		
		case -1: state=2; break; //无效或结束
		}
		js_sql.query("update mj_desk set `state`="+state+",`num`="+this.m_nLunNum+
			" where `key`='"+this.key+"'", this, this.SetDBStateOk, this.SetDBStateErr);
	}
	this.SetDBStateOk=function(){
		this.m_nState_DB=this.m_nState;
	}
	this.SetDBStateErr=function(err){
		this.err(err);
	}
	this.DeskClose=function(){
		clearTimeout(this.m_pOutTimer);
		if( this.m_nState!=-1 ){
			this.m_nState=-1;
			this.SetDBState();

			var endtime=new Date().Format("yyyy-MM-dd hh:mm:ss");
			var joinuser='|';
			var userdata=Array(this.m_vUser.length);
			for( var i=0; i<this.m_vUser.length; i++ ){
				userdata[i]={};
				if( this.m_vUser[i]==null ) continue;
				joinuser+=this.m_vUser[i].uid+'|';
				userdata[i]=this.m_vUser[i].GetRecData('desk');
			}
			var sql="INSERT INTO stat_desk (`id`,`deskid`,`startime`,`endtime`,`joinuser`,`userdata`) VALUES ('"+
				null+"',"+this.deskid+",'"+this.m_StartTime+"','"+endtime+"','"+joinuser+"','"+JSON.stringify(userdata)+"')";
			this.tr("sql:"+sql);
			js_sql.query(sql, this, this.onDBSaveOk, this.onDBSaveErr);
		}

		this.tryDelDesk();
	}

	this.m_lastUserPai=[];
	this.m_Back=[];
	this.InitBack=function(){
		var pai;
		var update=Array(this.m_vUser.length);
		this.m_lastUserPai=Array(this.m_vUser.length);
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			pai=this.m_vUser[i].m_Pai;
			this.m_lastUserPai[i]={show:[],out:[],self:[]};
			update[i]={show:[],out:[],self:[]};

			this.m_lastUserPai[i].self=Array(pai.vpai.length);
			for( var j=0; j<pai.vpai.length; j++ ){
				this.m_lastUserPai[i].self[j]=pai.vpai[j].id;
				update[i].self[j]=pai.vpai[j].id;
			}
		}
		this.m_Back=[];
		this.m_Back.push({action:"init",user:0,pai:0,desk:update});
		this.tr(JSON.stringify(this.m_lastUserPai));
	}
	this.AddBack=function(action,chairid,paiid){
		var r, hav;
		var pai;
		var vshow, vout, vself;
		var update=Array(this.m_vUser.length);
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			update[i]={show:[],out:[],self:[]};
			pai=this.m_vUser[i].m_Pai;

			r=false;
			vshow=Array(pai.showpai.length);
			for( var j=0; j<pai.showpai.length; j++ ){
				vshow[j]=Array(pai.showpai[j].length);
				for( var k=0; k<pai.showpai[j].length; k++ ){
					vshow[j][k]=pai.showpai[j][k].id;
					if( r ) continue;
					if( j>=this.m_lastUserPai[i].show.length ){ r=true; continue; }
					if( k>=this.m_lastUserPai[i].show[j].length ){ r=true; continue; }
					if( pai.showpai[j][k].id == this.m_lastUserPai[i].show[j][k] ) continue; 
					r=true;
				}
			}
			if( r ){
				this.m_lastUserPai[i].show=vshow;
				update[i].show=vshow;
			}

			r=false;
			vself=[];
			for( j=0; j<pai.vpai.length; j++ ){
				if( pai.vpai[j].flag!=0 ) continue;
				vself.push(pai.vpai[j].id);
				if( r ) continue;
				if( vself.length>this.m_lastUserPai[i].self.length ){ r=true; continue; }
				if( pai.vpai[j].id==this.m_lastUserPai[i].self[vself.length-1] ) continue;
				r=true;
			}
			if( vself.length!=this.m_lastUserPai[i].self.length ) r=true;
			if( r ){
				this.m_lastUserPai[i].self=vself;
				update[i].self=vself;
			}

			r=false;
			hav=false;
			vout=Array(pai.voutpai.length);
			for( j=0; j<pai.voutpai.length; j++ ){
				vout[j]=pai.voutpai[j].id;
				if( vout[j]==paiid ) hav=true;
				if( r ) continue;
				if( j>=this.m_lastUserPai[i].out.length ){ r=true; continue; }
				if( pai.voutpai[j].id==this.m_lastUserPai[i].out[j] ) continue;
				r=true;
			}
			if( i==chairid && action=="out" && !hav ){ r=true; vout.push(paiid); 
				this.tr("addback:"+JSON.stringify(pai.voutpai));
			}
			if( r ){
				this.m_lastUserPai[i].out=vout;
				update[i].out=vout;
			}
			if( update[i].show.length==0 && update[i].self.length==0 && update[i].out.length==0 ) 
				update[i]=null;
		}
		this.m_Back.push({action:action,user:chairid,pai:paiid,desk:update});
		//this.tr("addback:"+JSON.stringify(this.m_lastUserPai));
		//this.tr("addback:"+JSON.stringify(this.m_Back));
	}
	this.SaveBack=function(){
		var user;
		var userdata=Array(this.m_vUser.length);
		for( var i=0; i<this.m_vUser.length; i++ ){
			userdata[i]=null;
			if( this.m_vUser[i]==null ) continue;
			user=this.m_vUser[i];
			userdata[i]={uid:user.uid,nick:user.m_sNick,head:user.m_sHead,chair:i};
		}
		var sql="INSERT INTO mj_repaly (`id`,`replayid`,`playerdata`,`gamedata`,`resultdata`) VALUES ('"+
				null+"','"+this.deskid+"|"+this.m_nLunNum+"','"+JSON.stringify(userdata)+"','"+JSON.stringify(this.m_Back)+"','"+JSON.stringify(this.m_HuData)+"')";
		
		this.tr("sql:"+sql);
		js_sql.query(sql, this, this.onDBSaveOk, this.onDBSaveErr);
	}
	this.m_NetBreakTimer=null;
	this.NetBreakTimer=function(){
		//this.tr("this.NetBreakTimer:"+JSON.stringify(this.m_NetBreakTimer));
		if( this.m_nState<1 ){ clearTimeout(this.m_NetBreakTimer); return; }

		var a=this;
		var loc=new Date();
		var sec=Date.parse(loc)/1000;
		var user, max=-1;
		for( var i=0; i<this.m_vUser.length; i++ ){
			if( this.m_vUser[i]==null ) continue;
			user=this.m_vUser[i];
			if(!user.outtime) continue;
			if((sec-user.outtime)>=8*60){
				this.SendAll("UnNetCloseDesk",{chair:i});
				setTimeout( function(){ 
					a.m_HuData=Array(a.m_vUser.length);
					for( var j=0; j<a.m_vUser.length; j++ ){				
						if( a.m_vUser[j]==null ) continue;
						a.m_HuData[j]=a.m_vUser[j].GetLoseData(null,0,0,0,false,0);
						a.m_HuData[j]['score']=a.m_vUser[j].m_Num;
					}		
					a.GameEnd();
					a.AddBack('huang',0,0);
					a.SaveBack();
					a.m_nState=-1; 
					a.ClearUser();
					a.DeskClose();
				}, 1000*2 );
				return;
			}
			if((sec-user.outtime)>max) max=sec-user.outtime;
		}
		if( max<0 ){ clearTimeout(this.m_NetBreakTimer); return; }
		clearTimeout(this.m_NetBreakTimer);
		var b=this;
		this.m_NetBreakTimer=setTimeout( function(){ b.NetBreakTimer(); }, 1000*(8*60-max) );
		this.tr("this.NetBreakTimer:"+1000*(8*60-max));
	}
}
MjDesk.prototype.GetId=function(){
	return this.deskid;
}
MjDesk.prototype.tryDelDesk=function(){
	clearTimeout(this.m_deltimer);
	if( this.m_nState!=-1 ) return;//游戏未结束

	var user, hav=false;
	for( var i=0; i<this.m_vUser.length; i++ ){
		user=this.m_vUser[i];
		if( user==null ) continue;
		if( user.netuser==null ){ this.DelUserByID(i); continue; }
		if( user.deskctrl==null ){ this.DelUserByID(i); continue; }
		hav=true;
		//user.toC("onError", {"msg":"游戏已经结束，"+(10-this.trydel)+"分钟后自动关闭"});
	}
	if( this.trydel>=10 ){ this.ClearUser(); hav=false; }
	//同步数据
	if(this.m_nState_DB!=this.m_nState){ this.SetDBState(); hav=true; }
	if( this.m_vSaveData!=this.m_vSaveDataOk ){
		hav=true;
		//保存数据
		this.m_vSaveDataOk=this.m_vSaveData;
	}
	if( hav==true ){ 
		this.trydel++;
		var a=this;
		this.m_deltimer=setTimeout( function(){a.tryDelDesk();}, 1000*60 );
		return;
	}
	
	js_ctrl.DelDesk(this.deskid);
	this.delThis();
}

js_util.inherits(MjDesk, js_base);