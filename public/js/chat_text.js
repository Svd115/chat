	
	var unicode_emojis = new Array("U+1F600", "U+1F603", "U+1F604", "U+1F601", "U+1F606", "U+1F605", "U+1F923", "U+1F602", "U+1F642", "U+1F60A", "U+1F607", "U+1F60D", "U+1F929", "U+1F618", "U+1F60B", "U+1F61B", "U+1F61C", "U+1F92A", "U+1F61D", "U+1F911", "U+1F917", "U+1F92D", "U+1F92B", "U+1F914", "U+1F644", "U+1F612", "U+1F62C", "U+1F925", "U+1F614", "U+1F62A", "U+1F924", "U+1F634", "U+1F637", "U+1F912", "U+1F915", "U+1F922", "U+1F92E", "U+1F927", "U+1F635", "U+1F60E", "U+1F913", "U+1F9D0", "U+2639", "U+1F62E", "U+1F62F", "U+1F632", "U+1F633", "U+1F627", "U+1F628", "U+1F630", "U+1F625", "U+1F622", "U+1F62D", "U+1F631", "U+1F623", "U+1F613", "U+1F629", "U+1F62B", "U+1F624", "U+1F621", "U+1F92C", "U+1F608", "U+1F4A9")

	unicode_emojis.forEach(function(i){
		i = "&#x"+i.substr(2);
		$('<span class="emoji" id="'+i+'">'+i+'</span>').appendTo($("#emoji-content"));
	});

	$("#start_btn").on("click", function(){
		io_listeners();
	});

	$("#login").on("submit", function(e){
		e.preventDefault();
		pseudo = this["pseudo"].value;

		if(/^\s*$/.test(pseudo)){
			infos("danger", "Pseudo required before chatting !!");
		}
		else{
			if(pseudo.length > 15){
				infos("danger", "Pseudo too long !!");
			}
			else{
				socket.emit("login", pseudo);
			}
		}
	});

	$("#start_conversation").on("click", function(){
		
		$("#search").css("display", "none");
		$("#searching").css("display", "");
		$("#infos").css("visibility", "hidden");
		
		socket.emit("start_conversation");
		
	});

	$("#chat_message").keyup(function(){
		var message = $("#chat_message").val();
		
		if(message.length > 0 && !(writing)){
			writing = true;
			socket.emit("is_writing", true);
		}
		else if(message.length == 0 && writing){
			writing = false;
			socket.emit("is_writing", false);
		}
	});

	$("#chat_form").on("submit", function(e){
		e.preventDefault();
		var message = this["chat_message"].value;
		message = message.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&middot;/g, "{*}");

		if(/^\s*$/.test(message)){
			infos("danger", "Message required before sending !!");
		}
		else{
			$("#chat_message").val("");
			design_chat_box("You ("+pseudo+")", message, false);
			writing = false;
			socket.emit("message", message);
		}
	});

	$("#emoji_btn").on("click", function(){
		var display = $("#emoji-content").css("display");
		
		if(display == "none"){
			$("#emoji-content").css("display", "block");
		}
		else if(display == "block"){
			$("#emoji-content").css("display", "none");
		}
	});

	$(".emoji").on("click", function(){
		var id_attr = $(this).attr("id");
		var add_emoji = $("#chat_message").val()+' '+id_attr;
		
		$("#chat_message").val(add_emoji);
		$("#emoji-content").css("display", "none");
	});

	$("[name=img]").on("change", function(){
		var file = $(this)[0].files;
		
		if(file.length > 0){
			file = file[0];
			if(type_img_accepted.includes(file.type)){
				console.log(file.size);
				if(file.size < 1000000){
					var reader = new FileReader();
					
					reader.onload = function(e){
						var image = "<img src='"+e.target.result+"' style='max-width:100%'/>"
						socket.emit("image", image);
						design_chat_box("You ("+pseudo+")", image, false);
						console.log(pseudo);
					}
					
					reader.readAsDataURL(file);
				}
				else{
					infos("danger", "Your file is too big !!")
				}
			}
			else{
				infos("danger", "This file is not an image !!");
			}
		}
		
	});

	$("#chat_leave").on("click", function(){
		socket.emit("chat_leave");
		chat_leave(false);
	});

	function connection(){
		$("#start").css("display", "none");
		$("#pseudo").css("display", "");
	}
	
	function get_pseudo(message){
		if(message){
			$("#pseudo").css("display", "none");
			$("#search").css("display", "");
		}
	}

	function get_chat(message){
		$("#searching").css("display", "none");
		$("#chat").css("display", "");
		$("#chat_head h5").html("Chat with "+message);
		friend = message;
	}

	function design_chat_box(author, message, color){
		if(color){
			$("#chat_box>#is_writing").remove();
			var css_class = "his_messages";
			receiving_message_sound.play();
		}
		else{
			var css_class = "my_messages";
			sending_message_sound.play();
		}
		
		var $box = $('<div />').appendTo("#chat_box");
		$box.attr("class", css_class);
		
		var $name = $('<p />').appendTo($box);
		$name.html("<b>"+author+"</b>");
		
		var $message = $('<p />').appendTo($box);
		$message.html(message);
		
		var height = $('#chat_box')[0].scrollHeight;
		$('#chat_box').animate({
			scrollTop: height+"px"
		}, 1000);
	}

	function is_writing(message){
		if(message){
			var $box = $('<div />').appendTo("#chat_box");
			$box.attr("id", "is_writing");
			$box.attr("class", "his_messages");
			
			var $name = $('<p />').appendTo($box);
			$name.html("<em>"+friend+" is writing something...</em>");
			
			var height = $('#chat_box')[0].scrollHeight;
			$('#chat_box').animate({
				scrollTop: height+"px"
			}, 1000);
		}
		else{
			$("#chat_box>#is_writing").remove();
		}
	}

	function chat_leave(message){
		$("#chat_box").html("");
		$("#chat_head h5").html("");
		$("#search").css("display", "");
		$("#chat").css("display", "none");
		friend = "";
		
		if(message){
			infos("danger", message, true);
		}
	}

	function lost_connexion(){
		socket.close();
		infos('danger', "Connection lost !! Please refresh the page and reconnect.", true);
	}

	