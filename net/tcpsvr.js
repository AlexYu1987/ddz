/*
* 接受处理 TCP socket 连接, 并创建 netUser 对象, 监听 netUser del 事件
*/
var g_color = require('colors');
var g_app = require('express')();
var g_net = require('net');
var g_user = require('../ctrl/suser');		//onCreateUser 接口所在域
var g_log = require('./log');
var g_config = require('./config/db_config');

var g_count = 0;						//连接数量
var g_shownet = g_config.shownet;		//显示网络消息
var g_writenet = g_config.writenet;		//保存网络消息到外部文件
var g_test = false;						//人数为零时退出进程

//提供客户端JS下载 http://HOST/socket.io/socket.io.js
g_app.get('/', function(req, res){
	res.send('<h1>Welcome Realtime Server</h1>');
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

var server = g_net.createServer(function (socket){
	g_count += 1;
	var m_bvaild = true;	//有效性
	var m_nNetKey = Math.floor( Math.random()*10000 + 1);
	var m_user = null;		//netUser

	var m_vbuffer = [];
	var m_sbuff = '';
	//消息编码规范
	socket.setEncoding('utf8');
	//接收消息
	socket.on('data', function(data){
		if( !m_bvaild ) return;
		m_sbuff += data;
		var len = m_sbuff.lastIndexOf("\0");
		//如果是一条或多条完整的消息
		if(len > 0){
			var str = m_sbuff.substr(0, len);
			//将不完整的部分继续存放在缓冲变量中
			m_sbuff = m_sbuff.substr(len + 1, m_sbuff.lenght);
			//按规定的分隔符分割命令行
			var cmd = str.split('\0');
			var json = {};
			for(var i=0;i<cmd.length;i+=1){
				if(g_shownet) console.log(("<<"+cmd[i].substr(0,128)).yellow);
				if(g_writenet) g_log.write(m_nNetKey, "<<"+cmd[i]);
				try{
					json = JSON.parse(cmd[i]);
				}catch(e){
					console.log( ("receive not json : " + cmd[i]).red );
					return;
				}
				//登陆消息优先处理
				if(json["fun"]){
					if(!m_user) createUser();
					if(m_user){
						m_user.receive(json);
					}
				}
			}
		}
	});
	//接受到关闭消息, error 处理后一般都会调用 close
	//两个事件中都有处理 onbreak, 以防万一
	socket.on('close', function(){
		if(m_bvaild){
			m_bvaild = false;
			g_count --; //m_bvaild 等于 false 的同时 g_count 减 1
			if(m_user) m_user.onbreak();
		}
		//特殊调试: 退出进程, cmd 下调试用
		if(g_count == 0 && g_test) process.exit(1);
	});
	//连接抛出异常, 一般异常以后会调用close事件
	socket.on('error', function(err){
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
		socket.write(JSON.stringify({"fun":fun,"agv":agv}) + "\0");
	};
	function createUser()
	{
		m_user = new g_user.onCreateUser( socket , m_nNetKey );
		if(!m_user){
			m_bvaild = false;
			g_count --; //m_bvaild 等于 false 的同时 g_count 减 1
			console.log("create netuser error !".red);
			socket.toc("onLoginError", {msg:"错误的登陆信息"});
			delete socket;
			return;
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
		}
	}
	//发起第一次通信尝试
	socket.toc("setNetKey",{netkey:m_nNetKey,ver:g_config.openreg}); //ver: net/config/db_config.json 配置
});

server.listen(g_config.tcport, g_config.tcphost, function(){
	console.log('tcp listening on :'+g_config.tcport);
});

server.on("error", function(d){
	console.log(d);
});