	
	$("#video_btn").on("click", function(){
		
		socket.emit("calling");
	});
	
	$("#close_call_btn").on("click", function(){
		closing_call();
		end_rtc();
		socket.emit("close_rtc");
	});
	
	function calling_animation(html){
		$("#calling_animation").css("display", "");
		$("#chat_box").css("display", "none");
		$("#all_chat_btn").css("display", "none");
		$("#chat_text").css("display", "none");
		
		$("#calling_animation").html(html);

	}
	
	function accepted_call_animation(){
		$("#calling_animation").css("display", "none");
		$("#calling_animation").html("");
		$("#chat_video").css("display","block")
		$("#local_video").css("background","url('/img/loader.gif') no-repeat center"); 
		$("#remote_video").css("background","url('/img/loader.gif') no-repeat center"); 
	}
	
	function declined_call_animation(){
		$("#calling_animation").css("display", "none");
		$("#calling_animation").html("");
		$("#chat_box").css("display", "");
		$("#all_chat_btn").css("display", "");
		$("#chat_text").css("display", "");
	}
	
	function closing_call_animation(){
		$("#chat_video").css("display", "none");
		$("#close_call_btn").css("display", "none");
		$("#chat_box").css("display", "");
		$("#all_chat_btn").css("display", "");
		$("#chat_text").css("display", "");
	}
	
	function caller(){
		
		var animation = 
			"<h5>You are calling "+$("#chat_with").text().replace(/Chat with /, "")+"</h5>"+
			"<img src='img/phone.gif' />";
		
		calling_animation(animation);
	}
	
	function callee(){
		receiving_call_sound.play();
		var animation = 
			"<h5>"+$("#chat_with").text().replace(/Chat with /, "")+" is calling you</h5>"+
			"<img src='/img/phone.gif' />"+
			"<div>"+
			"	<button type='button' id='accepting_call' class='btn btn-primary'>Yes</button>"+
			"	<button type='button' id='declining_call' class='btn btn-danger'>No</button>"+
			"</div>";
		
		calling_animation(animation);
		
		$("#accepting_call").on("click", function(){
			end_call_sound();
			accepting_call();
		});
		
		$("#declining_call").on("click", function(){
			end_call_sound();
			declining_call();
		});

		function end_call_sound(){
			receiving_call_sound.pause();
			receiving_call_sound.currentTime = 0;
		}
	}
	
	function accepting_call(){
		accepted_call_animation();
		socket.emit("accepting_call");
	}
	
	function calling_accepted(){
		accepted_call_animation();
		start_rtc(true);
	}
	
	function declining_call(){
		declined_call_animation();
		socket.emit("declining_call");
	}
	
	function calling_declined(){
		declined_call_animation();
	}
	
	function closing_call(){
		closing_call_animation();
	}
	
	function end_rtc(){
		var remoteVideo = $("#remote");
		var localVideo = $("#local");
		
		if(pc){
			pc.ontrack = null;
			pc.onremovetrack = null;
			pc.onremovestream = null;
			pc.onnicecandidate = null;
			pc.oniceconnectionstatechange = null;
			pc.onsignalingstatechange = null;
			pc.onicegatheringstatechange = null;
			pc.onnegotiationneeded = null;
	
			if(remoteVideo[0].srcObject){
				remoteVideo[0].srcObject.getTracks().forEach(track => track.stop());
			}

			if(localVideo[0].srcObject){
				localVideo[0].srcObject.getTracks().forEach(track => track.stop());
			}

			pc.close();
			pc = null;
		}

		remoteVideo.removeAttr("src");
		remoteVideo.removeAttr("srcObject");
		localVideo.removeAttr("src");
		localVideo.removeAttr("srcObject");
	}
	
	function start_rtc(isCaller){
		// initialiser la connexion
		pc = new RTCPeerConnection(configuration);
		
		// envoyer un candidate a l'autre user
		pc.onicecandidate = function(evt){
			if(evt.candidate){
				socket.emit("candidate", evt.candidate);
			}
		}
		
		// l'appelant créé l'offre
		if(isCaller){
			pc.onnegotiationneeded = () => {
				pc.createOffer(OfferAnswer)
				.then(function(offer) {
					pc.setLocalDescription(offer);
				})
				.then(function(){
					socket.emit("sdp", pc.localDescription);
				})
				.catch(function(err){
					error("Erreur création offre de isCaller :<br/>"+err);
					console.log("Erreur création offre de isCaller :");
					console.log(err);
					console.log("-----------");
				});
			}
		};
		
		// affiche le flux vidéo de l'autre paire
		pc.ontrack = (event) => {
			$("#remote")[0].srcObject = event.streams[0];
			if($("#remote")[0].srcObject){
				$("#close_call_btn").css("display", "");
				$("#remote_video").css("background-image", "none").css("background-color", "black");
			}
		};
		
		// accéder à la camera
		navigator.mediaDevices.getUserMedia(constraints)
		.then(function(stream){
			// afficher la camera avant de l'envoyer à l'autre paire
			$("#local")[0].srcObject = stream;
			if($("#local")[0].srcObject){
				$("#local_video").css("background-image", "none").css("background-color", "black");
			}
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));
		})
		.catch(function(err){
			// en cas d'erreur
			error("Erreur getUserMedia :<br/>"+err);
			console.log("Erreur getUserMedia :");
			console.log(err);
			console.log("-----------");
		});
	}
	
	async function signaling(message){
		if(!pc){
			$("#video").css("display", "");
			start_rtc(false);
		}
		
		// Si on recoit une description
		if(message.type === "sdp"){
			var sdp = message.sdp;
			
		try{
			if(sdp.type === "offer"){
				await pc.setRemoteDescription(sdp);
				await pc.setLocalDescription(await pc.createAnswer(OfferAnswer));
				socket.emit("sdp", pc.localDescription);
			} 
			else{
				await pc.setRemoteDescription(desc);
			}	
		}
		catch(err){
			error("Erreur  ici:<br/>"+err+"<br/>SDP :"+sdp);
			console.log(err);
			console.log("-----------");
		}		
				
		}
		// Sinon on recoit un candidate
		else if(message.type === "candidate"){
			pc.addIceCandidate(message.candidate)
			.catch(function(err){
				// en cas d'erreur
				error("Erreur ice candidate :<br/>"+err);
				console.log("Erreur ice candidate :");
				console.log(err);
				console.log("-----------");
			});
		}
		else{
			error("Erreur reception de message :<br/>"+message);
			console.log("Erreur reception de message :");
			console.log(message);
			console.log("-----------");
		}
	}
	
	function error(message){
		infos("danger", message, true);
	}