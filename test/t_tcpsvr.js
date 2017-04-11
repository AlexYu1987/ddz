/*
* 测试用 TCP socket 连接, 主要测试主要逻辑，剥离持久化层
*/
var g_color = require('colors');
var g_net = require('net');
//onCreateUser 接口所在域
var g_config = require('./t_config');

var g_shownet = g_config.shownet;

var server=net.createServer(function(socket){
	var m_bvaild = true;	//有效性
	var m_nNetKey = Math.floor( Math.random()*10000 + 1);
	var m_user = null;		//netUser

	var m_vbuffer = [];
	var m_sbuff = '';
	//消息编码规范
	socket.setEncoding('utf8');

	socket.on('data',function(data){
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

	socket.on('error',function(err){
		console.log('Socket error!')
	});

	socket.on('close',function(){
		console.log('Socket closed!');
	});

	function createUser()
	{
		m_user = new g_user.onCreateUser( socket , m_nNetKey );
		if(!m_user){
			m_bvaild = false;
			
			console.log("create netuser error !".red);
			socket.toc("onLoginError", {msg:"错误的登陆信息"});
			delete socket;
			return;
		}else{
			m_user.on("del", function(){
				if(socket){ //conn 是 netUser 构造函数中的 conn, 而非 createServer 中的 conn
					if(socket.isvaild()){
						socket.unvaild();
					}
					delete socket;
				}
				delete this; //netUser
			});
		}
	}
});

server.listen(g_config.tcport, g_config.tcphost, function(){
	console.log('tcp listening on :'+g_config.tcport);
});

server.on("error", function(d){
	console.log(d);
});