/**
 *所有出牌洗牌的算法模块
 *无状态的模块。
 */
var js_util = require('util');

module.exports.shuffle = shuffle;
module.exports.sortble = sortble;
module.exports.comare = compare;
module.exports.print = printCard;

var g_nShuffleTimes = 54;

function shuffle() {
	var vCard = [];
	var cardNum = 0
	while (cardNum < 54) {
		vCard.push(cardNum);
		cardNum++;
	}

	var shuffleCnt = 0;
	var tmpCard = 0;
	var left = 0;
	var right = 0;
	while (shuffleCnt < g_nShuffleTimes) {
		left = Math.floor(Math.random() * vCard.length);
		right = Math.floor(Math.random() * vCard.length);
		tmpCard = vCard[left];
		vCard[left] = vCard[right];
		vCard[right] = tmpCard;
		shuffleCnt++;
	}

	return vCard;
}

function sortble(a, b) {
	if (a < 52) a %= 13;
	if (b < 52) b %= 13;
	if (a == 0 || a == 1) a += 13;
	if (b == 0 || b == 1) b += 13;

	return b - a;
}

/*
 *vCard1所出牌，vCard2当前桌面走牌
 *return 1(Ok) -1(小) 0(不符合规则)
 */
function compare(vCard1, vCard2) {
	switch (vCard1.length) {
		case 6:
			//1、顺子 2、飞机 3、四带二 4、三连对
			if (isShunZi(vCard1) && isShunZi(vCard2) && vCard2.length == 6) {
				return compareShunZi(vCard1, vCard2);
			} else if (isFeiJi(vCard1) && isFeiJi(vCard2)) {
				return compareFeiJi(vCard1, vCard2);
			} else if (is4P2(vCard1) && is4P2(vCard2)) {
				return compare4P2(vCard1, vCard2);
			} else if (isLianDui(vCard1) && isLianDui(vCard2) && vCard2.length == 6) {
				return compareLianDui(vCard1, vCard2);
			} else {
				return 0;
			}
		case 5:
			//1、顺子 2、三带二
			if (isShunZi(vCard1) && isShunZi(vCard2) && vCard2.length == 5) {
				return compareShunZi(vCard1, vCard2);
			} else if (is3P2(vCard1) && is3P2(vCard2)) {
				return compare3P2(vCard1, vCard2);
			} else {
				return 0;
			}
		case 4:
			//1、炸弹 2、三带一
			if (isBoomb(vCard1)) {
				if (!isBoomb(vCard2)) return 1;
				else return compareBoomb(vCard1, vCard2);
			} else if (is3P1(vCard1) && is3P2(vCard2)) {
				return compare3P1(vCard1, vCard2);
			} else {
				return 0;
			}
		case 3:
			//1、三不带
			if (is3P0(vCard1) && is3P0(vCard2)) {
				return compare3P0(vcard1, vCard2);
			} else {
				return 0;
			}
		case 2:
			//1、对子 2、天王炸
			if (isDouble(vCard1) && isDouble(vCard2)) {
				return compareDouble(vCard1, vCard2);
			} else if (isTianWang(vCard1)) {
				return 1;
			} else {
				return 0;
			}
		case 1:
			if (vCard1.length == 1 && vCard2.length == 1) {
				return compareSingle(vCard1, vCard2);
			} else {
				return 0;
			}
		default:
			//六张牌以上 1、顺子 2、连对
			if (vCard1.length == vCard2.length) {
				if (isShunZi(vCard1) && isShunZi(vCard2)) {
					return compareShunZi(vCard1, vCard2);
				} else if (isLianDui(vCard1) && isLianDui(vCard2)) {
					return compareLianDui(vCard1, vCard2);
				} else {
					return 0;
				}
			} else {
				return 0;
			}
	}
}

function printCard(card) {
	if (card == 52) return '小王';
	if (card == 53) return '大王';

	var color = null;
	var num = null;
	if (card >= 0 && card < 13) color = '红桃';
	if (card >= 13 && card < 26) color = '方片';
	if (card >= 26 && card < 39) color = '草花';
	if (card >= 39 && card < 52) color = '黑桃';

	num = card % 13 + 1;
	if (num == 1) num = 'A';
	else if (num == 11) num = 'J';
	else if (num == 12) num = 'Q';
	else if (num == 13) num = 'K';

	return color + num;
}

function getFen(c) {
	if (card < 52)
}

function isShunZi(vCard) {
	if (vCard.length < 5) return false;

	vCard.sort(sortble);
	var vCardTmp = [];
	var jokeFlag = false
	//将牌号处理成分值，过滤掉大小王（不能作为顺子），并处理A作为13
	vCard.forEach(function(c) {
		if (c >= 52){
			jokeFlag = true;
			return;
		} else {
			c %= 13;
			if (c == 0) c = 13;
		}
		vCardTmp.push(c);
	});

	if (jokeFlag) return false;

	var tmp = vCardTmp[0];
	for (int i = 1; i < vCardTmp.length; i++) {
		if (vCardTmp[i] != (tmp - 1)) return false;
	}
	return true;
}

//调用时保证入参是顺子，且牌数相同
function compareShunZi(vCard1, vCard2) {
	if (vCard1.length != vCard2.length) return 0;

	var vTmp1 = [];
	var vTmp2 = [];
	vCard1.forEach(function(c){
		c %= 13;
		if (c == 0) c = 13;
		vTmp1.push(c);
	});

	vCard2.forEach(function(c){
		c %= 13;
		if (c == 0) c = 13;
		vTmp1.push(c);
	});

	vTmp1.sort(sortble);
	vTmp2.sort(sortble);

	return vTmp1[0] - vTmp2[0];
}
