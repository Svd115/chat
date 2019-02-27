
	function io_listeners(){
		socket = io.connect();
		
		socket.on('connect', function(message){
			connection();
		});
		
		socket.on('disconnect', function(message){
			lost_connexion();
		});
		
		socket.on('pseudo', function(message){
			get_pseudo(message);
		})
		
		socket.on('chat', function(message){
			get_chat(message);
		});
		
		socket.on('message', function(message){
			design_chat_box(friend, message, true);
		});
		
		socket.on('is_writing', function(message){
			is_writing(message);
		});
		
		socket.on('chat_leave', function(message){
			chat_leave(message);
			closing_call();
			end_rtc();
		});
		
		socket.on('infos', function(message){
			infos(message[0], message[1]);
		});
	
		socket.on("caller", function(){
			caller();
		});
		
		socket.on("callee", function(){
			callee();
		});

		socket.on("calling_declined", function(){
			calling_declined();
		});

		socket.on("calling_accepted", function(){
			calling_accepted();
		});

		socket.on("closeVideoCall", function(){
			closing_call();
			end_rtc();
		});

		socket.on("signaling", function(message){
			signaling(message);
		});
	}