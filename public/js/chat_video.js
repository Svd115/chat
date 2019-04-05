	
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
	
	function start_rtc(isOffer) {
		pc = new RTCPeerConnection(configuration);
		
		// send any ice candidates to the other peer
		pc.onicecandidate = (event) => {
			if (event.candidate) {
				socket.emit("candidate", event.candidate);
				console.log("Candidate send");
				console.log("-----------");
			}
		};
		
		if(isOffer){
			pc.onnegotiationneeded = async () => {
				try {
					if (negotiating || pc.signalingState != "stable") return;
					negotiating = true;
					
					try {
						await pc.setLocalDescription(await pc.createOffer(OfferAnswer));
						// Send the offer to the remote peer through the signaling server
						socket.emit("sdp", pc.localDescription);
						console.log("PC :");
						console.log(pc);
						console.log("-----------");
						console.log("Offer send :");
						console.log("-----------");
					} 
					catch (err) {
						// en cas d'erreur
						error("Erreur onnegotiationneeded :<br/>"+err);
						console.log("Erreur onnegotiationneeded :");
						console.log(err);
						console.log("-----------");
						console.log("Erreur onnegotiationneeded pc :");
						console.log(pc);
						console.log("-----------");
					}
				}
				finally {
					negotiating = false;
				}
			}
	
			// accéder à la camera
			navigator.mediaDevices.getUserMedia(constraints)
			.then(function(stream){
				// afficher la camera avant de l'envoyer à l'autre paire
				$("#local")[0].srcObject = stream;
				$("#local_video").css("background-image", "none").css("background-color", "black");
				
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
		
		// affiche le flux vidéo de l'autre paire
		pc.ontrack = (event) => {
			if (($("#remote")[0].srcObject)) return;
			console.log("ontrack remote");
			$("#remote")[0].srcObject = event.streams[0];
			$("#close_call_btn").css("display", "");
			$("#remote_video").css("background-image", "none").css("background-color", "black");
		};
	};
	
	function signaling(message){
		if (!pc){
			console.log("callee start")
			console.log("-----------");
			start_rtc(false);
		}
		
		if (message.type === "sdp"){
			var sdp = message.sdp;

			pc.setRemoteDescription(new RTCSessionDescription(sdp))
			.then(function (){
				if (pc.remoteDescription.type == "offer"){
					navigator.mediaDevices.getUserMedia(constraints)
					.then(function(stream){
						// afficher la camera avant de l'envoyer à l'autre paire
						console.log("getUserMedia");
						console.log("-----------");
						$("#local")[0].srcObject = stream;
						$("#local_video").css("background-image", "none").css("background-color", "black");
						stream.getTracks().forEach((track) => pc.addTrack(track, stream));
					})
					.then(function(){
						return pc.createAnswer(OfferAnswer);
					})
					.then(function(answer) {
						return pc.setLocalDescription(new RTCSessionDescription(answer));
					})
					.then(function(answer) {
						socket.emit("sdp", pc.localDescription);
						console.log("get offer");
						console.log("-----------");
					})
					.catch(function(err){
						// en cas d'erreur
						error("Erreur createAnswer :<br/>"+err);
						console.log("Erreur createAnswer :");
						console.log(err);
						console.log("-----------");
					});
				}
				else{
					console.log("get answer");
					console.log("-----------");
					console.log("track :");
					console.log(pc);
					console.log("-----------");
				}
			})
			.catch(function(err){
				// en cas d'erreur
				error("Erreur setRemoteDescription :<br/>"+err);
				console.log("Erreur setRemoteDescription :");
				console.log(err);
				console.log("-----------");
			});
		}
		else {
			pc.addIceCandidate(new RTCIceCandidate(message.candidate))
			.catch(function(err){
				// en cas d'erreur
				error("Erreur ice candidate :<br/>"+err);
				console.log("Erreur ice candidate :");
				console.log(err);
				console.log("-----------");
			});
		}
	}
	
	function error(message){
		infos("danger", message, true);
	}