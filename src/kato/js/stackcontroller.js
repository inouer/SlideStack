var initStack = function(slide){
	// 左矢印
	$('#controllerLeftArrow').click(slide.transitionOrAnimation.bind(slide));
	// 右矢印
	$('#controllerRightArrow').click(slide.transitionOrAnimation.bind(slide));
	// フルスクリーンモードボタン
	$('#controllerFullScreen').click(requestFullscreen);
	
	// 自動めくり開始
	if(!window.opener){
		var transitionTimer = setInterval(function(){
			slide.transitionOrAnimation(null, true);
		}, parseInt($('#autoSendPageTransitionTime').val()*1000));	
		$('#controllerAutoPageTransition').attr('src','img/suspend_auto.png');	
	}
	// 自動めくりボタン
	$('#controllerAutoPageTransition').click(
		function(){
			if(transitionTimer){
				// 自動めくり終了
				clearInterval(transitionTimer);
				this.setAttribute('src','img/start_auto.png');		
				transitionTimer=null;
			}else{
				// 自動めくり開始
				transitionTimer = setInterval(function(){
					slide.transitionOrAnimation(null, true);
				}, parseInt($('#autoSendPageTransitionTime').val()*1000));
				this.setAttribute('src','img/suspend_auto.png');					
			}
		}
	);
	
	//　間隔が変更されたらsetIntervalをリセット
	$('#autoSendPageTransitionTime').change(function(){
		clearInterval(transitionTimer);
		transitionTimer = setInterval(function(){
			slide.transitionOrAnimation(null, true);
		}, parseInt($('#autoSendPageTransitionTime').val()*1000));	
		$('#controllerAutoPageTransition').attr('src','img/suspend_auto.png');	
	});
	
	// フルスクリーンになったときのイベントハンドラ
	screenfull.onchange = function(e){
		// 自動めくり終了
		clearInterval(transitionTimer);
		$('#controllerAutoPageTransition').attr('src','img/start_auto.png');	
		transitionTimer=null;
	}
	
	// SVGクリックでページめくり
	$('svg').live('click',function(e){
		slide.transitionOrAnimation(e, true);		
	});
};

//フルスクリーン化
var requestFullscreen = function(){
	if(window.opener){
//		if (document.body.requestFullScreen){
//			document.body.requestFullScreen();
//		}
//		else if (document.body.webkitRequestFullScreen) {
//			document.body.webkitRequestFullScreen();        	
//		}
//		else if (document.body.mozRequestFullScreen) {
//			document.body.mozRequestFullScreen();
//		}
//		else {
//			alert("このブラウザではフルスクリーン機能は利用できません．")
//		}
		screenfull.request(document.body);
	}else{
		window.open(location.href, 'presentationWindow', 'width='+window.screen.width+', height='+window.screen.height);
	}
}

//フルスクリーン終了
var cancelFullscreen = function(){
	if (document.cancelFullScreen){
		document.cancelFullScreen();
	}
	else if (document.webkitCancelFullScreen) {
		document.webkitCancelFullScreen();        	
	}
	else if (document.mozCancelFullScreen) {
		document.mozCancelFullScreen();
	}
	else {
		alert("フルスクリーンの終了に失敗しました．");
	}	
}