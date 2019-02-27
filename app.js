	var express = require('express');
	app = express();
	var server = require('http').Server(app);
	var io = require('socket.io')(server);
	var ent = require('ent');
	var port = process.env.PORT;
	if (port == null || port == "") {
		port = 8000;
	}

	var users = [];
	var waiting_room = [];
	var chatters = [];

	app.use(express.static(__dirname + '/public'))
	.get('/', function(req, res){
		res.sendFile(__dirname + '/views/index.html');

	})
	.use(function(req, res, next){
		res.redirect('/');
	});
	
	io.sockets.on('connection', function(socket){
		users.push({ws : socket, pseudo : "new"});
		
		socket.on('login', function(message){
			message = ent.encode(message);
			
			var is_pseudo_not_vailable = false;
			
			for(var i = 0; i < users.length; i++){
				if(users[i].pseudo === message){
					is_pseudo_not_vailable = true;
					break;
				}
			};
			
			if(is_pseudo_not_vailable){
				infos("danger", "Pseudo not available !!", socket);
			}
			else{
				for(var i = 0; i < users.length; i++){
					if(users[i].ws === socket){
						if(users[i].pseudo === "new"){
							users[i].pseudo = message;
							socket.emit('pseudo', true);
						}
						else{
							infos("You already have a pseudo !!", socket);
						}
					}
				};
			}
		});
		
		socket.on('start_conversation', function(){
			var pseudo = get_pseudo_by_socket(socket);
			
			if(waiting_room.length > 0){
				var versus = waiting_room[0];
				waiting_room.splice(versus, 1);
				
				chatters.push({p1 : pseudo, p2 : versus, caller:false});
				
				vs_socket = get_socket_by_pseudo(versus);
				
				vs_socket.emit("chat", pseudo);
				socket.emit("chat", versus);
			}
			else{
				waiting_room.push(pseudo);
			}
		});
		
		socket.on('message', function(message){
			
			receiver = get_receiver(socket);
			
			vs_socket = get_socket_by_pseudo(receiver);
			vs_socket.emit("message", ent.encode(message));
		});
		
		socket.on('chat_leave', function(){
			var user_leaving_pseudo = get_pseudo_by_socket(socket);
			var connected_user = chatroom_splice(user_leaving_pseudo);
			
			connected_user = get_socket_by_pseudo(connected_user);
			connected_user.emit("chat_leave", user_leaving_pseudo+" left the room. You can search for another user.");
		});	
		
		socket.on('disconnect', function(){
			var user_leaving_pseudo = get_pseudo_by_socket(socket);
			var connected_user = chatroom_splice(user_leaving_pseudo);
			
			if(connected_user){
				connected_user = get_socket_by_pseudo(connected_user);
				connected_user.emit("chat_leave", user_leaving_pseudo+" left the room. You can search for another user.");
			}
			
			users = users.filter(function(e){
				return e.pseudo != user_leaving_pseudo;
			});
			
			waiting_room = waiting_room.filter(function(e){
				return e != user_leaving_pseudo;
			});
		});
		
		socket.on('is_writing', function(message){
			
			receiver = get_receiver(socket);
			
			vs_socket = get_socket_by_pseudo(receiver);
			vs_socket.emit("is_writing", message);
		});
		
		socket.on('image', function(message){
			
			var receiver = get_receiver(socket);
			
			vs_socket = get_socket_by_pseudo(receiver);
			vs_socket.emit("message", message);
		});
		
		socket.on('calling', function(){
			var pseudo = get_pseudo_by_socket(socket);
			
			for(var i = 0; i < chatters.length; i++){
				if(chatters[i].p1 === pseudo || chatters[i].p2 === pseudo){
					if(chatters[i].caller === false){
						
						chatters[i].caller = pseudo;
						socket.emit("caller");
						
						var receiver = get_receiver(socket);
						
						vs_socket = get_socket_by_pseudo(receiver);
						vs_socket.emit("callee");
					}
					break;
				}
			};
		});
		
		socket.on('declining_call', function(){
			var pseudo = get_pseudo_by_socket(socket);
			
			for(var i = 0; i < chatters.length; i++){
				if(chatters[i].p1 === pseudo || chatters[i].p2 === pseudo){
					if(chatters[i].caller !== false){
						
						chatters[i].caller = false;
						
						var receiver = get_receiver(socket);
						
						vs_socket = get_socket_by_pseudo(receiver);
						vs_socket.emit("calling_declined");
					}
					break;
				}
			};
		});
		
		socket.on('accepting_call', function(){
			var receiver = get_receiver(socket);
			
			vs_socket = get_socket_by_pseudo(receiver);
			vs_socket.emit("calling_accepted");
		});
		
		socket.on('close_rtc', function(){
			var pseudo = get_pseudo_by_socket(socket);
			
			for(var i = 0; i < chatters.length; i++){
				if(chatters[i].p1 === pseudo || chatters[i].p2 === pseudo){
					if(chatters[i].caller !== false){
						
						chatters[i].caller = false;
						
						var receiver = get_receiver(socket);
			
						vs_socket = get_socket_by_pseudo(receiver);
						vs_socket.emit("closeVideoCall");
					}
					break;
				}
			};
		});
		
		socket.on("candidate", function(candidate){
			var receiver = get_receiver(socket);
			ws = get_socket_by_pseudo(receiver);
			ws.emit("signaling", {type:"candidate", candidate: candidate});
		})
		
		socket.on("sdp", function(sdp){
			var receiver = get_receiver(socket);
			ws = get_socket_by_pseudo(receiver);
			ws.emit("signaling", {type:"sdp", sdp:sdp});
		})
		
	});

	function get_pseudo_by_socket(socket){
		for(var i = 0; i < users.length; i++){
			if(users[i].ws === socket){
				return users[i].pseudo;
				break;
			}
		}
	}
	
	function get_socket_by_pseudo(user){
		for(var i = 0; i < users.length; i++){
			if(users[i].pseudo === user){
				return users[i].ws;
				break;
			}
		}
	}
	
	function get_receiver(socket){
		var sender_pseudo = get_pseudo_by_socket(socket);
		var receiver;
		
		for(var i = 0; i < chatters.length; i++){
			if(chatters[i].p1 === sender_pseudo){
				receiver = chatters[i].p2;
				break;
			}
			else if(chatters[i].p2 === sender_pseudo){
				receiver = chatters[i].p1;
				break;
			}
		}
		
		return receiver;
	}
	
	function chatroom_splice(user){
		
		var connected_user = false;
		var index = 0;
		
		for(var i = 0; i < chatters.length; i++){
			if(chatters[i].p1 === user){
				connected_user = chatters[i].p2;
				index = i;
				break;
			}
			else if(chatters[i].p2 === user){
				connected_user = chatters[i].p1;
				index = i;
				break;
			}
		}
		
		if(connected_user){
			chatters = chatters.filter(function(e, i){
				return i != index;
			});
		}
		return connected_user;
	}
	
	function infos(level, data, socket){
		socket.emit("infos", [level, data]);
	}
	
	server.listen(port);