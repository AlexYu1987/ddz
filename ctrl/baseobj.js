require('colors');
var js_log = require('../net/log');

module.exports = BaseObj;

function BaseObj(){
	this.name="BaseObj";
	this.err=function (err){
		console.log(("[error] "+this.name+":"+err).red);
		js_log.write("tr", "[error] "+this.name+"."+JSON.stringify(err));
	};
	this.tr=function (msg){
		//console.log((this.name+"."+msg).white);
		js_log.write("tr", this.name+"."+JSON.stringify(msg));
	};
	this.delThis=function(){
		delete this;
	}
	this.onCreate=function(){}
}