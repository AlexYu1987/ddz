var g_mysql = require('mysql');
var g_color = require('colors');
var g_config = require('./../config/db_config');
var g_shortlink = false;		//采用短连接
var g_db = null;
var g_init = 1;
function connectDB()
{
	if(g_db){
		g_db.end();
		delete g_db;
	}
	try{
		g_db = g_mysql.createConnection(g_config);
		g_db.connect(function(err) {
			if(err) {
			  console.log('DB error when create : '.red, err);
			  console.log('data base relink after 3 sec ...  '.magenta);
			  setTimeout(connectDB, 3000);
			  return;
			}
			if(g_init){
				//清除上一次历史在线数据
				g_init = 0;
				g_db.query("update b_userinfo set isol=0", function(err, info){
					if(err) console.log('clear histroy online error!'.red); 
					console.log('Database connected ok ..'); 
				});
			}else console.log('Database connected ok .'); 
		});
		g_db.on("error",function(err){
			console.log('DB error : '.red, err); 
			if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
				connectDB();
			}
			if(err.code === 'ECONNRESET') { 
				connectDB();
			}
		});
	}catch(e){
		console.log("DB error 100 : createConnection err !".red);
	}
	return g_db;
}

exports.query = function(sql, obj, funok, funerr){
	if(!g_db || g_shortlink){
		if(!connectDB()){
			if(typeof funerr == "function" &&
				typeof obj == "object")
				funerr.call(obj, "link db error !");
			return;
		}
	}
	g_db.query(sql, function(err, info){
		if(err){ 
			if(typeof funerr == "function" &&
				typeof obj == "object")
				try{
					funerr.call(obj, err);
				}catch(e){
					console.log("DB error 103 : funerr call err !".red);	
				}
		}else{
			if(typeof funok == "function" &&
				typeof obj == "object")
			try{
				funok.call(obj, info);
			}catch(e){
				console.log("DB error 104 : funok call err ! ".red);
				console.log(e);
			}
		}
	});
}
//不要尝试调用这个接口 !
exports.end = function(){
	g_db.end();
}

function checkLink()
{
	if(g_db){
		g_db.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '"+g_config.database+"'", function(err, info){
			try{
				if(err) {
					console.log("DB error 201 : ".red);	
					console.log(err);
				}else{
					//console.log("dadabase table:"+JSON.stringify(info));
				}
			}catch(e){
				console.log(e);
			}
		});
	}
	setTimeout( checkLink , 14400000);
}

if(!g_shortlink){
	connectDB();
	setTimeout( checkLink , 14400000);
}