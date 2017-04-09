var js_util = require('util');
var js_base = require('./baseobj');
//console.log(js_base);

exports.m_vDesk=[];
exports.m_vGameUser=[];
exports.m_Hu;
exports.m_nMinNum=14;

function MjCtrl(){
	js_base.call(this);
	this.name="MjCtrl";

}

exports.findDesk=function(id){
	for( var i=0; i<exports.m_vDesk.length; i++ ){
		if( exports.m_vDesk[i]==null ){
				exports.m_vDesk.splice(i,1);
				i--;
				continue;
		}
		if(exports.m_vDesk[i].GetId()==id){
			return exports.m_vDesk[i];
		}
	}
	return null;
}
exports.findDeskNum=function(id){
	for( var i=0; i<exports.m_vDesk.length; i++ ){
		if( exports.m_vDesk[i]==null ){
				exports.m_vDesk.splice(i,1);
				i--;
				continue;
		}
		if(exports.m_vDesk[i].GetId()==id) return i;
	}
	return -1;
}
exports.isUseDesk=function(desk){
	if( desk==null ) return false;//数据错误
	var d=exports.findDesk(desk.GetId());
	if( d==null ){
		desk.tryDelDesk();//无效的桌子
		return false;
	}
	return (desk==d);
}

exports.NewDesk=function(deskid,key,ownerid,rule,num){
	var desk=exports.findDesk(deskid);
	if( desk!=null ) return desk;

	var js=require('./mjdesk-nanj');

	console.log(JSON.stringify(rule));
	desk=new js(deskid,key,ownerid,rule,num);

	exports.m_vDesk.push(desk);
	return desk;
}

exports.DelDesk=function(deskid){
	var id=exports.findDeskNum(deskid);
	if( id>=0 ){ exports.m_vDesk.splice(id,1); return true; }
	return false;
}

exports.FindUser=function (uid){
	var user;
	for( var i=0; i<exports.m_vGameUser.length; i++ ){
		if( exports.m_vGameUser[i]==null ) continue;
		if( exports.m_vGameUser[i].uid==uid ) return  exports.m_vGameUser[i];
	}
	return null;
}

exports.FindUserByNetkey=function (netkey){
	var user;
	for( var i=0; i<exports.m_vGameUser.length; i++ ){
		user=exports.m_vGameUser[i];
		if( user==null ) continue;
		if( user.netuser==null ) continue;
		if( user.netuser.m_nNetKey==netkey ) return user;
	};
	return null;
}

exports.UnRegGameUser=function(uid){
	for( var i=0; i<exports.m_vGameUser.length; i++ ){
		if( exports.m_vGameUser[i]==null ){
			exports.m_vGameUser.splice(i,1);
			i--;
			continue;
		}
		if( exports.m_vGameUser[i].uid!=uid ) continue;
		exports.m_vGameUser.splice(i,1);
	}
}

exports.GetDateStr=function (d){
	if( d==null ) return "";

	return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()+" "+
		d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();
}

exports.InitHuPai=function(){
	var js=require('./game/hupai');
	var hu=new js();
	exports.m_Hu=hu;
	console.log(js);

	hu.Add("平胡",1,hu.isPingHu);
	hu.Add("清一色",24,hu.isQingYiSe); 

	//var vpai=[];
	//hu.isHu(vpai);
/*
	js.Add("大四喜",88,js.DaSiXi()); 
	js.Add("大三元",88,""); 
	js.Add("绿一色",88,""); 
	js.Add("四杠",88,""); 
	js.Add("连七对",88,""); 
	js.Add("十三幺",88,""); 

	js.Add("清幺九",64,""); 
	js.Add("小四喜",64,""); 
	js.Add("小三元",64,""); 
	js.Add("四暗刻",64,""); 
	js.Add("一色双龙会",64,""); 

	js.Add("一色四同顺",48,""); 
	js.Add("一色四节高",48,""); 

	js.Add("一色四步高",32,""); 
	js.Add("三杠",32,""); 

	js.Add("七对",24,""); 
	js.Add("七星不靠",24,""); 
	js.Add("全双刻",24,""); 
	js.Add("一色三同顺",24,""); 
	js.Add("一色三节高",24,""); 
	js.Add("全大",24,""); 
	js.Add("全中",24,""); 
	js.Add("全小",24,""); 

	js.Add("青龙",16,""); 
	js.Add("三色双龙会",16,""); 
	js.Add("一色三步高",16,""); 

	js.Add("单调将",1,""); 
	js.Add("平胡",1,""); */

}

//  this.id=num*100+type*10+v //牌的唯一id num 是0-3
//	this.type=t;			//牌类型
//	this.value=v;			//牌字
//	this.flag=v;			//0 自摸 1 吃 2 碰 3 杠 
//  this.hu                 //1 胡牌 
//  this.jiang                 //1 jiang
//  this.ghua                 //1 杠花
//  this.from                  // 0自摸 从哪个uid里来
exports.InitDeskPai=function(){
	var vpai=[];
	var pai;
	var maxnum=0;
	var maxtype=6;
	var painum=4;
	var j;
	for( var i=0; i<maxtype; i++ ){
		switch(i){
		case 0: maxnum=3; j=0; break;
		case 1: maxnum=4; j=0; break;
		case 4: //break;
		case 3: 
		case 2: 
			maxnum=10; j=1; break;
		case 5: 
			maxnum=8; j=0; painum=1; break;
		}
		for( ; j<maxnum; j++ ){
			for( var num=0; num<painum; num++){
				pai={};
				pai['id']=num*100+i*10+j;
				pai['type']=i;
				pai['value']=j;
				pai['flag']=0;
				pai['hu']=0;
				pai['jiang']=0;
				pai['ghua']=0;
				pai['from']=0;
				vpai.push(pai);
			}
		}
	}
	return vpai;
}

exports.gm_pai=[null,null,null,null];

//exports.gm_pai[1]=[{type:2,value:3},{type:3,value:3},{type:3,value:3},{type:3,value:3},{type:2,value:4},{type:2,value:4},{type:2,value:4},{type:3,value:4},{type:3,value:4},{type:3,value:4},{type:3,value:5}];
//exports.gm_pai[0]=[{type:2,value:3},{type:3,value:3},{type:2,value:4},{type:3,value:4},{type:3,value:5}];
//exports.gm_pai[2]=[{type:2,value:3},{type:3,value:3},{type:2,value:4},{type:3,value:4},{type:3,value:5}];
//exports.gm_pai[3]=[{type:2,value:3},{type:3,value:3},{type:2,value:4},{type:3,value:4},{type:3,value:5}];

exports.SetPai=function(szpai){
	console.log("SetPai:"+JSON.stringify(szpai));
	exports.gm_pai[szpai.chair]=szpai.pai;
}
