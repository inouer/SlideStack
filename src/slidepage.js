/**
 * @author inouer
 */

//サーバのURL
var _serverURL = "http://" + location.host;

//ページのIDをURLから抽出
var urlList = location.href.split('/');
var _pageId = urlList[urlList.length-1];

//スライドの画像を保持
var _assets = {};
var _slides = new Array();

//表示しているスライドのindex
var _currentIndex = 0;

//標準のスライドのサイズ
var defaultCanvasW = 720;
var defaultCanvasH = 540;
//縮小時のスライドのサイズ
var canvasW;
var canvasH;
//コントローラの高さ
var controllerH = 60;

//編集メニューを表示しているかどうか
var _editMenuFlag = false;
//編集メニューが選択されているかどうか
var _editFeatureSelectedFlag = false;

//アノテーションのオブジェクト
var _annotations = new Array();
//テキスト編集のバルーン管理
var _visibleBalloonId;

//自動ページめくりの設定を表示しているかどうか
var _autoSendPageSettingFlag = false;
//自動ページめくりのタイマーID
var _autoSendPageTimer;
//自動ページめくりの秒数
var _autoSendPageMs=5;

//スライドの情報
var SLIDE_INFO;

//初期状態のスライドのインデックス
var _initIndex;

//編集機能
var EditFeature = {
    ANNOTATIONMEMO: 0
};

function SlideStack() {
    // クライアントのID
    this.clientID = makeRandobet(64);

    // UA
    this.websocketFlag = true;

    // コメント欄の幅
    this.commentWidth = 80;

    // サムネイルモードのフラグ
    this.thumbnailMode = false;
    // プレゼンテーションモードのフラグ
    this.presentationMode = false;

    // リアルタイム通信のためのサーバのURL
    this.realtimeServerURL = "http://" + location.host.split(":")[0] + ":4001";

    // websocket
    this.socket;

    // サイズ変更時の倍率
    this.reseizeRatio;

    // ポインタのサイズ
    this.pointerSize = 68;

    // コントローラーのアイコンのサイズ
    this.controllerIconSize = 35;

    // コメントを通知するかどうかのフラグ
    this.commentNotification = false;
};

SlideStack.prototype.init = function(){
    // websocketの設定
    if(!this.thumbnailMode){
        this.socket = new io.connect(this.realtimeServerURL);
        this.websocketSetting();
    }

    // UAを確認
    this.checkUA();

    // キャンバスの大きさを動的に設定
    // width, height属性を指定しないとcreate.jsで描画が上手くいかない
    canvasW = $('#slideController').parent().width();
    canvasH = $('#slideController').parent().height();
    if(canvasW==0){
        canvasW = $(window).width();
        canvasH = $(window).height();
    }
    else if(canvasW < defaultCanvasW){
        canvasH = canvasW/4*3;
    }

//	if(canvasW==0){
//        canvasW = defaultCanvasW;
//        canvasH = defaultCanvasH;
//    }

    $("#slideEditor")
        .css({
            width: defaultCanvasW,
            height: defaultCanvasH
        });
    $("#controllerItems")
        .css({
            width: defaultCanvasW,
            height: controllerH
        });

    window.slidestack.resizeRatio=canvasW/defaultCanvasW;

    // 親ウィンドウがいる場合（フルスクリーンモード）
    if(window.opener){
        window.slidestack.presentationMode = true;
    }

    if(!window.slidestack.presentationMode){
        // 背景を位置調整してリサイズ
        // リサイズしてから位置調整ではうまくいかない
        $('#slideEditor').css({
            "-webkit-transform": "translate("+-defaultCanvasW*(1-window.slidestack.resizeRatio)/2+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+")",
            "-moz-transform": "translate("+-defaultCanvasW*(1-window.slidestack.resizeRatio)/2+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+")"
        });
        $('#slideContainer').css({
            "-webkit-transform": "translate("+-defaultCanvasW*(1-window.slidestack.resizeRatio)/2+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+")",
            "-moz-transform": "translate("+-defaultCanvasW*(1-window.slidestack.resizeRatio)/2+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+")"
        });
    }

    // bodyに情報をもたせる
    $('body').attr('data-pageid',_pageId);

    // bodyに関するイベント
    $('body')
        .off()
        .on('keydown',function(e){
            if(e.ctrlKey && e.keyCode == 70){
                window.searcher.showHide();
            }
        });

    // ウインドウサイズ変更時
    $(window).resize(function(e){
        // キャンバスの大きさを動的に設定
        // width, height属性を指定しないとcreate.jsで描画が上手くいかない
        canvasW = $('#slideController').parent().width();
        canvasH = $('#slideController').parent().height();
        if(canvasW==0){
            canvasW = $(window).width();
            canvasH = $(window).height();
        }
        else if(canvasW < defaultCanvasW){
            canvasH = canvasW/4*3;
        }
//	else{
//	canvasW = defaultCanvasW;
//	canvasH = defaultCanvasH;
//	}

        $("#slideEditor")
            .css({
                width: defaultCanvasW,
                height: defaultCanvasH
            });
        $("#controllerItems")
            .css({
                width: defaultCanvasW,
                height: controllerH
            });

        window.slidestack.resizeRatio=canvasW/defaultCanvasW;

        if(!window.slidestack.presentationMode){
            // 背景を位置調整してリサイズ
            // リサイズしてから位置調整ではうまくいかない
            $('#slideEditor').css({
                "-webkit-transform": "translate("+-defaultCanvasW*(1-window.slidestack.resizeRatio)/2+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")",
                "-moz-transform": "translate("+-defaultCanvasW*(1-window.slidestack.resizeRatio)/2+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")"
            });

            $('#controllerItems').css({
                "top": defaultCanvasH*window.slidestack.resizeRatio,
                "left": "0px",
                "-webkit-transform": "translate("+-defaultCanvasW*(1-window.slidestack.resizeRatio)/2+"px, "+-controllerH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")",
                "-moz-transform": "translate("+-defaultCanvasW*(1-window.slidestack.resizeRatio)/2+"px, "+-controllerH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")"
            });
        }

        // コントローラーの調整
        window.slidestack.setupController();
    });

    this.loadSlideInfo();
}

SlideStack.prototype.loadSlideInfo = function(){
    var data = {
        fileid: _pageId
    };
    var successHandler = function(res){
        var parsedRes = $.parseJSON(res);

        SLIDE_INFO = parsedRes[0];

        console.log(SLIDE_INFO);

        window.slidestack.makeUpSlide();

        window.slidestack.setupController();

        window.slidestack.jumpSlide(_currentIndex);

//		window.slidestack.fetchEditHistory(SLIDE_INFO.slides[_currentIndex],true);
    };
    this.sendRequest("slideinfo", data, successHandler);
};

