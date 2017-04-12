# Host: localhost  (Version: 5.5.40)
# Date: 2017-03-28 17:14:04
# Generator: MySQL-Front 5.3  (Build 4.120)

/*!40101 SET NAMES utf8 */;


#
# Structure for table "b_onlinenum"
#

CREATE TABLE IF NOT EXISTS `b_onlinenum` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `num` int(11) NOT NULL DEFAULT '0' COMMENT '在线人数',
  `nodedate` date NOT NULL DEFAULT '1970-01-01',
  `nodetime` time NOT NULL DEFAULT '00:00:00',
  PRIMARY KEY (`id`),
  KEY `nodedate` (`nodedate`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='在线数据';

#
# Data for table "b_onlinenum"
#

#
# Structure for table "b_sysuser"
#

CREATE TABLE IF NOT EXISTS `b_sysuser` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `accname` varchar(16) NOT NULL COMMENT '登录账号',
  `password` varchar(64) NOT NULL COMMENT '登录密码',
  `groupname` varchar(32) NOT NULL DEFAULT '' COMMENT '分组',
  `power` bigint(32) NOT NULL DEFAULT '0' COMMENT '权限',
  `name` varchar(8) NOT NULL DEFAULT '' COMMENT '操作人姓名',
  `tel` varchar(16) NOT NULL DEFAULT '' COMMENT '操作人电话',
  `money` int(11) NOT NULL DEFAULT '0' COMMENT '余卡数量',
  `logindate` datetime NOT NULL DEFAULT '1970-01-01 00:00:00' COMMENT '最近登录时间',
  `wechatgroup` varchar(32) NOT NULL DEFAULT '无' COMMENT '微信群名',
  `wechatname` varchar(32) NOT NULL DEFAULT '无' COMMENT '微信账号',
  `buycard` int(11) NOT NULL DEFAULT '0' COMMENT '购卡数量',
  `paycard` int(11) NOT NULL DEFAULT '0' COMMENT '充卡数量',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '单价',
  `buystart` int(11) NOT NULL DEFAULT '0' COMMENT '购卡起点',
  `ice` int(11) NOT NULL DEFAULT '0' COMMENT '账号状态',
  `loginip` varchar(64) NOT NULL DEFAULT '0.0.0.0' COMMENT '登陆IP',
  PRIMARY KEY (`id`),
  UNIQUE KEY `accname` (`accname`),
  KEY `groupname` (`groupname`),
  KEY `name` (`name`),
  KEY `password` (`password`),
  KEY `leader` (`wechatgroup`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COMMENT='后台用户';

#
# Data for table "b_sysuser"
#

#INSERT INTO `b_sysuser` VALUES (1,'admin','ae5515e371a599b8d82b244212209283','管理员',4294967295,'鸿悦互动','010-53779771',0,'2017-03-27 11:35:16','','',140,0,0.50,0,1,'');

#
# Structure for table "b_userinfo"
#

CREATE TABLE IF NOT EXISTS `b_userinfo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openid` varchar(32) NOT NULL DEFAULT '' COMMENT '用户账号',
  `password` varchar(32) NOT NULL DEFAULT '' COMMENT '密码',
  `regdate` date DEFAULT '1970-01-01' COMMENT '注册时间',
  `logindate` datetime NOT NULL DEFAULT '1970-01-01 00:00:00' COMMENT '登录时间',
  `logincount` int(11) NOT NULL DEFAULT '1',
  `name` varchar(16) NOT NULL DEFAULT '' COMMENT '姓名',
  `tel` varchar(16) NOT NULL DEFAULT '' COMMENT '联系方式',
  `address` varchar(256) NOT NULL DEFAULT '' COMMENT '住址',
  `nickname` varchar(128) NOT NULL DEFAULT '' COMMENT '游戏昵称',
  `sex` int(11) NOT NULL DEFAULT '0' COMMENT '性别',
  `headurl` varchar(256) NOT NULL DEFAULT '' COMMENT '头像',
  `isvip` int(11) NOT NULL DEFAULT '0' COMMENT '账户级别',
  `failnum` int(11) NOT NULL DEFAULT '0',
  `email` varchar(128) NOT NULL DEFAULT '',
  `score` int(11) NOT NULL DEFAULT '0',
  `tiecount` int(11) NOT NULL DEFAULT '0',
  `failcount` int(11) NOT NULL DEFAULT '0',
  `wincount` int(11) NOT NULL DEFAULT '0',
  `money` int(11) NOT NULL DEFAULT '0',
  `card` int(11) NOT NULL DEFAULT '0' COMMENT '拥有房卡',
  `signcount` int(11) NOT NULL DEFAULT '0',
  `signdate` datetime NOT NULL DEFAULT '2010-01-01 00:00:00',
  `info` text NOT NULL,
  `leader` varchar(16) NOT NULL DEFAULT '',
  `black` int(11) NOT NULL DEFAULT '0',
  `isol` int(11) NOT NULL DEFAULT '0' COMMENT '是否在线',
  `loginip` varchar(128) NOT NULL DEFAULT '0.0.0.0' COMMENT '登陆IP',
  PRIMARY KEY (`id`),
  UNIQUE KEY `openid` (`openid`),
  KEY `password` (`password`),
  KEY `tel` (`tel`),
  KEY `nickname` (`nickname`),
  KEY `score` (`score`),
  KEY `signdate` (`signdate`),
  KEY `leader` (`leader`),
  KEY `regdate` (`regdate`),
  KEY `loginip` (`loginip`),
  KEY `isol` (`isol`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COMMENT='用户信息表';

#
# Data for table "b_userinfo"
#

#INSERT INTO `b_userinfo` VALUES (1,'ios123','ios123','0000-00-00','0000-00-00 00:00:00',1,'测试','','','游客',0,'',0,0,'',0,0,0,0,9999,9999,0,'2010-01-01 00:00:00','','',0,0,'0.0.0.0'),(2,'ios1234','ios1234','0000-00-00','0000-00-00 00:00:00',1,'测试','','','游客',0,'',0,0,'',0,0,0,0,9999,9999,0,'2010-01-01 00:00:00','','',0,0,'0.0.0.0');

#
# Structure for table "log"
#

CREATE TABLE IF NOT EXISTS `log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openid` varchar(32) NOT NULL,
  `dodate` datetime NOT NULL,
  `info` varchar(512) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `openid` (`openid`),
  KEY `dodate` (`dodate`),
  KEY `info` (`info`(333))
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='管理登陆记录';

#
# Data for table "log"
#


#
# Structure for table "log_card"
#

CREATE TABLE IF NOT EXISTS `log_card` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL DEFAULT '0',
  `dodate` date NOT NULL DEFAULT '1970-01-01',
  `dotime` time NOT NULL DEFAULT '00:00:00',
  `num` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `dodate` (`dodate`),
  KEY `info` (`num`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC COMMENT='用户用卡记录';

#
# Data for table "log_card"
#


#
# Structure for table "log_login"
#

CREATE TABLE IF NOT EXISTS `log_login` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openid` varchar(32) NOT NULL,
  `dodate` datetime NOT NULL,
  `info` varchar(512) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `openid` (`openid`),
  KEY `dodate` (`dodate`),
  KEY `info` (`info`(333))
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='用户登陆记录';

#
# Data for table "log_login"
#


#
# Structure for table "log_reg"
#

CREATE TABLE IF NOT EXISTS `log_reg` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openid` varchar(32) NOT NULL,
  `dodate` datetime NOT NULL,
  `info` varchar(512) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `openid` (`openid`),
  KEY `dodate` (`dodate`),
  KEY `info` (`info`(333))
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='用户注册记录';

#
# Data for table "log_reg"
#


#
# Structure for table "log_sys"
#

CREATE TABLE IF NOT EXISTS `log_sys` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `acc` varchar(32) NOT NULL,
  `dodate` datetime NOT NULL,
  `info` varchar(512) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `acc` (`acc`),
  KEY `dodate` (`dodate`),
  KEY `info` (`info`(333))
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='管理操作记录';

#
# Data for table "log_sys"
#


#
# Structure for table "mj_desk"
#

CREATE TABLE IF NOT EXISTS `mj_desk` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(32) NOT NULL DEFAULT '' COMMENT '唯一ID',
  `deskid` int(11) NOT NULL DEFAULT '0' COMMENT '桌号',
  `creator` varchar(32) NOT NULL COMMENT '创建者openid',
  `createid` int(11) NOT NULL DEFAULT '0' COMMENT 'UID',
  `creatime` datetime NOT NULL DEFAULT '1970-01-01 00:00:00' COMMENT '创建时间',
  `num` int(11) NOT NULL DEFAULT '0' COMMENT '局数',
  `state` int(11) NOT NULL DEFAULT '0',
  `overtime` datetime NOT NULL DEFAULT '1970-01-01 00:00:00' COMMENT '结束时间',
  `rule` varchar(512) NOT NULL DEFAULT '' COMMENT '采用游戏规则',
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `creator` (`creator`),
  KEY `state` (`state`),
  KEY `createid` (`createid`),
  KEY `deskid` (`deskid`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='房间创建信息';

#
# Data for table "mj_desk"
#


#
# Structure for table "mj_gg"
#

CREATE TABLE IF NOT EXISTS `mj_gg` (
  `id` int(11) NOT NULL,
  `info` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Data for table "mj_gg"
#


#
# Structure for table "mj_node"
#

CREATE TABLE IF NOT EXISTS `mj_node` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `info` varchar(128) NOT NULL,
  `showtime` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Data for table "mj_node"
#


#
# Structure for table "mj_repaly"
#

CREATE TABLE IF NOT EXISTS `mj_repaly` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `replayid` varchar(32) NOT NULL COMMENT '回放信息ID',
  `playerdata` text NOT NULL COMMENT '玩家数据',
  `gamedata` text NOT NULL COMMENT '回放数据',
  `resultdata` text NOT NULL COMMENT '结果数据',
  PRIMARY KEY (`id`),
  KEY `replayid` (`replayid`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='回看数据';

#
# Data for table "mj_repaly"
#


#
# Structure for table "mj_report"
#

CREATE TABLE IF NOT EXISTS `mj_report` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` int(11) NOT NULL,
  `nick` varchar(32) NOT NULL,
  `redate` datetime NOT NULL,
  `info` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Data for table "mj_report"
#


#
# Structure for table "pay_bill"
#

CREATE TABLE IF NOT EXISTS `pay_bill` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trade_no` varchar(32) NOT NULL,
  `tx_trade_no` varchar(32) NOT NULL,
  `is_paid` int(11) NOT NULL DEFAULT '0',
  `total_fee` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '金额',
  `buy_openid` varchar(32) NOT NULL,
  `buy_id` int(11) NOT NULL DEFAULT '0',
  `buy_time` datetime NOT NULL,
  `pay_openid` varchar(32) NOT NULL,
  `pay_bank` varchar(16) NOT NULL,
  `pay_time` date NOT NULL DEFAULT '1970-01-01',
  `showinfo` varchar(512) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trade_no` (`trade_no`),
  KEY `tx_trade_no` (`tx_trade_no`),
  KEY `is_paid` (`is_paid`),
  KEY `buy_openid` (`buy_openid`),
  KEY `buy_id` (`buy_id`),
  KEY `pay_time` (`pay_time`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='充卡账单';

#
# Data for table "pay_bill"
#


#
# Structure for table "pay_errlog"
#

CREATE TABLE IF NOT EXISTS `pay_errlog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openid` varchar(32) NOT NULL,
  `dodate` datetime NOT NULL,
  `msg` varchar(128) NOT NULL,
  `info` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `openid` (`openid`),
  KEY `msg` (`msg`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Data for table "pay_errlog"
#


#
# Structure for table "stat_desk"
#

CREATE TABLE IF NOT EXISTS `stat_desk` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `deskid` int(11) NOT NULL DEFAULT '0' COMMENT '桌号',
  `startime` datetime NOT NULL DEFAULT '1970-01-01 00:00:00' COMMENT '开始时间',
  `endtime` datetime NOT NULL DEFAULT '1970-01-01 00:00:00' COMMENT '结束时间',
  `joinuser` varchar(64) NOT NULL COMMENT '参与玩家UID',
  `userdata` text NOT NULL COMMENT '结果数据',
  PRIMARY KEY (`id`),
  KEY `deskid` (`deskid`,`joinuser`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='房间回看信息';

#
# Data for table "stat_desk"
#


#
# Structure for table "stat_resolve"
#

CREATE TABLE IF NOT EXISTS `stat_resolve` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openid` varchar(32) NOT NULL,
  `tel` varchar(16) NOT NULL DEFAULT '',
  `nick` varchar(32) NOT NULL DEFAULT '',
  `lv` int(11) NOT NULL,
  `num` int(11) NOT NULL,
  `leaderopenid` varchar(32) NOT NULL,
  `leadertel` varchar(16) NOT NULL DEFAULT '',
  `leadernick` varchar(32) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `openid` (`openid`),
  KEY `leaderopenid` (`leaderopenid`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

#
# Data for table "stat_resolve"
#


#
# Structure for table "stat_round"
#

CREATE TABLE IF NOT EXISTS `stat_round` (
  `deskid` int(11) NOT NULL COMMENT '本局归属桌号',
  `round` int(11) NOT NULL COMMENT '本局所属轮数',
  `startime` datetime NOT NULL DEFAULT '1970-01-01 00:00:00',
  `endtime` datetime NOT NULL DEFAULT '1970-01-01 00:00:00',
  `chair1` text NOT NULL COMMENT '玩家数据',
  `chair2` text NOT NULL COMMENT '玩家数据',
  `chair3` text NOT NULL COMMENT '玩家数据',
  `chair4` text NOT NULL COMMENT '玩家数据',
  `replayid` varchar(32) NOT NULL COMMENT '回放信息ID',
  KEY `deskid` (`deskid`),
  KEY `round` (`round`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='单局回看信息';

#
# Data for table "stat_round"
#
