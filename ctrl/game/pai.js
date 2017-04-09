var js_util = require('util');
var js_base = require('../baseobj');
module.exports = stPai;

//	m_Type		m_Value
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-//
//	0		|	中	1	发2	白											  
//			|
//	1		|	东 1	西2	南	  北									 
//			|
//	2		|	一万  二万	……	九万
//			|
//	3		|	一条	二条	……	九条					
//			|
//	4		|	一饼	二饼	……	九饼
//			|
//	5		|	春		夏		秋		东		竹		兰		梅		菊
//			|
//  this.id=num*100+type*10+v //牌的唯一id num 是0-3
//	this.type=t;			//牌类型
//	this.value=v;			//牌字
//	this.flag=v;			//0 自摸 1 吃 2 碰 3 明杠 4 暗杠 
//  this.hu                 //1 胡牌 
//  this.jiang                 //1 jiang
//  this.ghua                 //1 杠花
//  this.from                  // 0自摸 从哪个uid里来
//-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-//
function stPai (){
	js_base.call(this);
	this.name="stPai";
	
	this.vfan=[];
	this.fan=0;
	this.hua=0;
	this.ranhua=0;
	this.vgang=[];
	this.vgangname=[];
	this.gang=0;
	this.vpai=[];
	this.sum=0;

	this.showpai=[];//吃 2 碰 3 杠
	this.huapai=[];
	this.voutpai=[];//打出
	this.vouttype=[0,0,0,0,0,0];
	this.outpai=null;//打出
	this.mopai=null;

	this.ting=false;
	this.tingkind=0;
	this.tingnum=0;
	this.show=false;
	this.tingpai=[];

	this.isqqdd=false;
	this.isyj=false;
	this.isqys=false;
	this.waiuser=null;
	this.genpai=null;

	this.isHua=function( pai ){
		if( !pai ) return false;
		if( pai.type==5 ) return true;
		if( pai.type==0 ) return true;
		return false;
	}
	this.InitUserHua=function( desk ){
		if( !this.vpai ) return false;
		var hua=false;
		for( var i=0; i<this.vpai.length; i++ ){
			if( !this.isHua(this.vpai[i]) ) continue;
			this.voutpai.push(this.vpai[i]);//补花
			this.vpai.splice(i,1);
			i--;
			this.vpai.push(desk.GetPai(1));
			hua=true;
		}
		return hua;
	}
	this.MoPai=function( pai, isghua ){
		if( pai==null ) return false;
		if( pai['id']<0 ) return false;
		pai['flag']=0;
		pai['ghua']=isghua;
		pai['jiang']=0;
		pai['from']=0;
		this.mopai=pai;
		this.vpai.push(pai);
		return true;
	}
	this.ChuPai=function( paiid, uid ){
		var id=this.FindPai( paiid, null );
		if( id<0 ) return false;
		if( this.vpai[id]['flag']!=0 ) return false;

		this.outpai=this.vpai[id];
		this.outpai['from']=uid;
		if( !this.vouttype[this.outpai.type] ){
			this.vouttype[this.outpai.type]=[0,0,0,0,0,0,0,0,0,0];
		}
		this.vouttype[this.outpai.type][this.outpai.value]++;
		this.vpai.splice(id,1);
		this.mopai=null;
		this.genpai=null;
		return true;
	}
	this.isBaoZi=function(){
		var v;
		for( var i=0; i<this.vouttype.length; i++ ){
			if(!this.vouttype[i]) continue;
			v=this.vouttype[i];
			for( var j=0; j<v.length; j++ )
				if(v[j]>=4) return true;
		}
		return false;
	}
	this.ChuPaiOk=function(){
		if( this.outpai==null ) return;
		this.outpai['ghua']=0;
		this.voutpai.push(this.outpai);//打出
		this.outpai=null;
	}
	this.isPeng=function( peng ){
		var pai=this.vFindPai( peng['type'], peng['value'], 0 );
		return (pai.length>=2 );
	}
	this.isPengEx=function( peng ){
		var pai=this.vFindPai( peng['type'], peng['value'], 0 );
		return pai;
	}
	this.isGang=function( desk, gang ){
		var pai=this.vFindPai( gang['type'], gang['value'], 0 );
		if( pai.length<3 ) return false;
		if( !this.ting ) return true;

		pai[0].flag=4;pai[1].flag=4;pai[2].flag=4;gang.flag=4;
		var vtype=this.InitType(null,gang);
		var vting=this.isSubTing(desk,vtype);
		pai[0].flag=0;pai[1].flag=0;pai[2].flag=0;gang.flag=0;
		if( this.tingpai.length<1 ) return true;
		if( this.tingpai[0].ting.length>vting.length ) return false;
		return true;
	}
	this.isGangEx=function( gang ){
		var pai=this.vFindPai( gang['type'], gang['value'], 0 );
		return pai;
	}
	this.isJiaGang=function( gang ){
		var pai=this.vFindPai( gang['type'], gang['value'], -1 );
		if( pai.length<4 ) return false;

		var num=0;
		for( var i=0; i<pai.length; i++ ){
			if( pai[i]['flag']==0 ) continue;
			if( pai[i]['flag']!=2 ) return false;
			num++;
		}
		return (num>2);
	}
	this.sortPai=function(a, b){
		return a['value'] - b['value'];
	}
	this.PengPai=function( peng, fromid ){
		var pai=this.vFindPai( peng['type'], peng['value'], 0 );
		if( pai.length<2 ) return false;
		
		peng['flag']=2; peng['ghua']=0;
		pai[0]['flag']=2; pai[0]['ghua']=0;
		pai[1]['flag']=2; pai[1]['ghua']=0;
		peng['from']=fromid;
		this.vpai.push(peng);
		this.mopai=null;
		this.showpai.push([peng,pai[0],pai[1]]);
		return true;
	}
	this.HuaGangPai=function(){
		var num=0;
		for( var i=0; i<this.huapai.length; i++ ){
			if( this.huapai[i].length<4 ) continue;
			if( this.huapai[i][0].flag ) continue;
			for( var j=0; j<this.huapai[i].length; j++ ){
				this.huapai[i][j].flag=4;
			}
			num++;
		}
		return num;
	}
	this.GangPai=function( gang, flag, fromid ){
		var pai;
		if( flag ==1 ){
			pai=this.vFindPai( gang['type'], gang['value'], 0 );
			if( pai.length<4 ) return -1;
			pai[0]['flag']=4; if( gang.id!=pai[0].id ) pai[0]['ghua']=0;
			pai[1]['flag']=4; if( gang.id!=pai[1].id ) pai[1]['ghua']=0;
			pai[2]['flag']=4; if( gang.id!=pai[2].id ) pai[2]['ghua']=0;
			pai[3]['flag']=4; if( gang.id!=pai[3].id ) pai[3]['ghua']=0;
			this.showpai.push([pai[0],pai[1],pai[2],pai[3]]);
			this.mopai=null;
			return this.showpai.length-1;
		}
		if( flag ==0 ){
			pai=this.vFindPai( gang['type'], gang['value'], 0 );
			if( pai.length<3 ) return -1;
			gang['flag']=3;
			gang['from']=fromid;

			pai[0]['flag']=3; pai[0]['ghua']=0;
			pai[1]['flag']=3; pai[1]['ghua']=0;
			pai[2]['flag']=3; pai[2]['ghua']=0;
			this.vpai.push(gang);
			this.showpai.push([gang,pai[0],pai[1],pai[2]]);
			this.mopai=null;
			return this.showpai.length-1;
		}
		if( flag==10 ){
			pai=this.vFindPai( gang['type'], gang['value'], -1 );
			this.tr("GangPai:("+gang['type']+","+gang['value']+"),"+pai.length);
			if( pai.length<4 ) return -1;
			for( var i=0; i<pai.length; i++ ){
				//this.tr("GangPai:"+pai[i].flag);
				if( pai[i]['flag']!=0 && pai[i]['flag']!=2 ) return -1;
			}
			pai[0]['flag']=5; if( gang.id!=pai[0].id ) pai[0]['ghua']=0;
			pai[1]['flag']=5; if( gang.id!=pai[1].id ) pai[1]['ghua']=0;
			pai[2]['flag']=5; if( gang.id!=pai[2].id ) pai[2]['ghua']=0;
			pai[3]['flag']=5; if( gang.id!=pai[3].id ) pai[3]['ghua']=0;		
			for( i=0; i<this.showpai.length; i++ ){
				pai=this.showpai[i];
				if( pai[0].type==gang.type && pai[0].value==gang.value ){
					pai.push(gang);
					this.mopai=null;
					return i;
				}
			}
			return -1;
		}
		return -1;
	}
	this.FindPai=function( id, vpai ){
		if( vpai==null ) vpai=this.vpai;
		var pai;
		for( var i=0; i<vpai.length; i++ ){
			pai=vpai[i];
			if( pai==null ) continue;
			if( pai['id']==id ) return i;
		}
		return -1;
	}
	this.vFindPai=function(t,v,f){
		if( v<0 || v>9 || t>5 || t<0 ) return [];
		if( t>1 && v<1 ) return [];

		var re=[];
		var pai;
		for( var i=0; i<this.vpai.length; i++ ){
			pai=this.vpai[i];
			if( pai==null ) continue;
			if( f<0 ){
				if( pai['type']==t &&  pai['value']==v ) 
					re.push(pai);
			}else{
				if( pai['type']==t &&  pai['value']==v && pai['flag']==f ) 
					re.push(pai);
			}
		}
		return re;
	}
	this.GetHuaNum=function(){
		var num=0;
		if( !this.voutpai ) return num;
		
		var out=this.outpai;
		for( var i=0; i<this.voutpai.length; i++ ){
			if( out && out==this.voutpai[i] ) out=null;
			if( !this.isHua(this.voutpai[i]) ) continue;
			num++;
		}
		if( out && this.isHua(out) ) num++;
		return num;
	}
	this.GetRuanHua=function(huflag,vtype,hupai){
		if( !vtype || vtype.length<5 ) return 0;

		//缺一门
		var pai;
		var que=0, j, num=0;
		for( var i=2; i<5; i++ ){
			if( vtype[i]['sumex']>1 ) continue;
			for( j=0; j<this.vpai.length; j++ ){
				pai=this.vpai[j];
				if( pai==null ) continue;
				if( pai['type']==i ) break;
			}
			if( j>=this.vpai.length ) que++;
		}
		if( que==1 ) num++;
		this.tr("缺一门:"+num);
		if( huflag==10 ) return num;//七小对
		
		//风碰
		var sz;
		var type=vtype[1];
		for(  i=0; i<4; i++ ){
			if( type['painumex'][i]<3 ) continue;
			num++;
			if( type['painumex'][i]<4 ) continue;
			num++;
			sz=this.vFindPai( 1, i, 4 );
			if( sz.length>3 ) num++;
		}
		this.tr("风碰:"+num);

		//杠
		for( i=0; i<this.showpai.length; i++ ){
			pai=this.showpai[i];
			if( pai[0].type<2 ) continue;
			if( pai[0].flag==3 ||  pai[0].flag==5 ) num++;
			if( pai[0].flag==4 ) num++;
		}
		this.tr("杠:"+num);

		if( this.isJia(huflag,vtype,hupai) ) num++;
		this.tr("isJia:"+num);

		return num;
	}
	this.isHu=function(desk,vpai,pai){
		if( desk==null ) return false;
		if(pai!=null) this.tr("isHu:"+JSON.stringify(pai));

		if( vpai==null ) vpai=this.vpai;
		if( pai==null ) pai=this.mopai; 
		if( pai!=null ){
			if( this.FindPai(pai.id,vpai)<0 ){
				var sz=Array(vpai.length);
				for( var i=0; i<vpai.length; i++ ) sz[i]=vpai[i];
				sz.push(pai);
				vpai=sz;
			}
		} else return false;

		var vtype=this.InitType(vpai,null);
		if( this.isQiXiaoDui(vpai,vtype) ) return true;
		if( !this.isPingHu(0,vpai,vtype) ) return false;
		this.tr("this.isHu:"+this.ting+","+pai.from);

		if( !this.isPingHu(1,vpai,vtype) ) return false;
		if(pai.flag!=5) pai.flag=1; pai.hu=1;
		var xiaohu=this.isXiaoHu(vtype,vpai,pai,desk);
		if(pai.flag!=5) pai.flag=0; pai.hu=0;
		for( var i=0; i<vpai.length; i++ ) vpai[i]['jiang']=0;
		if( xiaohu ){
			if( this.isMenQing(vpai)<1 && this.GetHuaNum()<4 ){
				this.tr("【小胡】【非门清】:hua="+this.GetHuaNum());
				return false;
			}
		}
		return true;
	}
	this.isWaiBao=function(desk,self,outpai){
		if( !outpai || !desk || !self ) return null;
		if( outpai['flag']==5 ) return null;
		var szshow=this.showpai;
						//this.tr("szshow:"+JSON.stringify(szshow));
		var sznum=Array(desk.m_vUser.length), j, cid, type=0, allnum=0;
		allnum=self.m_Pai.GetAnGangNum();
		for( var i=0; i<desk.m_vUser.length; i++ ){
			sznum[i]=0;
			if( desk.m_vUser[i]==self ) continue;
			sznum[i]=allnum;
		}
		for( i=0; i<szshow.length; i++ ){
			if( szshow[i][0].flag!=2 && szshow[i][0].flag!=5 && szshow[i][0].flag!=3 ) continue;
			allnum++;
			if(type==0) type=szshow[i][0].type;
			else if( type>0 && type!=szshow[i][0].type ) type=-1;
			if(szshow[i][0].type==1) type=-1;
			for( j=0; j<szshow[i].length; j++ ){
				cid=desk.FindUserChair( szshow[i][j]['from'] );
				if(cid<0) continue;
				sznum[cid]++;
			}
		}
		this.tr("【外包】:isWaiBao="+JSON.stringify(sznum));
		if(type>0){//清三嘴		
			if( allnum>=3 && this.isPeng(outpai) ) return desk.FindUser(outpai['from']);
		}
		for( i=0; i<sznum.length; i++ ){
			if( sznum[i]>=3 && this.isPeng(outpai) ){
				return desk.m_vUser[i];
			}
		}
		return null;
	}
	this.isBao=function(desk,self,outpai){
		if( outpai.flag==5 )
			return desk.FindUser(outpai['from']);
		
		if( outpai['ghua']!=1 ) return null;
		
		var szshow=this.showpai[this.showpai.length-1];
		if( szshow[0].flag==3 || szshow[0].flag==5 ){
			for( var i=0; i<szshow.length; i++ ){
				if( !szshow[i]['from'] ) continue;
				if( szshow[i]['from']==self.uid ) continue;
				return desk.FindUser(szshow[i]['from']);
			}
		}
		return null;
	}
	this.HuPai=function(desk,pai,user){
		this.waiuser=this.isWaiBao(desk,user,pai);
		if(this.waiuser){
			desk.m_BiXia[1]=true;
			desk.m_ChgZhuang=false;
			this.fan=50;
			this.vfan.push({name:"外包","fan":this.fan});
			if( desk.m_BiXia[0] ){ this.vfan.push({name:"比下胡","fan":0}); this.fan*=2; }
			user.m_Num.waibao++;
			return true;
		}

		this.isqys=false;
		if( pai==null ) pai=this.mopai; 
		else if(pai.flag!=5) pai.flag=1;
		pai.hu=1;//加杠胡，必须为胡 否则inittype 数据错误
		pai.jiang=0;
		if( !this.isHu(desk,null,pai) ) return false;
		
		if( pai!=null ){
			if( pai.flag!=5 && pai.from>0 ) pai.flag=1;
			pai.hu=1;
		}

		if( this.FindPai(pai.id,this.vpai)<0 ) this.vpai.push(pai);
		var vtype=this.InitType(null,null);
		this.vfan=[];
		this.fan=0;
		var fan=0;
		this.hua=0;
		this.ranhua=0;
		if( this.isQiXiaoDui(null,vtype) ){
			desk.m_BiXia[1]=true;
			this.fan=60;
			fan=this.isShuangQi(vtype,pai);
			if(fan>0){ this.vfan.push({name:"双七对","fan":fan}); this.fan=fan; }
			else this.vfan.push({name:"七对","fan":this.fan});
			fan=this.isQingYiSe(null,vtype);
			if(fan==20){ this.vfan.push({name:"混一色","fan":fan}); this.fan+=fan; }
			else if(fan==30){ this.vfan.push({name:"清一色","fan":fan}); this.fan+=fan; this.isqys=true; }
			fan=this.isWuHuaGuo();
			if(fan>0){ this.vfan.push({name:"无花果","fan":fan}); this.fan+=fan;  }
			else  this.hua=this.GetHuaNum();
			this.ranhua=this.GetRuanHua(10,vtype,pai);
			this.hua+=ranhua;
			this.fan+=this.hua;
			if( desk.m_BiXia[0] ){ this.vfan.push({name:"比下胡","fan":0}); this.fan*=2; }
			return true;
		}
		if( this.isPingHu(1,null,vtype) ){
			this.isqqdd=false;
			this.isyj=false;
			this.fan=this.GetFan(desk,vtype,null,pai);
			if( this.fan>10 ) desk.m_BiXia[1]=true;
			fan=this.isMenQing(null);
			if( fan>0 ){ this.vfan.push({name:"门清","fan":fan}); this.fan+=fan; }
			this.hua=this.GetHuaNum();
			if(this.isqqdd) this.ranhua=this.GetRuanHua(5,vtype,pai);
			else if(this.isyj) this.ranhua=this.GetRuanHua(6,vtype,pai);
			else this.ranhua=this.GetRuanHua(0,vtype,pai);
			this.hua+=this.ranhua;
			this.fan+=this.hua;
			if( desk.m_BiXia[0] ){ this.vfan.push({name:"比下胡","fan":0}); this.fan*=2; }

			return true;
		}
		this.fan=0;
		this.vfan=[];
		pai.hu=0;
		return false;
	}
	this.isXiaoHu=function(vtype,vpai,pai,desk){
		if( this.isPengPengHu(vtype)>0 ) return false;
		if( this.isTianHu(desk.m_MoNum,desk.m_OutNum)>0 ) return false;
		if( this.isDiHu()>0 ) return false;
//		fan=this.isGangShangHua(pai);
//		if( fan>0 ) return false;
		if( this.isQuanQiu(vtype,pai)>0 ) return false;
//		fan=this.isMenQing(vpai);
//		if( fan>0 ) return false;
		if( this.isQingYiSe(vpai,vtype)>0 ) return false;
//		fan=this.isWuHuaGuo();
//		if( fan>0 ) return false;
		this.tr("【小胡】");
		return true;
	}
	this.GetFan=function(desk,vtype,vpai,pai){
		var guiyi=0;
		var re=10;
		var fan=0;

		fan=this.isTianHu(desk.m_MoNum,desk.m_OutNum);
		if( fan>0 ){ this.vfan.push({name:"天胡","fan":fan}); return fan; }

		fan=this.isDiHu();
		if( fan>0 ){ this.vfan.push({name:"地胡","fan":fan}); return fan; }

		if( this.isZiMo(pai) ) this.vfan.push({name:"自摸","fan":1}); 

		fan=this.isPengPengHu(vtype);
		if(fan>0){ 
			if( this.isQuanQiu(vtype,pai)>0 ){ 
				this.isqqdd=true;
				this.vfan.push({name:"全球独钓","fan":50}); re+=50; 
			}
			else{ this.vfan.push({name:"对对胡","fan":fan}); re+=fan; }
		}

		fan=this.isGangShangHua(pai);
		if(fan==10){ this.vfan.push({name:"小杠花","fan":fan}); re+=fan; }
		else if(fan==20){ this.vfan.push({name:"大杠花","fan":fan}); re+=fan; }

		fan=this.isYaJue(pai,desk);
		if( fan>0 ){ 			
			this.isyj=true;
			this.vfan.push({name:"压绝","fan":fan}); 
			re+=fan; 
		}

		fan=this.isQingYiSe(null,vtype);
		if(fan==20){ this.vfan.push({name:"混一色","fan":fan}); re+=fan; }
		else if(fan==30){ this.vfan.push({name:"清一色","fan":fan}); re+=fan; this.isqys=true; }

		fan=this.isWuHuaGuo();
		if(fan>0){ this.vfan.push({name:"无花果","fan":fan}); re+=fan; }
		
		if( re==10 ) this.vfan.push({name:"小胡","fan":1});

		return re;
	}
	this.InitType=function(vpai,trypai){
		if( vpai==null ) vpai=this.vpai;
		if( trypai!=null ){
			if( this.FindPai(trypai.id,vpai)<0 ){
				var sz=Array(vpai.length);
				for( var i=0; i<vpai.length; i++ ) sz[i]=vpai[i];
				sz.push(trypai);
				vpai=sz;
			}
		}
		var val, t;
		var pai, type;
		this.sum=0;
		var vtype=Array(6);

		for( var i=0; i<vtype.length; i++ ){
			type={};
			type['sum']=0;
			type['sumex']=0;
			type['painum']=[0,0,0,0,0,0,0,0,0,0];
			type['painumex']=[0,0,0,0,0,0,0,0,0,0];
			vtype[i]=type;
		}

		for( i=0; i<vpai.length; i++ ){
			pai=vpai[i];
			if( !this.isPai(pai) ) continue;
			this.sum++;
			t=pai['type'];
			val=pai['value'];
			type=vtype[t];
			if( pai['hu']!=1 )
				if( pai['flag']==3 || pai['flag']==4 || pai['flag']==5 ) continue;//去大小明杠 暗杠 抢杠胡
			type['sumex']++;
			type['painumex'][val]++;
			if( pai['flag']!=0 && pai['hu']!=1 ) continue;//去吃 碰 杠 含最后一张
			type['sum']++;
			type['painum'][val]++;
		}
		for( i=0; i<vtype.length; i++ ){
			type=vtype[i];
			this.tr("InitType:["+i+"]="+type['sum']+","+JSON.stringify(type['painum']));
			this.tr("InitType:["+i+"]="+type['sumex']+","+JSON.stringify(type['painumex']));
			//this.tr("InitType:"+JSON.stringify(type['painumex']));
		}
		return vtype;
	}
	this.isPai=function(pai){
		if( pai==null ) return false;
		//if( this.pai!=null ){
		//	this.tr("pai:["+this.pai.id+"]");
		//}
		var t=pai['type'];
		if( t>5 || t<0 ) return false;
		var val=pai['value'];
		if( val==0 ){
			if( t==0 || t==1 ) return true;
		}
		if( val<1 || val>9 ) return false;
		return true;
	}

	//将
	this.GetJiang=function(vtype){
		var vj=[];
		var t=-1, n;
		for( var i=0; i<vtype.length; i++ ){
			if( vtype[i]['sum']%3 ==2 ){ t=i; break; }
		}
		if( t==-1 ) return vj; 
		var type=vtype[t];
		if( type==null ) return vj;

		//this.tr("GetJiang:t="+t);

		var jiang;
		for( i=0; i<type['painum'].length; i++ ){
			if( type['painum'][i]=="undefined" ) continue;
			if( type['painum'][i]<2 ) continue;
			jiang={};
			jiang['type']=t;
			jiang['value']=i;
			vj.push(jiang);
		}
		//if(vj.length>0) this.tr("GetJiang:"+JSON.stringify(vj));
		return vj;
	}

	//刻
	this.GetKe=function(vtype){
		var type;
		var vke=[];
		var pai={};
		for( var i=0; i<vtype.length; i++ ){
			type=vtype[i];
			if( type==null ) continue;
			if(type['sum']<1) continue;

			for( var j=0; j<type['painum'].length; j++ ){
				if( type['painum'][j]=="undefined" ) continue;
				if( type['painum'][j]<3 ) continue;
				pai['type']=i;
				pai['value']=j;
				vke.push(pai);
			}
		}
		return vke;
	}

	//顺
	this.isShun=function(vtype){
		//this.tr("isShun:");
		var type;
		var v;
		for( var k=2; k<vtype.length; k++ ) {
			type=vtype[k];
			if(type==null ) continue;
			if(type['sum']<1) continue;

			v=Array(type['painum'].length);
			for( var i=1; i<type['painum'].length; i++ ) v[i]=type['painum'][i];
			//this.tr("isShun:"+JSON.stringify(v));
			for( i=1; i<v.length; i++ ){
				if( v[i]=="undefined" ) continue;
				if( v[i]>=3 ) v[i]-=3;
				if( v[i]<1 ) continue;
				if( i+2>=v.length ) return false;
				//this.tr("isShun:"+v[i]+","+v[i+1]+","+v[i+2]);
				if( v[i+1]<v[i] || v[i+2]<v[i] ) return false;
				v[i+1]-=v[i];
				v[i+2]-=v[i];
			}
		}
		this.tr("isShun:true");
		return true;
	}

	this.GetPaiXing=function(showpai,vpai){
		if( showpai==null ) showpai=this.showpai;
		if( vpai==null ) vpai=this.vpai;
		var sub, re={ ke:[], jiang:[], shun:[], gang:[] };
		for( var i=0; i<showpai.length; i++ ){
			sub=showpai[i];
			if( sub==null ) continue;
			if( sub.length<3 ) continue;
			switch(sub[0].flag){
			case 1: re['shun'].push(sub); continue;
			case 2: re['ke'].push(sub); continue;
			case 3: 
			case 4: 
			case 5: 
				re['gang'].push(sub); continue;
			}
		}
		this.tr("GetPaiXing:"+JSON.stringify(re));

		sub=this.GetSubPaiXing(vpai);
		if( sub==null ) return null;
		if( sub['jiang'].length<2 ) return null;

		re['jiang']=sub['jiang'];
		re['ke']=re['ke'].concat(sub['ke']);
		re['shun']=re['shun'].concat(sub['shun']);
		this.tr("GetPaiXing:"+JSON.stringify(re));
		return re;
	}
	this.GetSubPaiXing=function(vpai){
		if( vpai==null ) vpai=this.vpai;
		//生成type[t][v]统计数组
		var type=Array(6);
		for( var i=0; i<type.length; i++ ) type[i]=[0,0,0,0,0,0,0,0,0,0];

		var re={};
		re['ke']=[];
		re['shun']=[];
		re['jiang']=[];
		var szpai=[];
		for( i=0; i<vpai.length; i++ ){
			if( vpai[i]==null ) continue;
			if( vpai[i]['jiang']==1 ){
				re['jiang'].push(vpai[i]);
				continue;
			}
			if( vpai[i]['hu']!=1 && vpai[i]['flag']!=0 ) continue;  
			szpai.push(vpai[i]);
			type[vpai[i].type][vpai[i].value]++;
		}
		//this.tr("SubPaiXing["+szpai.length+"]:"+JSON.stringify(szpai));
		//if( (szpai.length)%3!=0 ) return null;

		if( szpai.length<1 ) return re;
		
		var v, shun;
		for( var k=0; k<type.length; k++ ) {
			v=type[k];
			if( v==null ) continue;
			//this.tr("v:"+JSON.stringify(v));
			for( i=0; i<v.length; i++ ){		
				if( v[i]<1 ) continue;

				if( k<2 ){//字牌
					if( v[i]!=3 ) continue;
					shun=[this.FindPaiBySz(k,i,szpai),this.FindPaiBySz(k,i,szpai),this.FindPaiBySz(k,i,szpai)];
					re['ke'].push(shun);
					continue;
				}else if( i==0 ) continue;

				if( v[i]>=3 ){
					v[i]-=3;
					shun=[this.FindPaiBySz(k,i,szpai),this.FindPaiBySz(k,i,szpai),this.FindPaiBySz(k,i,szpai)];
					//this.tr("ke:["+k+","+i+"]"+JSON.stringify(shun));
					if( shun[0]==null || shun[1]==null || shun[2]==null ) return null;
					re['ke'].push(shun);
					if( v[i]<1 ) continue;
				}
				if( i+2>=v.length ) return null;

				if( v[i+1]<v[i] || v[i+2]<v[i] ) return null;
				for( var j=0; j<v[i]; j++ ){
					v[i+1]--;
					v[i+2]--;
					shun=[this.FindPaiBySz(k,i,szpai),this.FindPaiBySz(k,i+1,szpai),this.FindPaiBySz(k,i+2,szpai)];
					if( shun[0]==null || shun[1]==null || shun[2]==null ) return null;
					//this.tr("shun:"+JSON.stringify(shun));
					re['shun'].push(shun);
				}
			}
		}
		re['shun'].push(szpai);
		return re;
	}
	this.FindPaiBySz=function(t,v,sz){
		if(sz.length<1) return null;
		var pai;
		for( var i=0; i<sz.length; i++ ){
			if(sz[i].type!=t) continue;
			if(sz[i].value!=v) continue;
			pai=sz[i];
			sz.splice(i,1);
			//this.tr("FindPaiBySz:["+t+","+v+"]"+JSON.stringify(shun));
			return pai;
		}
		return null;
	}

	this.isPingHu=function(flag,vpai,vtype){
		if( vpai==null ) vpai=this.vpai;
		for( var i=0; i<vpai.length; i++ ) vpai[i].jiang=0;
		//去杠，去吃，去碰
		var t,v;
		var vj=this.GetJiang(vtype);
		if( vj.length<1 ) return false;
		for( i=0; i<vj.length; i++ ){
			t=vj[i]['type'];
			v=vj[i]['value'];
			vtype[t]['sum']-=2;
			vtype[t]['painum'][v]-=2;//去掉将
			if( this.isSubPingHu(vtype) ){
				if( flag==0 ){ 
					this.tr("isPingHu:true"); 
					vtype[t]['sum']+=2;
					vtype[t]['painum'][v]+=2;
					return true; 
				}
				this.SetJiang( vpai, t, v );
				if( flag==1 ){
					vtype[t]['sumex']-=2;
					vtype[t]['painumex'][v]-=2;//去掉将
				}else{
					vtype[t]['sum']+=2;
					vtype[t]['painum'][v]+=2;//不去将
				}
				this.tr("isPingHu:true");
				return true; 
			} 
			vtype[t]['sum']+=2;
			vtype[t]['painum'][v]+=2;
		}
		return false;
	}
	this.SetJiang=function( vpai, t, v ){
		if( vpai==null ) vpai=this.vpai;
		var vj=[], pai;
		var num=2;
		for( var i=0; i<vpai.length; i++ ){
			pai=vpai[i];
			if( pai==null ) continue;
			if( pai['type'] != t ) continue;
			if( pai['value'] != v ) continue;
			if( pai['flag'] != 0 && pai['hu']==0 ) continue;
			if( pai['hu']==1 ){ pai['jiang']=1; num--; continue; }
			vj.push(pai);
		}
		vj[0]['jiang']=1;
		if( num==2 ) vj[1]['jiang']=1;
		this.tr("SetJiang:"+t+","+v);
	}
	this.isSubPingHu=function(vtype){
		var type;
		for( var i=0; i<vtype.length; i++ ){
			type=vtype[i];
			if(type==null) continue;
			if(type['sum']<1) continue;

			//this.tr("isSubPingHu:["+i+"]"+JSON.stringify(type));
			//去掉将，杠后 应该是3的倍数
//			if( type['sum']%3!=0 ){ this.tr("isSubPingHu:["+i+"]"+type['sum']); return false; }
			if( type['sum']%3!=0 ) return false;
			
			if( i==0 || i==1 ){//字牌必须是刻
				for( var j=0; j<type['painum'].length; j++ ){
					if( type['painum'][j]!=3 && type['painum'][j]!=0 ) return false;
				}
			}
		}
		return this.isShun(vtype);
	}

	this.isJia=function(huflag,vtype,pai){
		if( pai==null ) return false;
		if( pai['jiang']==1 && huflag!=5 ) return true;//全球独钓
		if( huflag==6 ) return false;//压绝

		var v=pai['value'];
		if( v==1 || v==9 ) return false;
		if( pai['type']==1 ) return false;

		var type=vtype[pai['type']];
		if( v==3 ){
			type['painum'][1]--; type['painum'][2]--; type['painum'][3]--;
			if( this.isShun(vtype) ){
				type['painum'][1]++; type['painum'][2]++; type['painum'][3]++;
				return true;
			}
			type['painum'][1]++; type['painum'][2]++; type['painum'][3]++;
		}
		else if( v==7 ){
			type['painum'][7]--; type['painum'][8]--; type['painum'][9]--;
			if( this.isShun(vtype) ){
				type['painum'][7]++; type['painum'][8]++; type['painum'][9]++;
				return true;
			}
			type['painum'][7]++; type['painum'][8]++; type['painum'][9]++;
		}

		if( type['painum'][v-1]<1 ) return false;
		if( type['painum'][v+1]<1 ) return false;
		type['painum'][v-1]--;
		type['painum'][v]--;
		type['painum'][v+1]--;

		if( this.isShun(vtype) ){
			type['painum'][v-1]++;
			type['painum'][v]++;
			type['painum'][v+1]++;
			return true;
		}
		type['painum'][v-1]++;
		type['painum'][v]++;
		type['painum'][v+1]++;
		return false;
	}

	this.isQiXiaoDui=function(vpai,vtype){
		if( vpai==null ) vpai=this.vpai;
		var pai;
		for( var i=0; i<this.vpai.length; i++ ){
			pai=vpai[i];
			if( pai==null ) continue;
			if( pai['flag']==4 ) return false;
			if( pai['flag']!=0 && pai['hu']!=1 ) return false;
		}

		//var v4=0;
		var type;
		for( i=0; i<vtype.length; i++ ){
			type=vtype[i];
			if( type==null ) continue;
			for( var j=0; j<type['painum'].length; j++ ){
				if( type['painum'][j]%2!=0 ) return false; 
				if( type['painumex'][j]%2!=0 ) return false;
			}
		}

		this.tr("isQiXiaoDui:true");
		return true;
	}

	this.isShuangQi=function(vpai,pai){
		if( vpai==null ) vpai=this.vpai;
		if( !pai['hu'] ) return 0;
		
		var num=0;
		for( i=0; i<vpai.length; i++ ){
			if( vpai[i]==null ) continue;
			if( vpai[i].hu ) continue;
			if( vpai[i].type!=pai.type ) continue;
			if( vpai[i].value!=pai.value ) continue;
			num++;
		}
		if( num<3 ) return 0;
		return 100;
	}

	this.isWuHuaGuo=function(){
		if( this.GetHuaNum()>0 ) return 0;
		return 20;
	}

	this.isMenQing=function(vpai){
		if( vpai==null ) vpai=this.vpai;
		var pai;
		for( i=0; i<vpai.length; i++ ){
			pai=vpai[i];
			if( pai==null ) continue;
			if( pai['flag']==4 || pai['flag']==3 || pai['flag']==5 ) continue;//暗杠
			if( pai['flag']!=0 && pai['hu']!=1 ) return 0;
		}
		return 10;
	}

	this.isQingYiSe=function(vpai,vtype){
		//return 0;
		if( vpai==null ) vpai=this.vpai;
		this.tr("isQingYiSe:"+JSON.stringify(vpai));
		var t=0;
		var type;
		for( var i=2; i<5; i++ ){
			type=vtype[i];
			if( type['sumex']<=0 ) continue;
			if( t==0 ) t=i; else return 0;
		}

		var fan=30;
		for( i=0; i<vpai.length; i++ ){
			pai=vpai[i];
			if( pai==null ) continue;
			if( pai['type']==1 ){ fan=20; continue; }
			if( pai['type']!=t ) return 0;
		}

		return fan;
	}

	this.isYaJue=function(pai,desk){
		if( pai==null) return 0;

		var sz;
		for( var i=0; i<desk.m_vUser.length; i++ ){
			if( !desk.m_vUser[i] ) continue;
			sz=desk.m_vUser[i].m_Pai.vFindPai( pai.type, pai.value, 2 );
			if( !sz || sz.length<1 ) continue;
			return 20;
		}
		return 0;
	}

	this.isZiMo=function(pai){
		if( pai==null) return 1;
		if( pai['from']==0 ) return 1; else return 0;
		return 0;
	}
	this.isGangShangHua=function(pai){
		if( pai['from']!=0 ) return 0;
		if( pai['ghua']==1 || pai['ghua']==3 ) return 20;
		if(  pai['ghua']==2 ) return 10;
		return 0;
	}
	this.isJiaGangHu=function(pai){
		if( pai==null ) return 0;
		if( pai['flag']==5 ) return 1;
		return 0;
	}

	this.isDanDiaoJiang=function(){
		var pai;

		for( var i=0; i<this.vpai.length; i++ ){
			pai=this.vpai[i];
			if( pai==null ) continue;
			if( pai['jiang'] != 1 ) continue;
			if( pai['hu']==1 ) return true;
		}
		return false;
	}

	this.isShouZhuaYi=function(){
		var num=0;
		var pai;
		for( var i=0; i<this.vpai.length; i++ ){
			pai=this.vpai[i];
			if( pai==null ) continue;
			if( pai['hu']==1 ) continue;
			if( pai['jiang'] == 1 ) continue;
			if( pai['flag'] != 2 && pai['flag'] != 3 && pai['flag'] != 4 && pai['flag'] != 5 )  return 0;
		}
		return 4;
	}

	this.isPengPengHu=function(vtype){
		var type;
		var num=0;
		for( var i=0; i<vtype.length; i++ ){
			type=vtype[i];
			for( var j=0; j<type['painumex'].length; j++ ){
				if( type['painumex'][j]<1 ) continue; 
				if( type['painumex'][j]==1 ) return 0; 
				if( type['painumex'][j]==2 ){
					var pai=this.vFindPai( i, j, -1 );
					if( pai[0]['jiang'] != 1 ) return 0;
				}
			}
		}
		return 20;
	}

	this.isQuanQiu=function(vtype,pai){
		if( pai==null ) return 0;
		if( pai['jiang']!=1 ) return 0;
		if( !this.isPengPengHu(vtype) ) return 0;

		for( var i=0; i<this.vpai.length; i++ ){
			pai=this.vpai[i];
			if( pai==null ) continue;
			if( pai['jiang']==1 ) continue;
			if( pai['flag']==0 ) return 0;
			//if( pai['flag']==4 ) return 0;//暗杠
		}
		return 50;
	}

	this.isDiHu=function(){
		if( !this.ting ) return 0;
		return 40;
	}

	this.isTianHu=function(monum,outnum){
		//发牌，还未出
		if( monum>1 ) return 0;
		if( outnum>0 ) return 0;
		return 400;
	}

	this.BaoTingPai=function(desk,pai){//报听
		if( this.ting ) return null;
		this.tingpai=this.DelTing(desk,pai);
		if( this.tingpai.length<1 )	return null;
		return true;
	}
	this.BaoTingOk=function(desk){
		if( this.ting ) return false;
		this.BaoTingPai(desk,null);
		if( this.tingpai.length!=1 ){ 
			this.err("BaoTingOk:"+JSON.stringify(this.tingpai));
			this.tingpai=[];
			this.ting=false; 
			return false; 
		}
		return true;
	}
	this.FindVPai=function( t, v ){
		var sz=[];
		var pai;
		for( var i=0; i<this.vpai.length; i++ ){
			pai=this.vpai[i];
			if( pai==null ) continue;
			if( pai['type']==t && pai['value']==v )
				sz.push(pai);
		}
		return sz;
	}
	this.DelTing=function(desk,trypai){
		if(trypai!=null) this.tr("DelTing:"+trypai.id);
		var i;
		var tingpai=[];
		var vtype=this.InitType(null,trypai);
		//this.tr(JSON.stringify(vtype));
		
		var pai, t, v;
		var vdel=[],vting;
		if( this.GetPaiNum(trypai)<14 ){
			vting=this.isSubTing(desk,vtype);
			if( vting.length>0 ) tingpai.push({del:-1,ting:vting});
			return tingpai;
		}

		//扣除一张牌
		var ishave;
		for( i=0; i<this.vpai.length; i++ ){
			pai=this.vpai[i];
			if( pai==null ) continue;
			if( pai['flag']!=0 ) continue;

			//只有一张
			ishave=false;//已经有了
			t=pai['type']; v=pai['value'];
			if( vtype[t]['painum'][v]>1 ){
				for( var j=0; j<vdel.length; j++ ){
					if( vdel[j]['type']==t && vdel[j]['value']==v ){ 
						ishave=true; break;
					}
				}
				if( ishave ) continue;
				vdel.push(pai); 
			}

			vtype[t]['sum']--;
			vtype[t]['painum'][v]--;
			vtype[t]['painumex'][v]--;
			vting=this.isSubTing(desk,vtype);
			if( vting.length>0 ){ 
				tingpai.push({del:pai.id,ting:vting});
			}
			vtype[t]['sum']++;
			vtype[t]['painum'][v]++;
			vtype[t]['painumex'][v]++;
		}
		this.tr("DelTing:"+JSON.stringify(tingpai));
		return tingpai;
	}
	this.isSubTing=function(desk,vtype){
		var vting=[];
		var type;
		for( var t=0; t<5; t++ ){
			for( var v=0; v<10; v++ ){
				type=vtype[t];
				//去掉不靠的牌，注意十三幺，十三不靠
				if( t<2 ){
					if( type['painumex'][v]<1 ) continue;
				}else{
					if( v==0 ) continue;
					if( type['painumex'][v]<1 && type['painumex'][v-1]<1 ){
						if( v==9 ) continue;
						if( type['painumex'][v+1]<1 ) continue;
					}
				}
				//去掉4张的牌
				if( type['painumex'][v]==4 ) continue;
				
				type['sum']++;
				type['painumex'][v]++;
				type['painum'][v]++;
				//this.tr("isSubTing:"+JSON.stringify(type));
				if( this.isQiXiaoDui(null,vtype) ){
					vting.push({type:t,value:v});
				}else{
					if( this.isPingHu(0,null,vtype) ) vting.push({type:t,value:v});
				}
				type['sum']--;
				type['painumex'][v]--;
				type['painum'][v]--;
			}
		}
		return vting;
	}
	this.isTingPai=function(pai){
		if( pai==null ) return false;
		if( !this.ting ) return false;
		for( var i=0; i<this.tingpai[0].ting.length; i++ ){
			if( pai.type!=this.tingpai[0].ting[i].type ) continue;
			if( pai.value!=this.tingpai[0].ting[i].value ) continue;
			return true;
		}
		return false;
	}
	this.GetPaiNum=function(trypai){
		var gang=0;
		var pai;
		for( var i=0; i<this.showpai.length; i++ ){
			pai=this.showpai[i];
			if( pai==null ) continue;
			if( pai.length<1 ) continue;
			if( pai[0].flag==3 || pai[0].flag==4 || pai[0].flag==5 ) gang++;
		}
		if( trypai==null ) return this.vpai.length-gang;
		if(this.FindPai( trypai.id, null )<0) return this.vpai.length-gang+1;
		return this.vpai.length-gang;
	}
	this.GetAnGangNum=function(){
		var gang=0;
		for( var i=0; i<this.showpai.length; i++ ){
			pai=this.showpai[i];
			if( pai==null ) continue;
			if( pai.length<1 ) continue;
			if( pai[0].flag==4 ) gang++;
		}
		return gang;
	}
	this.AddVgangname=function( add ){//{name:"点杠","fan":0}
		if( add['name']=='' || add['name']=='undefinde' ) return;
		for( var i=0; i<this.vgangname.length; i++ ){
			if( this.vgangname[i]['name']==add['name'] ) return;
		}
		this.vgangname.push(add);
	}

	this.GetMiniVPai=function( vpai ){
		//return vpai;

		if( vpai==null ) return null;
		if( vpai.length<1 ) return [];

		var re=Array(vpai.length);
		for( var i=0; i<vpai.length; i++ )
			re[i]=this.GetMiniPai(vpai[i]);
		return re;
	}
	this.GetMiniPai=function( pai ){
		//return pai;

		if( pai==null ) return null;
		var mini={id:pai.id};
		if( pai['hu']==1 ) mini['hu']=1;
		if( pai['jiang']==1 ) mini['jiang']=1;
		if( pai['from'] ) mini['from']=pai['from'];
		if( pai['flag'] ) mini['flag']=pai['flag'];
		if( pai['ghua'] ) mini['ghua']=pai['ghua'];
		if( pai['gfan'] ) mini['gfan']=pai['gfan'];
		if( pai['show'] ) mini['show']=pai['show'];
		return mini;
	}
	this.GetMiniShowPai=function( sz ){
		if( sz==null ) return null;
		if( sz.length<1 ) return [];

		var re=Array(sz.length), j;
		for( var i=0; i<sz.length; i++ ){
			if( sz[i].length<1 ){ re[i]=[]; continue; }
			re[i]=Array(sz[i].length);
			for( j=0; j<sz[i].length; j++ ){
				re[i][j]=this.GetMiniPai(sz[i][j]);	
			}
		}
		return re;
	}
}

js_util.inherits(stPai, js_base);