SlideStack.prototype.makeUpSlide = function(){
    // スライドを構成
    for(var i=0;i<SLIDE_INFO.slidenum;i++){
        var $article = $('<article />')
        $article.attr({
            'id': "page"+i,
            'class': "slide"
        });
        if(i!=_currentIndex){
            $article.hide();
        }

        var $object = $('<object />');
        if(SLIDE_INFO.slides[i]==""){
            $object
                .attr({
                    'class': "slide",
                    'type': "image/jpeg",
                    'data': _serverURL+"/slideimage?fileid="+SLIDE_INFO.pageid+"&filename="+SLIDE_INFO.originalslides[i]
                });
        }else{
            $object
                .attr({
                    'class': "slide",
                    'type': SLIDE_INFO.type,
                    'data': SLIDE_INFO.slides[i]
                });
        }

        $article.append($object);
        $('#slideContainer').append($article);
    }

    // フルスクリーンモードの有効化
    if(window.slidestack.presentationMode) {
        window.slidestack.fullscreenModeActivation();
    }

//	// preload.jsで事前に画像読み込み
//	// 読み込むものの配列
//	var loadManifest = new Array();
//	for(var i=0;i<SLIDE_INFO.slidenum;i++){
//		var image = {
//				id: "page"+i,
//				src: _serverURL + "/slideimage?fileid=" + _pageId + "&filename=" + SLIDE_INFO.slides[i] + ".jpg"
//		};
//		loadManifest.push(image);
//	}
//
//	// 画像を読み込むごとに配列に格納
//	var slideImageLoading = function(event) {
//		_assets[event.id] = event.result;
//	};
//
//	// 画像を読み込み終わった後実行
//	var slideImageLoaded = function() {
//		// 重ねてスライドスタックを生成
//		for(var i=0;i<SLIDE_INFO.slidenum;i++){
//			var slideArticle = document.createElement('article');
//			$(slideArticle).attr('id', "page"+i);
//			$(slideArticle).attr('class', "slide");
//			if(i!=_currentIndex){
//				$(slideArticle).hide();
//			}
//
//			$(_assets["page"+i]).attr('class', "slide");
//
//			$(slideArticle).append(_assets["page"+i]);
//			$('#slideContainer').append(slideArticle);
//		}
//
//		// フルスクリーンモードに切り替え
//		if(window.opener){
//			window.slidestack.fullscreenModeActivation();
//		}
//	};
//
//	var loader = new createjs.PreloadJS(false);
//	// ファイルを読み込むごとのコールバック
//	loader.onFileLoad = slideImageLoading;
//	// 読み込み終わった時のコールバック
//	loader.onComplete = slideImageLoaded;
//	// 読み込み開始
//	loader.loadManifest(loadManifest);
};

