
/****是否可以听牌 */
function isCanTing(seatData,begin,end){
	var length = seatData.holds.length;
	var cloneHolds = JSON.parse(JSON.stringify(seatData.holds));
	
	//用于已经处理过的数据
	var oldDoList = {};
	for(var i = 0; i < length; ++i){
		var tmpCard = seatData.holds[i];
		if( oldDoList[tmpCard]!=null ){
			continue;
		}
		oldDoList[tmpCard] = true;
		
		//拿掉手中的i位置的牌
		seatData.holds.splice(i,1);
		if(seatData.countMap[i] != null){ 
		   eatData.countMap[i] -= 1;
		}

		var isCanTing = checkTingPai(seatData,0,26);

		//恢复数据
		seatData.holds = JSON.parse(JSON.stringify(cloneHolds));
		if(seatData.countMap[i] != null){ 
		   eatData.countMap[i] += 1;
		}
		if(isCanTing){
			return true;
		}
	}; 
	return false;
};

function checkTingPai(seatData,begin,end){
	for(var i = begin; i < end; ++i){
		//如果这牌已经在和了，就不用检查了
		if(seatData.tingMap[i] != null){
			continue;
		}
		//将牌加入到计数中
		var old = seatData.countMap[i];
		if(old == null){
			old = 0;
			seatData.countMap[i] = 1;
		}
		else{
			seatData.countMap[i] ++;		
		}

		seatData.holds.push(i);
		//逐个判定手上的牌
		var ret = checkCanHu(seatData);
		if(ret){
			//平胡 0番
			seatData.tingMap[i] = {
				pattern:"normal",
                fan:0
			};
		}
		//搞完以后，撤消刚刚加的牌
		seatData.countMap[i] = old;
		seatData.holds.pop();

		if(ret){
			return true;
		}
	}
	return false;	
}

var kanzi = [];
var record = false;
function debugRecord(pai){
	if(record){
		kanzi.push(pai);
	}
}

function matchSingle(seatData,selected){
	//分开匹配 A-2,A-1,A
	var matched = true;
	var v = selected % 9;
	if(v < 2){
		matched = false;
	}
	else{
		for(var i = 0; i < 3; ++i){
			var t = selected - 2 + i;
			var cc = seatData.countMap[t];
			if(cc == null){
				matched = false;
				break;
			}
			if(cc == 0){
				matched = false;
				break;
			}
		}		
	}


	//匹配成功，扣除相应数值
	if(matched){
		seatData.countMap[selected - 2] --;
		seatData.countMap[selected - 1] --;
		seatData.countMap[selected] --;
		var ret = checkSingle(seatData);
		seatData.countMap[selected - 2] ++;
		seatData.countMap[selected - 1] ++;
		seatData.countMap[selected] ++;
		if(ret == true){
			debugRecord(selected - 2);
			debugRecord(selected - 1);
			debugRecord(selected);
			return true;
		}		
	}

	//分开匹配 A-1,A,A + 1
	matched = true;
	if(v < 1 || v > 7){
		matched = false;
	}
	else{
		for(var i = 0; i < 3; ++i){
			var t = selected - 1 + i;
			var cc = seatData.countMap[t];
			if(cc == null){
				matched = false;
				break;
			}
			if(cc == 0){
				matched = false;
				break;
			}
		}		
	}

	//匹配成功，扣除相应数值
	if(matched){
		seatData.countMap[selected - 1] --;
		seatData.countMap[selected] --;
		seatData.countMap[selected + 1] --;
		var ret = checkSingle(seatData);
		seatData.countMap[selected - 1] ++;
		seatData.countMap[selected] ++;
		seatData.countMap[selected + 1] ++;
		if(ret == true){
			debugRecord(selected - 1);
			debugRecord(selected);
			debugRecord(selected + 1);
			return true;
		}		
	}
	
	
	//分开匹配 A,A+1,A + 2
	matched = true;
	if(v > 6){
		matched = false;
	}
	else{
		for(var i = 0; i < 3; ++i){
			var t = selected + i;
			var cc = seatData.countMap[t];
			if(cc == null){
				matched = false;
				break;
			}
			if(cc == 0){
				matched = false;
				break;
			}
		}		
	}

	//匹配成功，扣除相应数值
	if(matched){
		seatData.countMap[selected] --;
		seatData.countMap[selected + 1] --;
		seatData.countMap[selected + 2] --;
		var ret = checkSingle(seatData);
		seatData.countMap[selected] ++;
		seatData.countMap[selected + 1] ++;
		seatData.countMap[selected + 2] ++;
		if(ret == true){
			debugRecord(selected);
			debugRecord(selected + 1);
			debugRecord(selected + 2);
			return true;
		}		
	}
	return false;
}

function checkSingle(seatData){
	var holds = seatData.holds;
	var selected = -1;
	var c = 0;
	for(var i = 0; i < holds.length; ++i){
		//手牌
		var pai = holds[i];
		//手牌数量
		c = seatData.countMap[pai];
		if(c != 0){
			selected = pai;
			break;
		}
	}
	//如果没有找到剩余牌，则表示匹配成功了
	if(selected == -1){
		return true;
	}
	//否则，进行匹配
	if(c == 3){
		//直接作为一坎
		seatData.countMap[selected] = 0;
		debugRecord(selected);
		debugRecord(selected);
		debugRecord(selected);
		var ret = checkSingle(seatData);
		//立即恢复对数据的修改
		seatData.countMap[selected] = c;
		if(ret == true){
			return true;
		}
	}
	else if(c == 4){
		//直接作为一坎
		seatData.countMap[selected] = 1;
		debugRecord(selected);
		debugRecord(selected);
		debugRecord(selected);
		var ret = checkSingle(seatData);
		//立即恢复对数据的修改
		seatData.countMap[selected] = c;
		//如果作为一坎能够把牌匹配完，直接返回TRUE。
		if(ret == true){
			return true;
		}
	}
	
	//按单牌处理
	return matchSingle(seatData,selected);
}

/**额外加一张牌之后的处理 */
function checkCanHu(seatData){
	for(var k in seatData.countMap){
		k = parseInt(k);
		var c = seatData.countMap[k];
		if(c < 2){
			//主要是找出一个将牌
			continue;
		}
		//如果当前牌大于等于２，则将它选为将牌
		seatData.countMap[k] -= 2;
		//逐个判定剩下的牌是否满足　３Ｎ规则,一个牌会有以下几种情况
		//1、0张，则不做任何处理
		//2、2张，则只可能是与其它牌形成匹配关系
		//3、3张，则可能是单张形成 A-2,A-1,A  A-1,A,A+1  A,A+1,A+2，也可能是直接成为一坎AAA
		//4、4张，则只可能是一坎+单张
		kanzi = [];
		//将牌已经被拿掉了
		var ret = checkSingle(seatData);
		seatData.countMap[k] += 2;
		if(ret){
			//kanzi.push(k);
			//kanzi.push(k);
			//console.log(kanzi);
			return true;
		}
	}
}

 

exports.checkTingPai = checkTingPai;
exports.isCanTing = isCanTing;

exports.getMJType = function(pai){
      if(id >= 0 && id < 9){
          return 0;
      }
      else if(id >= 9 && id < 18){
          return 1;
      }
      else if(id >= 18 && id < 27){
          return 2;
      }
}