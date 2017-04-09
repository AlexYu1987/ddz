/*
* 接受处理 TCP socket 连接, 并创建 netUser 对象, 监听 netUser del 事件
*/
var g_color = require('colors');
var g_app = require('express')();
var g_http = require('http').Server(g_app);
var g_io = require('socket.io')(g_http);
var g_user = require('../ctrl/suser');		//onCreateUser 接口所在域
var g_log = require('./log');
var g_config = require('./config/db_config');

var g_count = 0;						//连接数量
var g_shownet = g_config.shownet;		//显示网络消息
var g_writenet = g_config.writenet;		//保存网络消息到外部文件
var g_test = false;						//人数为零时退出进程

g_app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});
//提供客户端JS下载 http://HOST/socket.io/socket.io.js
g_app.get('/', function(req, res){
	res.send('<h1>Welcome Realtime Server</h1>');
});

g_app.get('/setpai', function(req, res){
	var re = "";
	var ctrl = require('../ctrl/mjctrl');
	if(!ctrl){
		re += '对象异常';
		res.send(re);
		return;
	}
	try{
		var msg = ctrl.SetPai(req.query);
		if(!msg) msg = "return empty";
		re += msg;
		res.send(re);
		return;
	}catch(e){
		re += '接口缺失';
		res.send(re);
		return;
	}
});

g_app.get('/info', function(req, res){
	var re = "";
	var i = 0, j = 0;
	var desk = require('../ctrl/mjctrl').m_vDesk;
	var user = require('../ctrl/mjctrl').m_vGameUser;
	var u = require('./user/netUser');
	try{
		re += '<h1>桌子数量:'+desk.length+'</h1>';
		re += "<div style='position:relative; left:25px'>";
		for(i=0;i<desk.length;i++){
			if(!desk[i])
				re += '<h2>无效的桌子 : '+i+'</h2>';
			else{
				re += '<h2>桌号 : '+desk[i].deskid+'';
				re += '    状态 : '+desk[i].m_nState+'</h2>';
				re += '<h2>入座人员 : </h2>';
				re += "<div style='position:relative; left:25px'>";
				if(typeof desk[i].m_vUser != "object")
					re += '<h2>'+'m_vUser not object. i='+i+'</h2>';
				else{
					for(j=0;j<desk[i].m_vUser.length;j++){
						if(desk[i].m_vUser[j]){
							re += '<h2>';
							re += desk[i].m_vUser[j].name+"("+desk[i].m_vUser[j].uuid+"){";
							re += 'uid:'+desk[i].m_vUser[j].uid;
							re += ',nick:'+desk[i].m_vUser[j].m_sNick;
							re += ',chair:'+desk[i].m_vUser[j].chairid;
							re += ',start:'+desk[i].m_vUser[j].start;
							if(desk[i].m_vUser[j].netuser){
								re += ',netuser:{uuid:'+desk[i].m_vUser[j].netuser.uuid;
								re += ',netkey:'+desk[i].m_vUser[j].netuser.m_nNetKey;
								re += ',vaild:'+desk[i].m_vUser[j].netuser.vaild;
								re += ',socket:'+(desk[i].m_vUser[j].netuser.m_Con?(desk[i].m_vUser[j].netuser.m_Con.isvaild()):'NaN');
								re += '}';
							}else
								re += ',netuser:null';
							re += '}</h2>';
						}
					}
				}
				re += "</div>";
			}
		}
		re += "</div>";
		
		re += '<h1>在线人数:'+user.length+'</h1>';
		re += "<div style='position:relative; left:25px'>";
		for(i=0;i<user.length;i++){
			if(!user[i])
				re += '<h2>无效的用户 : '+i+'</h2>';
			else{
				re += '<h2>';
				re += user[i].name+"("+user[i].uuid+"){";
				re += 'uid:'+user[i].uid;
				re += ',nick:'+user[i].m_sNick;
				re += ',desk:'+(user[i].deskctrl?user[i].deskctrl.deskid:"NaN");
				if(user[i].netuser){
					re += ',netuser:{uuid:'+user[i].netuser.uuid;
					re += ',netkey:'+user[i].netuser.m_nNetKey+'}';
				}else
					re += ',netuser:null';
				re += '}</h2>';
			}
		}
		re += "</div>";
		re += '<h1>连接通道:'+g_count;
		
		u = new u(null, 0 , "");
		var net = u.getList();
		delete u;
		re += '   连接对象:'+net.length+'</h1>';
		re += "<div style='position:relative; left:25px'>";
		for(i=0;i<net.length;i++){	
			if( !net[i] )
				re += '<h2>无效的连接 : '+i+'</h2>';
			else{
				re += '<h2>';
				re += net[i].name+"("+net[i].uuid+"){";
				re += 'netkey:'+net[i].m_nNetKey;
				re += ',vaild:'+net[i].vaild;
				re += ',socket:'+(net[i].m_Con?(net[i].m_Con.isvaild()):'NaN');
				if(net[i].m_user){
					re += ','+net[i].m_user.name+':{';
					re += 'uuid:'+net[i].m_user.uuid;
					re += ',uid:'+net[i].m_user.uid;
					re += '}';
				}else{
					re += 'mjuser:NaN';
				}
				re += "}</h2>";
			}
		}
		re += "</div>";
	}catch(e){
		res.send(e);
		return;
	}
	res.send(re);
});