SlideStack.prototype.setupController = function(){
    // 矢印キーでページめくり
    $(window).keydown(function(e){
        if(e.keyCode == 37){
            $('#sendPageLeftArrow').trigger("click");
            return false;
        } else if (e.keyCode == 39){
            $('#sendPageRightArrow').trigger("click");
            return false;
        } else if (e.keyCode == 13){
            if(window.opener){
                $('#sendPageRightArrow').trigger("click");
                return false;
            }
        } else if (e.keyCode == 27){
            if(window.opener){
                window.slidestack.cancelFullscreen();

                window.close();
            }
            return false;
        }
    });

    // コメント機能
    this.commentFeatureActivation();

    // コントローラの幅
    if(window.slidestack.presentationMode){
        var controllerBottom = -controllerH+10;
        $('#controllerItems').css({
            "position": "fixed",
            bottom: controllerBottom,
//            "top": document.body.clientHeight-parseInt($('#controllerItems').css('height'))-20,
            "left": document.body.clientWidth/2-620/2,
            "width": "620px"
        });

        // コントローラの設定切り替え
        $('#controllerItems')
            .unbind()
            .hover(
            function(){
                $(this).stop();
                $(this)
                    .animate({
                        bottom:"0px"
                    },300);
            },
            function(){
                if(!_editMenuFlag && !_autoSendPageSettingFlag){
                    $(this).stop();
                    $(this)
                        .animate({
                            bottom:controllerBottom
                        },300);
                }
            });
    }
    else{
        $('#controllerItems').css({
            "top": defaultCanvasH*window.slidestack.resizeRatio,
            "left": "0px",
            "width": canvasW
        });
    }

    // 機能の有効無効設定
    var buttonNum = 0;
    if(!SLIDE_INFO.controller.annotation){
        $('#editTool').hide();
    }else{
        buttonNum++;
    }
    if(!SLIDE_INFO.controller.commentview){
        $('#commentOnOff').hide();
    }else{
        buttonNum++;
    }
    if(!SLIDE_INFO.controller.pointer){
        $('#pointer').hide();
    }else{
        buttonNum++;
    }
    if(!SLIDE_INFO.controller.sendpage){
        $('.controllerSendPage').hide();
    }else{
        buttonNum++;
        buttonNum++;
    }
    if(!SLIDE_INFO.controller.autosendpage){
        $('#autoSendPage').hide();
    }else{
        buttonNum++;
    }
    if(!SLIDE_INFO.controller.presentationmode){
        $('#fullScreen').hide();
    }else{
        buttonNum++;
    }

    // 以降，アイコンのイベント設定
    // 編集機能ボタン
    $('#editTool')
        .off()
        .on('click',function(){
            if(!_editMenuFlag){
                _editMenuFlag = true;

                $(this)
                    .showBalloon({
                        position:"top",
                        offsetX:100,
                        css: {
                            opacity: '1.0',
                            boxShadow: '0px 0px 0px #000'
                        },
                        contents: "<div id=\"commentMenu\">"+
                            "<input type=\"text\" id=\"commentText\" size=40 placeholder=\"comment\" />"+
                            "<div id=\"sendCommentText\" class=\"blueButtonBefore\">send</div>"+
                            "</div>",
                        showDuration: "show",
                        showAnimation: function(d){ this.fadeIn(d); }
                    });

                $('#sendCommentText')
                    .off()
                    .on('click',function(){
                        if($('#commentText').val()=="") return;

                        var data = {
                            pageid: _pageId,
                            text: $('#commentText').val()
                        };
                        var successHandler = function(res){
                            var parsedRes = $.parseJSON(res);

                            // バルーン隠す
                            $('#editTool').trigger('click');

                            // 入力欄初期化
                            $('#commentText').val('');

                            // リアルタイム通信
                            window.slidestack.sendRealtimeRequest('comment',parsedRes);

                            var $comment = $('<div/>');
                            var $time = $('<div/>');
                            $time
                                .css({
                                    width:"100%",
                                    "word-break": "break-all",
                                    "word-wrap": "break-word",
                                    "text-align":"right",
                                    "font-size":"5pt"
                                })
                                .html(parsedRes.date.replace(" ","<br>"))
                                .appendTo($comment);
                            var $text = $('<div/>');
                            $text
                                .css({
                                    width:"100%",
                                    "word-break": "break-all",
                                    "word-wrap": "break-word",
                                    "text-align":"left",
                                    "font-size":"10pt"
                                })
                                .html(parsedRes.text)
                                .appendTo($comment);
                            $comment
                                .attr({
                                    class:"commentBox"
                                })
                                .css({
                                    width:"100%",
                                    display:"none"
                                })
                                .prependTo($('#commentList'))
                                .slideDown("slow",function(){
                                    if(window.slidestack.commentNotification){
                                        $(this)
                                            .showBalloon({
                                                position:"right",
                                                tipSize:10,
                                                css: {
                                                    opacity: '1.0',
                                                    boxShadow: '0px 0px 0px #000'
                                                },
                                                contents: parsedRes.text,
                                                showDuration: "show",
                                                showAnimation: function(d){ this.fadeIn(d); }
                                            });

                                        setTimeout(function(){
                                            $(".commentBox").hideBalloon();
                                        },2000);
                                    }
                                });
                        };
                        window.slidestack.sendRequest("commentsend", data, successHandler);

                    })
                    .hover(
                    function(){
                        $(this).attr('class','blueButtonAfter');
                    },
                    function(){
                        $(this).attr('class','blueButtonBefore');
                    });

                // WFE-Sに頼らない独自のアノテーション機能（使用しない）
//                $(this).showBalloon({
//                    position: "top",
//                    tipSize: 20,
//                    css: {
//                        opacity: '1.0'
//                    },
//                    contents: "<div id=\"slideEditMenu\">"+
//                        "<div id=\"editMenuAnnotationMemo\" class=\"editMenuButtonsUnselected\">"+
//                        "メモ"+
//                        "</div>"+
//                        "<div id=\"editMenuLine\" class=\"editMenuButtonsUnselected\">"+
//                        "</div>" +
//                        "</div>",
//                    showDuration: "slow",
//                    showAnimation: function(d) { this.fadeIn(d); }
//                });
//
//                // 編集機能のボタン
//                $('#editMenuAnnotationMemo')
//                    .unbind()
//                    .click(function(){
//                        window.slidestack.editFeatureActivation(EditFeature.ANNOTATIONMEMO);
//                        $(this).attr('class','editMenuButtonsSelected');
//                        _editFeatureSelectedFlag=true;
//                    })
//                    .hover(function () {
//                        $(this).attr('class','editMenuButtonsSelected');
//                    },
//                    function () {
//                        // バルーンが閉じれられた時
//                        if(!_editFeatureSelectedFlag){
//                            $(this).attr('class','editMenuButtonsUnselected');
//                        }
//                    })
//                    .css("cursor","pointer");
            }else{
                _editMenuFlag = false;
                $(this).hideBalloon();
            }
        });

    // コメント機能オンオフ
    var commentOnOffFlag = true;
    $('#commentOnOff')
        .off()
        .on('click',function(){
            if(commentOnOffFlag){
                window.slidestack.commentNotification = true;

                $('#commentOnOff img')
                    .attr({
                        src: "./img/comment.png"
                    });
            }else{
                window.slidestack.commentNotification = false;

                $('#commentOnOff img')
                    .attr({
                        src: "./img/comment_off.png"
                    });
            }
            commentOnOffFlag = !commentOnOffFlag;
        });

    // スライド送りボタン
    // 左
    $('#sendPageLeftArrow')
        .unbind()
        .click(function(){
            if(_currentIndex != 0){
                $("#page" + _currentIndex).hide();
                _currentIndex--;
                $("#page" + _currentIndex).show();

                $('#annotationText').remove();

                var nowIndex = _currentIndex+1;
                $('#jquery-ui-slider').slider({
                    value: nowIndex
                });
                $('#pageNum').html(nowIndex+'/'+SLIDE_INFO.slidenum);

                window.slidestack.fetchEditHistory(SLIDE_INFO.slides[_currentIndex],true);
            }
        })
        .mouseover(function(){
            if(_visibleBalloonId!=""){
                $('#'+_visibleBalloonId).trigger("click");
            }
        });

    //右
    $('#sendPageRightArrow')
        .unbind()
        .click(function(){
            SLIDE_INFO.slidenum = $("#slideContainer").children().length;
            if(_currentIndex != SLIDE_INFO.slidenum-1){
                $("#page" + _currentIndex).hide();
                _currentIndex++;
                $("#page" + _currentIndex).show();

                $('#annotationText').remove();

                var nowIndex = _currentIndex+1;
                $('#jquery-ui-slider').slider({
                    value: nowIndex
                });
                $('#pageNum').html(nowIndex+'/'+SLIDE_INFO.slidenum);

                window.slidestack.fetchEditHistory(SLIDE_INFO.slides[_currentIndex],true);
            }else if(_autoSendPageTimer){
                $("#page" + _currentIndex).hide();
                _currentIndex = 0;
                $("#page" + _currentIndex).show();

                $('#annotationText').remove();

                var nowIndex = _currentIndex+1;
                $('#jquery-ui-slider').slider({
                    value: nowIndex
                });
                $('#pageNum').html(nowIndex+'/'+SLIDE_INFO.slidenum);

                window.slidestack.fetchEditHistory(SLIDE_INFO.slides[_currentIndex],true);
            }
        })
        .mouseover(function(){
            if(_visibleBalloonId!=""){
                $('#'+_visibleBalloonId).trigger("click");
            }
        });

    // スライダー
    var initIndex = _currentIndex+1;
    $('#pageNum').html(initIndex+'/'+SLIDE_INFO.slidenum);
    $('#jquery-ui-slider')
        .slider({
            range: 'min',
            value: initIndex,
            min: 1,
            max: SLIDE_INFO.slidenum,
            step: 1,
            slide: function(event, ui) {
                $("#page" + _currentIndex).hide();
                _currentIndex=ui.value-1;
                $("#page" + _currentIndex).show();

                $('#annotationText').remove();

                $('#pageNum').html(ui.value+'/'+SLIDE_INFO.slidenum);

                window.slidestack.fetchEditHistory(SLIDE_INFO.slides[_currentIndex],true);
            }
        })
        .mouseover(function(){
            if(_visibleBalloonId!=""){
                $('#'+_visibleBalloonId).trigger("click");
            }
        })
        .css({
            "width": $('#controllerItems').width()-buttonNum*window.slidestack.controllerIconSize-buttonNum*10 // コントローラの幅-ボタンの幅-要素間のマージン決め打ち
        });

    // 自動ページめくりボタン
    $('#autoSendPage')
        .off()
        .on('click',function(){
            if(!_autoSendPageSettingFlag){
                _autoSendPageSettingFlag=true;

                $(this).showBalloon({
                    position: "top",
                    tipSize: 20,
                    css: {
                        opacity: '1.0',
                        boxShadow: '0px 0px 0px #000'
                    },
                    contents: "<div id=\"autoSendPageMenu\">"+
                        "<input type=\"number\" id=\"autoSendPageTime\" size=2 maxlength=2 min=1 max=10 value=\""+_autoSendPageMs+"\"/>s (1〜10)<br>"+
                        "<div id=\"autoSendPageStart\" class=\"blueButtonBefore\">start</div>"+
                        "<div id=\"autoSendPageStop\" class=\"redButtonBefore\">stop</div>" +
                        "</div>",
                    showDuration: "slow",
                    showAnimation: function(d) {
                        this.fadeIn(d);

                        $('#autoSendPageStart')
                            .click(function(){
                                if(!_autoSendPageTimer || _autoSendPageMs!=parseInt($('#autoSendPageTime').val())){
                                    clearTimeout(_autoSendPageTimer);
                                    _autoSendPageMs=parseInt($('#autoSendPageTime').val())
                                    _autoSendPageTimer = setInterval(function(){
                                        $('#sendPageRightArrow').trigger("click");
                                    }, _autoSendPageMs*1000);

                                    $('#autoSendPage').trigger("click");
                                }
                            })
                            .hover(
                            function(){
                                $(this).attr('class','blueButtonAfter');
                            },
                            function(){
                                $(this).attr('class','blueButtonBefore');
                            })
                            .css("cursor","pointer");
                        $('#autoSendPageStop')
                            .click(function(){
                                if(_autoSendPageTimer){
                                    clearTimeout(_autoSendPageTimer);
                                    _autoSendPageTimer=false;

                                    $('#autoSendPage').trigger("click");
                                    $('#autoSendPage img').attr("src", "./img/start_auto.png");
                                }
                            })
                            .hover(
                            function(){
                                $(this).attr('class','redButtonAfter');
                            },
                            function(){
                                $(this).attr('class','redButtonBefore');
                            })
                            .css("cursor","pointer");
                    }
                });

                // 編集機能のボタン
                $('#editMenuAnnotationMemo').unbind().click(function(){
                    window.slidestack.editFeatureActivation(EditFeature.ANNOTATIONMEMO);
                    $(this).attr('class','editMenuButtonsSelected');
                    _editFeatureSelectedFlag=true;
                })
                    .hover(function () {
                        $(this).attr('class','editMenuButtonsSelected');
                    },
                    function () {
                        if(!_editFeatureSelectedFlag){
                            $(this).attr('class','editMenuButtonsUnselected');
                        }
                    })
                    .css("cursor","pointer");
            }else{
                _autoSendPageSettingFlag=false;
                $(this).hideBalloon();
            }
        });

    // フルスクリーンのボタン
    var fullScreenFlag = true;
    $('#fullScreen')
        .off()
        .on('click',function(){
            if(window.slidestack.presentationMode){
                if(fullScreenFlag){
                    window.slidestack.requestFullscreen();
                }else{
                    window.slidestack.cancelFullscreen();
                    setTimeout(function(){
                        window.close();
                    },500);
                }
                fullScreenFlag = !fullScreenFlag
            }else{
                var subWindow = window.open(location.href, 'presentationWindow', 'width='+window.screen.width+', height='+window.screen.height);
            }
        });

    // ポインタ機能
    var pointerFlag = true;
    $('#pointer')
        .off()
        .on('click',function(){
            if(pointerFlag){
                // ポインタのためのレイヤー生成，編集機能のオンオフも兼ねる
                var $div = $('<div/>');
                $div
                    .attr({
                        id:"pointerLayer",
                        style:$('#slideContainer').attr('style')
                    })
                    .css({
                        background: "white",
                        filter: "alpha(opacity=0)",
                        opacity: 0,
                        width:$('#slideContainer').width(),
                        height:$('#slideContainer').height(),
                        top:$('#slideContainer').offset().top,
                        left:$('#slideContainer').offset().left,
                        cursor:"url(/img/pointer1.png), default"
                    })
                    .mousemove(function(e){
                        // ポインタのリアルタイム共有
                        var pointerData = {
                            pageid:_pageId,
                            clientid:window.slidestack.clientID,
                            x: e.offsetX,
                            y: e.offsetY
                        };
                        window.slidestack.sendRealtimeRequest('pointer',pointerData);
                    })
                    .appendTo($('body'));
            }else{
                $('#pointerLayer').remove();
            }

            pointerFlag = !pointerFlag;
        });

    // スライドクリックで閉じる
    $("#slideEditor")
        .unbind()
        .click(function(){
            window.slidestack.closeMenu();
        });
}

