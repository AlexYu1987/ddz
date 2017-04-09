// 加载File System读写模块  
var g_fs = require('fs');  
// 加载编码转换模块  
var g_iconv = require('iconv-lite');
var g_color = require('colors');
var g_config = require('./config/db_config');

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

exports.write = function(netkey, str){  
	var file = "./log/";
	if(g_config.logpath) file = g_config.logpath;
	try{
		if (!g_fs.existsSync(file)) 
			g_fs.mkdirSync(file);
	}catch(e){
		console.log("log 路径创建失败!".red);
		return;
	}
	file += new Date().Format("yyyy_MM_dd/");
	if (!g_fs.existsSync(file)) 
		g_fs.mkdirSync(file);
	file += "key_"+netkey+".txt";
	//化简文本
	str = str.replace(/\"/g, "");
	str = str.replace(/,flag:0/g, "");
	str = str.replace(/,hu:0/g, "");
	str = str.replace(/,jiang:0/g, "");
	str = str.replace(/,ghua:0/g, "");
	str = str.replace(/,from:0/g, "");

    var arr = g_iconv.encode(new Date().Format("hh:mm:ss ")+str+"\r\n", 'gbk');  
    g_fs.appendFile(file, arr, function(err){  
        if(err)  console.log("fail " + err);  
    });  
}