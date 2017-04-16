var db = require('../utils/db');

var rooms = {};
var creatingRooms = {};

var userLocation = {};
var totalRooms = 0;

var DI_FEN = [1,2,5];
var MAX_FAN = [3,4,5];
var JU_SHU = [4,8];
var JU_SHU_COST = [2,3];

/**
 * 随机一个房间号
 * */
function generateRoomId(){
	var roomId = "";
	for(var i = 0; i < 6; ++i){
		roomId += Math.floor(Math.random()*10);
	}
	return 111111;//roomId;
	//return roomId;
}
/**
 * 通过数据库数据建造房间信息
 * roomDB：数据库里面的房间信息
 * */
function constructRoomFromDb(roomDB){
	var roomInfo = {
		uuid:roomDB.uuid,
		id:roomDB.id,
		numOfGames:roomDB.num_of_turns,
		createTime:roomDB.create_time,
		nextButton:roomDB.next_button,
		seats:new Array(4),
		conf:JSON.parse(roomDB.base_info)
	};
	if(roomInfo.conf.type == "xlch"){
		roomInfo.gameMgr = require("./gamemgr_xlch");
	}else if(roomInfo.conf.type == "hehe"){
		roomInfo.gameMgr = require("./gamemgr_hehe");
	}else{
		roomInfo.gameMgr = require("./gamemgr_xzdd");
	}
	var roomId = roomInfo.id;

	for(var i = 0; i < 4; ++i){
		var _player = roomInfo.seats[i] = {};
		_player.userId = roomDB["user_id" + i];
		_player.score = roomDB["user_score" + i];
		_player.name = roomDB["user_name" + i];
		_player.ready = false;
		_player.seatIndex = i;
		_player.numZiMo = 0;
		_player.numJiePao = 0;
		_player.numDianPao = 0;
		_player.numAnGang = 0;
		_player.numMingGang = 0;
		_player.numChaJiao = 0;

		if(_player.userId > 0){
			userLocation[_player.userId] = {
				roomId:roomId,
				seatIndex:i
			};
		}
	}
	rooms[roomId] = roomInfo;
	totalRooms++;
	return roomInfo;
}

/*
* 创建房间
*
* */
exports.createRoom = function(creator,roomConf,gems,ip,port,callback){
	if(
		roomConf.type == null
		|| roomConf.zimo == null
		|| roomConf.huansanzhang == null
		|| roomConf.jushuxuanze == null ){
		callback(1,null);
		console.log('createRoom -- 1');
		return;
	}



	if(roomConf.zimo < 0 || roomConf.zimo > 2){
		callback(1,null);
		console.log('createRoom -- 2');
		return;
	}



	if(roomConf.jushuxuanze < 0 || roomConf.jushuxuanze > JU_SHU.length){
		callback(1,null);
		console.log('createRoom -- 3');
		return;
	}
	
	var cost = JU_SHU_COST[roomConf.jushuxuanze];
	if(cost > gems){
		callback(2222,null);
		console.log('createRoom -- 4');
		return;
	}
	var fnCreate = function(){
		var roomId = generateRoomId();
		if(rooms[roomId] != null || creatingRooms[roomId] != null){
			fnCreate();
		}
		else{
			creatingRooms[roomId] = true;
			db.is_room_exist(roomId, function(ret) {

				if(ret){
					delete creatingRooms[roomId];
					fnCreate();
				}
				else{
					var createTime = Math.ceil(Date.now()/1000);
					var roomInfo = {
						uuid:"",
						id:roomId,
						numOfGames:0,
						createTime:createTime,
						nextButton:0,
						seats:[],
						conf:{
							type:roomConf.type,
							baseScore:DI_FEN[roomConf.difen],
						    zimo:roomConf.zimo,
						    hsz:roomConf.huansanzhang,
						    maxFan:MAX_FAN[roomConf.zuidafanshu],
						    maxGames:JU_SHU[roomConf.jushuxuanze],
						    creator:creator,
						}
					};
					
					if(roomConf.type == "xlch"){
						roomInfo.gameMgr = require("./gamemgr_xlch");
					}else if(roomInfo.conf.type == "hehe"){
						roomInfo.gameMgr = require("./gamemgr_hehe");
					}
					else{
						roomInfo.gameMgr = require("./gamemgr_xzdd");
					}

					for(var i = 0; i < 4; ++i){
						roomInfo.seats.push({
							userId:0,
							score:0,
							name:"",
							ready:false,
							seatIndex:i,
							numZiMo:0,
							numJiePao:0,
							numDianPao:0,
							numAnGang:0,
							numMingGang:0,
							numChaJiao:0,
						});
					}
					

					//写入数据库
					var conf = roomInfo.conf;
					db.create_room(roomInfo.id,roomInfo.conf,ip,port,createTime,function(uuid){
						delete creatingRooms[roomId];
						if(uuid != null){
							roomInfo.uuid = uuid;
							rooms[roomId] = roomInfo;
							totalRooms++;
							callback(0,roomId);
						}
						else{
							callback(3,null);
						}
					});
				}
			});
		}
	}

	fnCreate();
};