//サムネイルモードのコントローラ
SlideStack.prototype.createThumbnailController = function(){
    var canvas = document.getElementById('slideController');
    var stage = new createjs.Stage(canvas);

    var leftArrowImg = new createjs.Bitmap("./img/left_arrow.png");
    leftArrowImg.alpha = 0;
    leftArrowImg.x = $('#slideController').width()/2-100;
    leftArrowImg.y = $('#slideController').height()-50;
    leftArrowImg.onClick = function(e) {
        $('#sendPageLeftArrow').trigger("click");
    }
    leftArrowImg.image.onload = function(){
        stage.update();
    }
    stage.addChild(leftArrowImg);

    var rightArrowImg = new createjs.Bitmap("./img/right_arrow.png");
    rightArrowImg.alpha = 0;
    rightArrowImg.x = $('#slideController').width()/2+100;
    rightArrowImg.y = $('#slideController').height()-50;
    rightArrowImg.onClick = function(e) {
        $('#sendPageRightArrow').trigger("click");
    }
    rightArrowImg.image.onload = function(){
        stage.update();
    }
    stage.addChild(rightArrowImg);

    createjs.Ticker.setFPS(10);
    createjs.Ticker.addListener(stage);

    // コントローラの表示非表示
    $('#slideController')
        .hover(
        function () {
            createjs.Tween.get(rightArrowImg, {loop:false})
                .to({alpha:1}, 500, createjs.Ease.sinInOut)
            createjs.Tween.get(leftArrowImg, {loop:false})
                .to({alpha:1}, 500, createjs.Ease.sinInOut)
        },
        function () {
            createjs.Tween.get(rightArrowImg, {loop:false})
                .to({alpha:0}, 500, createjs.Ease.sinInOut)
            createjs.Tween.get(leftArrowImg, {loop:false})
                .to({alpha:0}, 500, createjs.Ease.sinInOut)
        })
        .show();
}