g_io.on('connection', function(socket){
	g_count += 1;
	var m_bvaild = true;	//有效性
	var m_nNetKey = Math.floor( Math.random()*10000 + 1);
	var m_user = null;		//netUser
	//接收正常消息消息
	socket.on('message', function(obj){
		if( !m_bvaild ) return;
		if( typeof obj != "object" ) return;
		if(m_user){
			if(g_shownet) console.log(("<<"+JSON.stringify(obj).substr(0,128)).yellow);
			if(g_writenet) g_log.write(m_nNetKey, "<<"+JSON.stringify(obj));
			m_user.receive(obj);
		}
	});
	//断链回调
	socket.on('disconnect', function(){
		if(m_bvaild){
			m_bvaild = false;
			g_count --; //m_bvaild 等于 false 的同时 g_count 减 1
			if(m_user) m_user.onbreak();
		}
		//特殊调试: 退出进程, cmd 下调试用
		if(g_count == 0 && g_test) process.exit(1);
	});
	//检查连接有效性
	socket.isvaild = function(){ return m_bvaild };
	socket.unvaild = function(){ m_bvaild = false; };
	//向客户端发送消息
	socket.toc = function(fun, agv){
		if(!m_bvaild) return;
		if( typeof fun != "string" ) return;
		if( typeof agv != "object" ) return;
		if(g_shownet) console.log((">>"+fun+":"+JSON.stringify(agv).substr(0,128)).green);
		if(g_writenet) g_log.write(m_nNetKey, ">>"+fun+":"+JSON.stringify(agv));
		socket.emit(fun, agv);
	};
	//接受第一次通信回馈: 登陆
	socket.on('login', function(obj){
		if(!m_bvaild) return;
		if( typeof obj != "object" ){ socket.toc("onLoginError", {msg:"错误的登陆信息"}); return;}
		if( typeof obj.netkey != "number" ){ socket.toc("onLoginError", {msg:"错误的登陆信息"}); return;}
		if( typeof obj.openid != "string" ){ socket.toc("onLoginError", {msg:"错误的登陆信息"}); return;}
		if( obj.netkey != m_nNetKey ){ socket.toc("onLoginError", {"msg":"错误的登陆信息"}); return;}
		if(g_shownet) console.log(("<<{fun:login,agv:"+JSON.stringify(obj)+"}").yellow);
		if(g_writenet) g_log.write(m_nNetKey, "<<{fun:login,agv:"+JSON.stringify(obj)+"}");
		m_user = new g_user.onCreateUser( socket , m_nNetKey );
		if(!m_user){
			m_bvaild = false;
			g_count --; //m_bvaild 等于 false 的同时 g_count 减 1
			console.log("create netuser error !".red);
			socket.toc("onLoginError", {msg:"错误的身份信息"});
			delete socket;
		}else{
			m_user.on("del", function(){
				if(socket){ //conn 是 netUser 构造函数中的 conn, 而非 createServer 中的 conn
					if(socket.isvaild()){
						socket.unvaild();
						g_count --; //m_bvaild 等于 false 的同时 g_count 减 1
					}
					delete socket;
				}
				delete this; //netUser
				//特殊调试: 退出进程, cmd 下调试用
				if(g_count == 0 && g_test) process.exit(1);
			});
			m_user.onlogin(obj.openid);
		}
	});
	//发起第一次通信尝试
	socket.toc("setNetKey",{netkey:m_nNetKey});
});

g_http.listen(g_config.webport, function(){
	console.log('web listening on :'+g_config.webport);
});