exports.destroy = function(roomId){
	var roomInfo = rooms[roomId];
	if(roomInfo == null){
		return;
	}

	for(var i = 0; i < 4; ++i){
		var userId = roomInfo.seats[i].userId;
		if(userId > 0){
			delete userLocation[userId];
			db.set_room_id_of_user(userId,null);
		}
	}
	
	delete rooms[roomId];
	totalRooms--;
	db.delete_room(roomId);
}

exports.getTotalRooms = function(){
	return totalRooms;
}

exports.getRoom = function(roomId){
	return rooms[roomId];
};

exports.isCreator = function(roomId,userId){
	var roomInfo = rooms[roomId];
	if(roomInfo == null){
		return false;
	}
	return roomInfo.conf.creator == userId;
};
/*安排进入房间*/
exports.enterRoom = function(roomId,userId,userName,callback){
	var fnTakeSeat = function(room){
		//避免玩家重复进入
		if(exports.getUserRoom(userId) == roomId){
			//已存在
			return 0;
		}

		for(var i = 0; i < 4; ++i){
			var seat = room.seats[i];
			if(seat.userId <= 0){
				seat.userId = userId;
				seat.name = userName;
				userLocation[userId] = {
					roomId:roomId,
					seatIndex:i
				};
				//console.log(userLocation[userId]);
				db.update_seat_info(roomId,i,seat.userId,"",seat.name);
				//正常
				return 0;
			}
		}	
		//房间已满
		return 1;	
	}
	var room = rooms[roomId];

	if(room){
		var ret = fnTakeSeat(room);
		callback(ret);
	}
	else{
		db.get_room_data(roomId,function(roomDB){
			if(roomDB == null){
				//找不到房间
				callback(2);
			}
			else{
				//construct room.
				room = constructRoomFromDb(roomDB);
				//
				var ret = fnTakeSeat(room);
				callback(ret);
			}
		});
	}
};

exports.setReady = function(userId,value){
	var roomId = exports.getUserRoom(userId);
	if(roomId == null){
		return;
	}

	var room = exports.getRoom(roomId);
	if(room == null){
		return;
	}

	var seatIndex = exports.getUserSeat(userId);
	if(seatIndex == null){
		return;
	}

	var _player = room.seats[seatIndex];
	_player.ready = value;
}

exports.isReady = function(userId){
	var roomId = exports.getUserRoom(userId);
	if(roomId == null){
		return;
	}

	var room = exports.getRoom(roomId);
	if(room == null){
		return;
	}

	var seatIndex = exports.getUserSeat(userId);
	if(seatIndex == null){
		return;
	}

	var _player = room.seats[seatIndex];
	return _player.ready;
}


exports.getUserRoom = function(userId){
	var location = userLocation[userId];
	if(location != null){
		return location.roomId;
	}
	return null;
};

exports.getUserSeat = function(userId){
	var location = userLocation[userId];
	//console.log(userLocation[userId]);
	if(location != null){
		return location.seatIndex;
	}
	return null;
};

exports.getUserLocations = function(){
	return userLocation;
};

exports.exitRoom = function(userId){
	var location = userLocation[userId];
	if(location == null)
		return;

	var roomId = location.roomId;
	var seatIndex = location.seatIndex;
	var room = rooms[roomId];
	delete userLocation[userId];
	if(room == null || seatIndex == null) {
		return;
	}

	var seat = room.seats[seatIndex];
	seat.userId = 0;
	seat.name = "";

	var numOfPlayers = 0;
	for(var i = 0; i < room.seats.length; ++i){
		if(room.seats[i].userId > 0){
			numOfPlayers++;
		}
	}
	
	db.set_room_id_of_user(userId,null);

	if(numOfPlayers == 0){
		exports.destroy(roomId);
	}
};