//編集機能が選択された場合に機能を有効化
SlideStack.prototype.editFeatureActivation = function(mode){
    switch (mode) {
        case EditFeature.ANNOTATIONMEMO:
            // スライドをクリックしたらtextareaを表示するようにする
            $("#slideEditor").unbind().click(function(e){
                window.slidestack.closeMenu();

                if($('#annotationText').size()<=0){
                    var mouseX = e.offsetX;
                    var mouseY = e.offsetY;

                    var input = document.createElement('input');
                    $(input).css({"position": "absolute","left": mouseX*window.slidestack.resizeRatio, "top": mouseY*window.slidestack.resizeRatio, "z-index": "99"});
                    $(input).attr({
                        "id": "annotationText",
                        "size": 30
                    });
                    $("body").append(input);

                    $('#editMenuAnnotationMemo').attr('class','editMenuItemsUnselected');

                    // 再びスライドをクリックした場合は確定とみなしてサーバへ送信
                    $(this).unbind().click(function(){
                        var annotationText = $('#annotationText').val();
                        $('#annotationText').remove();

                        if(annotationText!=""){
                            var data = {
                                pageid: _pageId,
                                slideid: SLIDE_INFO.slides[_currentIndex],
                                feature: EditFeature.ANNOTATIONMEMO,
                                x: mouseX,
                                y: mouseY,
                                w: annotationText.length*22,
                                h: 22,
                                contents: annotationText,
                                color: "#000000",
                                fontsize: 22
                            };
                            var successHandler = function(res){
                                window.slidestack.fetchEditHistory(SLIDE_INFO.slides[_currentIndex],true);
                            };
                            window.slidestack.sendRequest("saveedits", data, successHandler);
                        }

                        // スライドクリックで閉じる
                        $("#slideEditor").unbind().click(function(){
                            window.slidestack.closeMenu();
                        });
                    });
                    _editFeatureSelectedFlag=false;
                }
            });
            break;
    }
}

//編集履歴の取り出しと適用
//initFlagはアノテーションのDIVを消す時true
SlideStack.prototype.fetchEditHistory = function(slideId, initFlag){
    var data = {
        slideid: slideId
    };
    var successHandler = function(res){
        // 初期化
        var ctx = $("#slideEditor")[0].getContext('2d');
        var editCanvasW = $("#slideEditor").attr('width');
        var editCanvasH = $("#slideEditor").attr('height');
        ctx.clearRect(0,0,editCanvasW,editCanvasH);

        if(initFlag){
            if($('.annotationDiv').size()>0){
                $('.annotationDiv').remove();
            }
        }

        var parsedRes = $.parseJSON(res);

        _annotations.lenth = 0;

        for(var i=0;i<parsedRes.length;i++){
            var historyId = parsedRes[i]._id;

            switch (parsedRes[i].feature) {
                case EditFeature.ANNOTATIONMEMO:
                    _annotations[historyId]=parsedRes[i];

                    if(initFlag){
                        var div = document.createElement('div');
                        $(div)
                            .attr('id', historyId)
                            .attr('class', "annotationDiv")
                            .css({
                                'position': 'absolute',
                                'left': _annotations[historyId].x*window.slidestack.resizeRatio,
                                'top': (_annotations[historyId].y-_annotations[historyId].fontsize)*window.slidestack.resizeRatio,
                                'width': _annotations[historyId].w*window.slidestack.resizeRatio,
                                'height': _annotations[historyId].h*window.slidestack.resizeRatio,
                                'z-index': '100',
                            })
                            .toggle(function(){
                                // 再編集のためのバルーンの設定
                                $('#'+_visibleBalloonId).hideBalloon();
                                _visibleBalloonId = $(this).attr('id');

                                //　バルーンの表示位置を決定
                                var balloonPosition;
                                var x = parseInt($(this).css('left').replace("px",""));
                                var y = parseInt($(this).css('top').replace("px",""));
                                var miniArea = {
                                    x: canvasW/5,
                                    y: canvasH/5,
                                    w: canvasW/2,
                                    h: canvasH/2,
                                };

                                //座標がオブジェクト内かどうかを判定
                                function judgeTouchObject(targetX,targetY,object){
                                    if (targetX > object.x && targetX < object.x + object.w) {
                                        if (targetY > object.y && targetY < object.y + object.h) {
                                            return true;
                                        }
                                    }
                                    return false;
                                }
                                var inMiniArea = judgeTouchObject(x,y,miniArea);
                                // 上か下か
                                if(y>canvasH/2){
                                    balloonPosition = "top";
                                }else{
                                    balloonPosition = "bottom";
                                }
                                // 左か右か
                                if(!inMiniArea){
                                    if(x>canvasW/2){
                                        balloonPosition = balloonPosition + "left";
                                    }else{
                                        balloonPosition = balloonPosition + "right";
                                    }
                                }

                                $(this).showBalloon({
                                    position: balloonPosition,
                                    tipSize: 20,
                                    css: {
                                        opacity: '1.0',
                                        zIndex: '200',
                                        boxShadow: '0px 0px 0px #000'
                                    },
                                    contents: "<div id=\"textEditContoroller\">" +
                                        "- 色<br>" +
                                        "<input readonly=\"readonly\" id=\""+$(this).attr('id')+"colorPicker\" class=\"annotationEditItems\" type=\"text\" name=\"someName\" value=\""+_annotations[$(this).attr('id')].color+"\"/><br>" +
                                        "- 文字サイズ<br>"+
                                        "<input type=\"number\" id=\""+$(this).attr('id')+"fontsizeSetting\" class=\"fontsizeSetting\" size=2 maxlength=2 min=10 max=50 value=\""+_annotations[$(this).attr('id')].fontsize+"\"/>(10〜50)" +
                                        "<div id=\""+$(this).attr('id')+"annotationDeleteButton\" class=\"redButtonBefore\">削除</div>"+
                                        "</div>",
                                    showDuration: "fast",
                                    showAnimation: function(d) {
                                        this.fadeIn(d);

                                        // バルーンの中身の設定
                                        // 色
                                        $("#"+_visibleBalloonId+"colorPicker").unbind().modcoder_excolor({
                                            hue_bar : 1,
                                            hue_slider : 57,
                                            anim_speed : 500,
                                            effect : 'fade',
                                            z_index: 300,
                                            callback_on_ok : function() {
                                                // 色変更時の動作
                                                console.log($('#modcoder_hex').val());
                                                _annotations[_visibleBalloonId].color = "#"+$('#modcoder_hex').val();

                                                var data = _annotations[_visibleBalloonId];
                                                var successHandler = function(res){
                                                    window.slidestack.fetchEditHistory(SLIDE_INFO.slides[_currentIndex]);
                                                };
                                                window.slidestack.sendRequest("saveedits", data, successHandler);
                                            }
                                        });
                                        // フォントサイズ
                                        $("#"+_visibleBalloonId+"fontsizeSetting").change(function(){
                                            _annotations[_visibleBalloonId].fontsize = $("#"+_visibleBalloonId+"fontsizeSetting").val();
                                            _annotations[_visibleBalloonId].w = $("#"+_visibleBalloonId+"fontsizeSetting").val()*_annotations[_visibleBalloonId].contents.length;
                                            _annotations[_visibleBalloonId].h = $("#"+_visibleBalloonId+"fontsizeSetting").val();

                                            var data = _annotations[_visibleBalloonId];
                                            var successHandler = function(res){
                                                window.slidestack.fetchEditHistory(SLIDE_INFO.slides[_currentIndex]);
                                            };
                                            window.slidestack.sendRequest("saveedits", data, successHandler);
                                        });
                                        // 削除
                                        $("#"+_visibleBalloonId+"annotationDeleteButton").click(function(){
                                            if(window.confirm("削除してもよろしいですか？")){
                                                $('#'+_visibleBalloonId).hideBalloon();

                                                var data = _annotations[_visibleBalloonId];
                                                var successHandler = function(res){
                                                    window.slidestack.fetchEditHistory(SLIDE_INFO.slides[_currentIndex]);
                                                };
                                                window.slidestack.sendRequest("deleteedits", data, successHandler);
                                            }
                                        })
                                            .hover(function(){
                                                $(this).attr('class','redButtonAfter');
                                            },
                                            function(){
                                                $(this).attr('class','redButtonBefore');
                                            })
                                            .css("cursor","pointer");
                                    },
                                });
                            },
                            function(){
                                $('#modcoder_colorpicker').remove();
                                $(this).hideBalloon();
                                _visibleBalloonId = "";
                            })
                            .css("cursor","pointer");
                        $('body').append(div);
                    }

                    ctx.fillStyle = parsedRes[i].color;
                    ctx.font = "bold "+parsedRes[i].fontsize+"px 'ＭＳ Ｐゴシック'";
                    ctx.fillText(parsedRes[i].contents, parsedRes[i].x, parsedRes[i].y);
                    break;
            }
        }
    };
    this.sendRequest("fetchedits", data, successHandler);
}

