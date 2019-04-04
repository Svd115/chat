	
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
		start_rtc();
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
	
	async function start_rtc() {
		pc = new RTCPeerConnection(configuration);
		
		// send any ice candidates to the other peer
		pc.onicecandidate = (event) => {
			socket.emit("candidate", event.candidate);
		};

		// let the "negotiationneeded" event trigger offer generation
		pc.onnegotiationneeded = async () => {
			try {
				await pc.setLocalDescription(await pc.createOffer());
				// send the offer to the other peer
				socket.emit("sdp", pc.localDescription);
			}
			catch (err) {
				error("Erreur onnegotiationneeded :<br/>"+err);
				console.log("Erreur onnegotiationneeded :");
				console.log(err);
				console.log("-----------");
			}
		};

		try {
			// get a local stream, show it in a self-view and add it to be sent
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			$("#local")[0].srcObject = stream;
			// Render the media even before ontrack fires.
			$("#remote")[0].srcObject = new MediaStream(pc.getReceivers().map((r) => r.track));
		}
		catch (err) {
			error("Erreur getUserMedia :<br/>"+err);
			console.log("Erreur getUserMedia :");
			console.log(err);
			console.log("-----------");
		}
	};
	
	async function signaling(message){
		if (!pc){
			start_rtc();
		}
		
		try {
			if (message.type === "sdp"){
				var sdp = message.sdp;

				// if we get an offer, we need to reply with an answer
				if (sdp.type == 'offer') {
					await pc.setRemoteDescription(sdp);
					await pc.setLocalDescription(await pc.createAnswer());
					socket.emit("sdp", pc.localDescription);
				}
				else {
					await pc.setRemoteDescription(sdp);
				}
			}
			else {
				await pc.addIceCandidate(message.candidate);
			}
		}
		catch (err) {
			error("Erreur signaling :<br/>"+err);
			console.log("Erreur signaling :");
			console.log(err);
			console.log("-----------");
		}
	}
	
	function error(message){
		infos("danger", message, true);
	}