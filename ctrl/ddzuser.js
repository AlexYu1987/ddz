var js_util = require('util');
var js_base = require('./baseobj');
var js_mj = require('./mjctrl');
var js_pai = require('./game/pai');
var js_sql = require('../net/db/db');

module.exports=DdzUser

function DdzUser(suser,uid,ip){
	js_base.call(this);
}

js_util.inherits(DdzUser,js_base);