//スライドクリックによるクローズ
SlideStack.prototype.closeMenu = function(){
    if(_editMenuFlag){
        $('#editTool').trigger("click");
    }

//	$('#controllerItems').trigger("mouseleave");

    if(_autoSendPageSettingFlag){
        $('#autoSendPage').trigger("click");
    }

    if(_visibleBalloonId!=""){
        $('#'+_visibleBalloonId).trigger("click");
    }
}

//フルスクリーンモードの有効化
SlideStack.prototype.fullscreenModeActivation = function(){
    // 画面いっぱいにするためにcss切り替え
    window.slidestack.resizeRatio = (screen.height-10)/defaultCanvasH;

//    var translateLeft = -defaultCanvasW*(1-window.slidestack.resizeRatio)/2+(screen.width-window.slidestack.resizeRatio*defaultCanvasW)/2;
    var translateLeft = -defaultCanvasW*(1-window.slidestack.resizeRatio)/2+(screen.width-defaultCanvasW*window.slidestack.resizeRatio)/2;

    // 背景を位置調整してリサイズ
    // リサイズしてから位置調整ではうまくいかない
    $('#slideEditor').css({
        "-webkit-transform": "translate("+translateLeft+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")",
        "-moz-transform": "translate("+translateLeft+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")"
    });
    $('#slideContainer').css({
        "-webkit-transform": "translate("+translateLeft+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")",
        "-moz-transform": "translate("+translateLeft+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")"
    });

    // 背景黒
    $('body').css({
        "background-color": "#000000",
        overflow:"hidden"
    });
}

//フルスクリーン化
SlideStack.prototype.requestFullscreen = function(){
    if (document.body.requestFullScreen){
        document.body.requestFullScreen();
    }
    else if (document.body.webkitRequestFullScreen) {
        document.body.webkitRequestFullScreen();
    }
    else if (document.body.mozRequestFullScreen) {
        document.body.mozRequestFullScreen();
    }
    else {
        alert("このブラウザではフルスクリーン機能は利用できません．")
    }
}

//フルスクリーン終了
SlideStack.prototype.cancelFullscreen = function(){
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

// サムネイルモード（upload.jsから呼び出す）
SlideStack.prototype.thumbnailModeActivation = function(){
    $('#slideController')
        .show()
        .css({
            'width': defaultCanvasW,
            'height': defaultCanvasH,
            "-webkit-transform": "translate("+-defaultCanvasW*(1-window.slidestack.resizeRatio)/2+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")",
            "-moz-transform": "translate("+-defaultCanvasW*(1-window.slidestack.resizeRatio)/2+"px, "+-defaultCanvasH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")",
            "z-index":"999"
        });
    this.createThumbnailController();

    window.slidestack.thumbnailMode = true;
}

// コメント機能
SlideStack.prototype.commentFeatureActivation = function(){
    // サムネイルモードのときは表示しない
    if(window.slidestack.thumbnailMode){
        return;
    }

    var commentDivLeft = $('#slideContainer').offset().left-window.slidestack.commentWidth+3;
    if(window.slidestack.presentationMode){
        commentDivLeft = (-window.slidestack.commentWidth+3)*window.slidestack.resizeRatio;
    }

    // 既にある場合は一旦消す
    if($('#commentSpace').length!=0){
        $('#commentSpace').remove();
    }

    var $commentDiv = $('<div/>');
    $commentDiv
        .attr({
            id:"commentSpace"
        })
        .css({
            position:"absolute",
            top:$('#slideContainer').offset().top,
            left:commentDivLeft,
            height:$('#slideContainer').height()*window.slidestack.resizeRatio,
            width:window.slidestack.commentWidth*window.slidestack.resizeRatio,
            "min-width":window.slidestack.commentWidth
//            "-webkit-transform": "translate("+-window.slidestack.commentWidth*(1-window.slidestack.resizeRatio)/2+"px, "+-$('#slideContainer').height()*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+")",
//            "-moz-transform": "translate("+-window.slidestack.commentWidth*(1-window.slidestack.resizeRatio)/2+"px, "+-$('#slideContainer').height()*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+")"
        })
        .hover(
        function(){
            $(this).stop();
            $(this)
                .animate({
                    left:"0px"
                },300);

            $('.commentBox').hideBalloon();
        },
        function(){
            $(this).stop();
            $(this)
                .animate({
                    left: commentDivLeft
                },300);
        })
        .appendTo($('body'));

    var  $commentList = $('<div/>');
    $commentList
        .attr({
            id:'commentList'
        })
        .css({
            position:"absolute",
            top:0,
            width:"100%"
        })
        .appendTo($commentDiv);

    // 履歴取得
    var data = {
        pageid: _pageId
    };
    var successHandler = function(res){
        var parsedRes = $.parseJSON(res);
        console.log(parsedRes);

        $.each(parsedRes,function(){
            var $comment = $('<div/>');
            var $time = $('<div/>');
            $time
                .css({
                    width:"100%",
                    "word-break": "break-all",
                    "word-wrap": "break-word",
                    "text-align":"right",
                    "font-size":"5pt"
                })
                .html(this.date.replace(" ","<br>"))
                .appendTo($comment);
            var $text = $('<div/>');
            $text
                .css({
                    width:"100%",
                    "word-break": "break-all",
                    "word-wrap": "break-word",
                    "text-align":"left",
                    "font-size":"10pt"
                })
                .html(this.text)
                .appendTo($comment);
            $comment
                .attr({
                    class:"commentBox"
                })
                .css({
                    width:"100%"
                })
                .prependTo($('#commentList'));
        });
    };
    window.slidestack.sendRequest("getcomment", data, successHandler);
}

// サーバとの通信を抽象化
SlideStack.prototype.sendRequest = function(url, data, successHandler){
    $.ajax({
        url: _serverURL+"/"+url,
        type: "GET",
        data: data,
        success: successHandler,
        error: function(xhr, textStatus, errorThrown){
            console.log(xhr);
            console.log(textStatus + ": " + errorThrown);
        }
    });
}

// websocketを用いた通信
SlideStack.prototype.websocketSetting = function() {
    var socket = window.slidestack.socket;
    socket.on('connect', function() {
        console.log('connect');
    });
    // コメント
    socket.on('comment', function(res) {
        var parsedRes = $.parseJSON(res);

        // 違うスライドスタックのものだったらリジェクト
        if(parsedRes.pageid!=_pageId) return;

        var $comment = $('<div/>');
        var $time = $('<div/>');
        $time
            .css({
                width:"100%",
                "word-break": "break-all",
                "word-wrap": "break-word",
                "text-align":"right",
                "font-size":"5pt"
            })
            .html(parsedRes.date.replace(" ","<br>"))
            .appendTo($comment);
        var $text = $('<div/>');
        $text
            .css({
                width:"100%",
                "word-break": "break-all",
                "word-wrap": "break-word",
                "text-align":"left",
                "font-size":"10pt"
            })
            .html(parsedRes.text)
            .appendTo($comment);
        $comment
            .attr({
                class:"commentBox"
            })
            .css({
                width:"100%",
                display:"none"
            })
            .prependTo($('#commentList'))
            .slideDown("slow",function(){
                if(window.slidestack.commentNotification){
                    $(this)
                        .showBalloon({
                            position:"right",
                            tipSize:10,
                            css: {
                                opacity: '1.0',
                                boxShadow: '0px 0px 0px #000'
                            },
                            contents: parsedRes.text,
                            showDuration: "show",
                            showAnimation: function(d){ this.fadeIn(d); }
                        });

                    setTimeout(function(){
                        $(".commentBox").hideBalloon();
                    },2000);
                }
            });
    });
    // ポインタ
    socket.on('pointer', function(res) {
        var parsedRes = $.parseJSON(res);

        // 違うスライドスタックのものだったらリジェクト
        if(parsedRes.pageid!=_pageId) return;

        if($('#pointer'+parsedRes.clientid).length!=0){
            $('#pointer'+parsedRes.clientid)
                .css({
                    top:parsedRes.y*window.slidestack.resizeRatio,
                    left:parsedRes.x*window.slidestack.resizeRatio
                });
        }else{
            var $img = $('<img/>');
            $img
                .attr({
                    id:"pointer"+parsedRes.clientid,
                    src:"./img/pointer1.png"
                })
                .css({
                    position:"absolute",
                    top:parsedRes.y,
                    left:parsedRes.x
                })
                .appendTo($('body'));

            var pointerW = $img.width();
            var pointerH = $img.height();
            $img
                .css({
                    "-webkit-transform": "translate("+-pointerW*(1-window.slidestack.resizeRatio)/2+"px, "+-pointerH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")",
                    "-moz-transform": "translate("+-pointerW*(1-window.slidestack.resizeRatio)/2+"px, "+-pointerH*(1-window.slidestack.resizeRatio)/2+"px) scale("+window.slidestack.resizeRatio+","+window.slidestack.resizeRatio+")"
                });
        }
    });
    socket.on('disconnect', function(){
        console.log('disconnect');
    });
}

SlideStack.prototype.sendRealtimeRequest = function(url, data, successHandler){
    if(this.websocketFlag){
        window.slidestack.socket.emit(url,data);
    }else{
        $.ajax({
            url: window.slidestack.realtimeServerURL+"/"+url,
            type: "GET",
            data: data,
            success: successHandler,
            error: function(xhr, textStatus, errorThrown){
                console.log(xhr);
                console.log(textStatus + ": " + errorThrown);
            }
        });
    }
}

// UA判定
SlideStack.prototype.checkUA = function(){
    var userAgent = window.navigator.userAgent.toLowerCase(),
        appVersion = window.navigator.appVersion.toLowerCase(),
        uaName = 'unknown',
        ios = '',
        ios_ver = '';

    if (userAgent.indexOf('msie') != -1) {
        uaName = 'ie';
        if (appVersion.indexOf('msie 6.') != -1) {
            uaName = 'ie6';
        } else if (appVersion.indexOf('msie 7.') != -1) {
            uaName = 'ie7';
        } else if (appVersion.indexOf('msie 8.') != -1) {
            uaName = 'ie8';
        } else if (appVersion.indexOf('msie 9.') != -1) {
            uaName = 'ie9';
        } else if (appVersion.indexOf('msie 10.') != -1) {
            uaName = 'ie10';
        }
    } else if (userAgent.indexOf('chrome') != -1) {
        uaName = 'chrome';
    } else if (userAgent.indexOf('iphone') != -1) {
        uaName = 'iphone';
        var ios = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
        ios_ver = [parseInt(ios[1], 10), parseInt(ios[2], 10), parseInt(ios[3] || 0, 10)];

        this.websocketFlag = false;
    } else if (userAgent.indexOf('ipad') != -1) {
        uaName = 'ipad';

        this.websocketFlag = false;
    } else if (userAgent.indexOf('ipod') != -1) {
        uaName = 'ipod';

        this.websocketFlag = false;
    } else if (userAgent.indexOf('safari') != -1) {
        uaName = 'safari';
    } else if (userAgent.indexOf('gecko') != -1) {
        uaName = 'firefox';
    } else if (userAgent.indexOf('opera') != -1) {
        uaName = 'opera';
    } else if (userAgent.indexOf('android') != -1) {
        uaName = 'android';

        this.websocketFlag = false;
    } else if (userAgent.indexOf('mobile') != -1) {
        uaName = 'mobile';
    };
}

//初期状態のスライドのインデックス指定用
SlideStack.prototype.jumpSlide = function(slideIndex){
    if(typeof SLIDE_INFO == "undefined") return;

    $("#page" + _currentIndex).hide();
    _currentIndex = slideIndex;
    $("#page" + _currentIndex).show();

    $('#annotationText').remove();

    var pageNum = parseInt(_currentIndex)+1;
    $('#pageNum').html(pageNum+'/'+SLIDE_INFO.slidenum);
    $('#jquery-ui-slider')
        .slider({
            value: pageNum
        });

//    window.slidestack.fetchEditHistory(SLIDE_INFO.slides[_currentIndex],true);
}

function Searcher(){
    // 表示しているかどうか
    this.display = false;

    // 検索結果のスライド
    this.result = new Array();

    // 表示中のインデックス
    this.resultIndex = 0;

    // 一個前のクエリ
    this.oldQuery = "";

    // メッセージを消すタイマー
    this.hideTimer = null;
};

Searcher.prototype.init = function(){
    $('#slidestackSearcher')
        .css({
            top:-$('#slidestackSearcher').height()
        });

    $('#searcherQuery')
        .off()
        .on('keydown',function(e){
            if(e.keyCode==13){
                var query = $(this).val();
                if(query=="") return;

                window.searcher.doSearch(query);

                return false;
            }
        });
}

Searcher.prototype.showHide = function(){
    if(this.display){
        $('#slidestackSearcher')
            .animate({
                top:-$('#slidestackSearcher').height()
            },300,function(){
                $('#searcherQuery').val('');

                window.searcher.updateResultNum(true);
            });
    }else{
        $('#searcherQuery').focus();
        $('#slidestackSearcher')
            .animate({
                top:"0px"
            },300);
    }
    this.display=!this.display;
}

Searcher.prototype.doSearch = function(query){
    // クエリが一つ前の検索と同じかどうか
    if(window.searcher.oldQuery == query){
        // 同じならばajaxを送信せず，次の結果を表示
        if(window.searcher.result.length==window.searcher.resultIndex){
            // 一周したことを通知
            if(window.searcher.hideTimer){
                clearTimeout(window.searcher.hideTimer);
                window.searcher.hideTimer = null;
            }

            $('#searcherQuery')
                .showBalloon({
                    position:"bottom",
                    tipSize:10,
                    css: {
                        opacity: '1.0',
                        boxShadow: '0px 0px 0px #000'
                    },
                    contents: "wrapped search",
                    showDuration: "show",
                    showAnimation: function(d){ this.fadeIn(d); }
                });

            window.searcher.hideTimer = setTimeout(function(){
                $('#searcherQuery').hideBalloon();
            },2000);

            window.searcher.resultIndex = 0;
        }else{
            window.searcher.updateResultNum();

            // 次を表示
            window.slidestack.jumpSlide(window.searcher.result[window.searcher.resultIndex]);
            window.searcher.resultIndex++;
        }
    }else{
        // ajaxリクエスト送信
        window.searcher.result = [];
        window.searcher.resultIndex = 0;
        window.searcher.oldQuery = query;

        var data = {
            fileid: _pageId,
            searchquery: query
        };
        var successHandler = function(res){
            var parsedRes = $.parseJSON(res);

            $.each(parsedRes,function(){
                window.searcher.result.push(parseInt($('object[data="'+this.slideid+'"]').parent().attr('id').replace("page","")));
            });

            window.searcher.result
                .sort(function(a,b){
                    if( a < b ) return -1;
                    if( a > b ) return 1;
                    return 0;
                });

            if(window.searcher.result.length==0){
                // 見つからなかったことを通知
                if(window.searcher.hideTimer){
                    clearTimeout(window.searcher.hideTimer);
                    window.searcher.hideTimer = null;
                }

                $('#searcherQuery')
                    .showBalloon({
                        position:"bottom",
                        tipSize:10,
                        css: {
                            opacity: '1.0',
                            boxShadow: '0px 0px 0px #000'
                        },
                        contents: "not found",
                        showDuration: "show",
                        showAnimation: function(d){ this.fadeIn(d); }
                    });

                window.searcher.hideTimer = setTimeout(function(){
                    $('#searcherQuery').hideBalloon();
                },2000);

                window.searcher.oldQuery = "";
            }else{
                window.searcher.updateResultNum();

                window.slidestack.jumpSlide(window.searcher.result[window.searcher.resultIndex]);
                window.searcher.resultIndex++;
            }
        };
        window.slidestack.sendRequest("searchonslidestack", data, successHandler);
    }
}

Searcher.prototype.updateResultNum = function(clear){
    if(clear){
        $('#resultNum')
            .html("");
    }else{
        var displayNum = window.searcher.resultIndex+1;
        $('#resultNum')
            .html(displayNum+"/"+window.searcher.result.length);
    }
}

//ランダム文字列生成
var makeRandobet = function(n, b) {
    b = b || '';
    var a = 'abcdefghijklmnopqrstuvwxyz'
        + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        + '0123456789'
        + b;
    a = a.split('');
    var s = '';
    for (var i = 0; i < n; i++) {
        s += a[Math.floor(Math.random() * a.length)];
    }
    return s;
};

// 外部からのインデックスの指定
function settingIndex(index){
    _currentIndex = index;
}

$(window).load(function(){
    window.slidestack = new SlideStack;
    window.slidestack.init();

    window.searcher = new Searcher;
    window.searcher.init();
})