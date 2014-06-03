/**
 * @author inouer
 */

//var _serverURL = location.href;
var _serverURL = "http://" + location.host;

var _uploadFiles;
var _previewedNum;
var _isUploading;
var _presentScreen;
var _selectedSlide;
var _editFeatureSelectedFlag = false;
var _annotations = new Array();
// 全スライドスタックの情報
var _allSlidestackInfo;
// この変数をいじればスライドスタックの編集画面の初期スライドを設定可能
var _initSlideIndex=0;
// スライドスタック数
var _slidestackNum=0;
// 全スライドのページ数
var _allSlidePageNum=0;
var _slideThumbnailSize = {
		w: 360,
		h: 270,
};
// paginationのオプション
var paginationOptions = {
		items_per_page:8,
		num_display_entries:7,
		num_edge_entries:2,
};

// ドラッグのフラグ
var _draggableFlag = false;

// 設定を行うスライドの情報
var SLIDE_INFO;

//サイズマッピング
var SLIDESTACK_SIZE = {
		0: {
			width: "520px",
			height: "460px",	
		},
		1: {
			width: "720px",
			height: "610px",			
		},
		2: {
			width: "1000px",
			height: "820px",			
		},
};

var PageState = {
    SELECT: 0,
    UPLOADING: 1,
};

var EditFeature = {
		ANNOTATIONMEMO: 0
};

$(window).load(function() {
	updateFiles();
	
	// holder部分の通常動作をキャンセル
    $("#holder").bind("dragover", function(){
        return false;
    }).bind("dragend", function(){
        return false;
    });
    
    // D&Dでアップロード
    $(window).bind("drop", function(e){
        e.preventDefault();
        handleFiles(e.originalEvent.dataTransfer.files);
        
        if (confirm("アップロードしても良いですか？")) {
            upload();
        }
        return false;
    });
    
    $("#selector").change(function(){
        handleFiles(this.files);
    });
    
    // メニューボタンの設定
	_presentScreen = $('#uploadedFiles');
    $('#menuManage').click(function(){
    	_presentScreen.hide();
    	_presentScreen = $('#uploadedFiles');
    	_presentScreen.show();
    	
    	updateFiles();
    })
    .css("cursor","pointer");
    $('#menuUpload').click(function(){
    	_presentScreen.hide();
    	_presentScreen = $('#uploadPage');
    	_presentScreen.show();    	
    })
    .css("cursor","pointer");
    $('#menuSearch').click(function(){
    	_presentScreen.hide();
    	_presentScreen = $('#slideSearch');
    	_presentScreen.show();    	
    	
    	makeSearchPage();
    })
    .css("cursor", "pointer");
    
	
})

var handleFiles = function(files){
    if (files.length == 0) {
        return;
    }
    
    _uploadFiles = files;
    _previewedNum = 0;
};

// アップロードに関する通知の制御
function updatePageState(mode){
    switch (mode) {
        case PageState.SELECT:
            $("#fileSelect").show();
            $("#uploadState").hide();
            
            $("#selector").get(0).value = "";
            $("#preview").empty();
            break;
        case PageState.UPLOADING:
            $("#fileSelect").hide();
            $("#uploadState").show();
            
            break;
    }
}

// スライドのアップロード
var upload = function(){
    var isAbort = false;
    
    updatePageState(PageState.UPLOADING);
    _isUploading = true;
    
    var files = _uploadFiles;
        
    // スライドのアップロード
    var counter=0;
    var progressTimer = setInterval(function() {
    	var nowValue = $('#uploadProgressbar').attr('value');
    	var maxValue = (counter+1)/_uploadFiles.length*100
    	if(nowValue<maxValue){
        	$('#uploadProgressbar').attr('value',nowValue+0.05);          		
    	}    	
    }, 50);
    $("#progressmsg").text("処理中...（" + counter + " / " + _uploadFiles.length + "）");
    
    for (var i = 0; i < _uploadFiles.length; i++) {
        if (isAbort) {
            break;
        }

        var randomId = makeRandobet(32);
        
        var file = _uploadFiles[i];
        var fd = new FormData();
        fd.append("file", file);
        fd.append("randomid", randomId);
        fd.append("user", "tempUser");
        fd.append("page", i+1);
        fd.append("slidenum", _uploadFiles.length);
        
        $.ajax({
            url: _serverURL+'/upload',
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function(res){
            	counter++;
                $("#progressmsg").text("処理中...（" + counter + " / " + _uploadFiles.length + "）");
            	$('#uploadProgressbar').attr('value',counter/_uploadFiles.length*100);
            	if (counter == _uploadFiles.length) {
            		setTimeout(function(){                    	
            			_isUploading = false;
            			updatePageState(PageState.SELECT);

            			updateFiles();

            			_presentScreen.hide();
            			_presentScreen = $('#uploadedFiles');
            			_presentScreen.show();

                    	$('#uploadProgressbar').attr('value','1');
                    	counter=0;
                    	clearInterval(progressTimer);
            		},1000);
            	}        
            },
            error: function(xhr, textStatus, errorThrown){
                console.log(xhr);
                console.log(textStatus + ": " + errorThrown);
                                
                if (confirm("「" + file.name + "」はエラーが発生したためアップロードできませんでした。アップロードを続けますか？")) {
                }
                else {
                	$('#uploadProgressbar').attr('value','1');
                	
                    // 中止
                    isAbort = true;
                    updatePageState(PageState.SELECT);
                    _isUploading = false;
                }
            }
        });
    }
};

// スライドの削除
var deleteSlide = function(){
	$.ajax({
        url: _serverURL+'/deleteslide',
        type: "GET",
        data: {fileid: _selectedSlide},
        success: function(res){
			updateFiles();

			_presentScreen.hide();
			_presentScreen = $('#uploadedFiles');
			_presentScreen.show();    	
        }
    });
};

// スライドスタック一覧更新
var updateFiles = function(){
	 $.ajax({
         url: _serverURL+'/allslide',
         type: "GET",
         success: function(res){
        	 // 初期化
        	 $('#uploadedSlides').html("");

        	 _allSlidestackInfo = $.parseJSON(res);

        	 if(_allSlidestackInfo.lenght==0){
        		 return;
        	 }

        	 _slidestackNum=_allSlidestackInfo.length;
        	 _allSlidePageNum = 0;
        	 for(var i=0;i<_allSlidestackInfo.length;i++){
        		 // 全スライドのページ数を保存
        		 _allSlidePageNum += _allSlidestackInfo[i].slidenum;
        	 }

    		 // Pagination
        	 paginationOptions.callback = pageselectCallback;
    		 $("#pagination").pagination(_allSlidestackInfo.length, paginationOptions);
    		 function pageselectCallback(page_index, jq){
                 var items_per_page = paginationOptions.items_per_page;
                 var max_elem = Math.min((page_index+1) * items_per_page, _allSlidestackInfo.length);

        		 $('#uploadedSlides').html("");
                 for(var i=page_index*items_per_page;i<max_elem;i++)
                 {
            		 var slideDiv = document.createElement('div');
            		 $(slideDiv).attr("class", "slideDiv");

            		 var iframe = document.createElement('iframe');
            		 $(iframe).attr({
            			 "src": _serverURL + "/" + _allSlidestackInfo[i].pageid,
            			 "class": "slideIframe",
            			 "frameborder": "0", 
            			 "scrolling": "no",
            		 });
            		 // サムネイルがクリックされた時の動作
            		 $(iframe).load(function(){            			 
            			 var iframeBody = $(this).contents().find('body');
            			 iframeBody.dblclick(function(){
            				 _selectedSlide = $(this).attr("data-pageid");
            				 makeManagePage();
            			 })
            			 .css("cursor","pointer");

            			 // スライドのスタックの制御機能をオフにする
            			 $(this).contents().find('#slideController').hide();

            			 $(this)[0].contentWindow.thumbnailModeActivation();
            		 });
            		 
            		 $(slideDiv).append(iframe);
            		 $('#uploadedSlides').append(slideDiv);
                 }

                 return false;
              }
         }
     });
}

// スライドスタック管理機能関係
var makeManagePage = function(initIndex){	 	
	// スライドの情報を取得してから設定するもの
	$.ajax({
		url: _serverURL+'/slideinfo',
		type: "GET",
		data: {fileid: _selectedSlide},
		success: function(res){
    		var parsedRes = $.parseJSON(res);
    		SLIDE_INFO = parsedRes[0];
			    		
			// 編集関係のボタンの設定
		    // 検索画面の表示非表示
		    $('#slideReuseButton').unbind().toggle(
		    		function(){
		    			$('#slideSearch').animate({
		    				right: "50px"
		    			},300);

		    	    	makeSearchPage();
		    		},
		    		function(){
		    			$('#slideSearch').animate({
		    				right: "-900px"
		    			},300);
		    		}
		    )
		    .css("cursor","pointer");
		    $('#slideDeleteButton').unbind().click(function(){
		        if (confirm("このスライドスタックを削除してもよろしいですか？")) {
		        	deleteSlide();
		        }
		    })
		    .css("cursor","pointer");
		    $('#slideSaveButton').unbind().click(function(){
		    	console.log('save');
		    })
		    .css("cursor","pointer");

		    var iframe = document.createElement('iframe');
		    $(iframe).attr({
		    	"src": _serverURL + "/" + _selectedSlide,
		    	"class": "selectedSlideIframe",
		    	"frameborder": "0",
		    	"scrolling": "no",
		    	"width": SLIDESTACK_SIZE[0].width,
		    	"height": SLIDESTACK_SIZE[0].height,    	
		    })
		    .load(function(){
		    	// 表示するスライド番号
		    	// _initSlideIndexを初期化するために変数に移す
		    	var initSlideIndex = _initSlideIndex;
		    	_initSlideIndex=0;
		    	$(this)[0].contentWindow.settingIndex(initSlideIndex); // この呼出の後ろに書いても実行されない
		    });
		    $('#selectedSlide').html("");
		    $('#selectedSlide').append(iframe);
		    
    		// 情報欄の設定
    		$('#creationDate').html("アップロード: "+SLIDE_INFO.date);
    		
		    // タグの設定
		    $('#slidestackTagText').val("<iframe src=\""+_serverURL+"/"+_selectedSlide+"\"" +
		    		" frameborder=\"0\"" +
		    		" scrolling=\"no\"" +
		    		" width=\""+SLIDESTACK_SIZE[SLIDE_INFO.size].width+"\"" +
		    		" height=\""+SLIDESTACK_SIZE[SLIDE_INFO.size].height+"\"></iframe>")
		    .click(function(){
		    	$(this).select();
		    });
		    
		    // 設定項目の設定
		    // コントローラ関係
		    $('#controllerSettingItems').html("");
		    for(var i in SLIDE_INFO.controller){
			    var checkbox = document.createElement('input');
			    $(checkbox).attr({
			    	"type": "checkbox",
			    	"id": i,
			    	"checked": SLIDE_INFO.controller[i],
			    })
			    .change(function(){
			    	SLIDE_INFO.controller[$(this).attr("id")] = this.checked;	
			    	
			    	sendSettingInfo();
			    })
			    .css("cursor","pointer");
			    var checkboxLabel = document.createElement('label');
			    $(checkboxLabel).attr({
			    	"id": i+"-Label",
			    	"class": "settingLabel",
			    	"for": i,
			    })
			    .html(i)
			    .css("cursor","pointer");
			    
			    $('#controllerSettingItems').append(checkbox).append(checkboxLabel);
		    }
		    // サイズ関係
		    $('#slidestackSize').html("");
		    for(var i=0;i<Object.keys(SLIDESTACK_SIZE).length;i++){
			    $('<input/>').attr({
			    	"type": "radio",
			    	"id": "size"+i,
			    	"name":"slidestackSize",
			    	"value":i,
			    })
			    .css("cursor","pointer")
			    .appendTo($('#slidestackSize'));	
			    $('<label></label>').attr({
			    	"class":"settingLabel",
			    	"for":"size"+i,
			    })
			    .html(SLIDESTACK_SIZE[i].width+" × "+SLIDESTACK_SIZE[i].height)
			    .css("cursor","pointer")
			    .appendTo($('#slidestackSize'));
		    }
		    $('#slidestackSize [name=slidestackSize]')
		    .val([SLIDE_INFO.size])
		    .change(function(){
		    	SLIDE_INFO.size = $(this).val();

		    	sendSettingInfo();
		    });
		    
		    // サムネイル欄
		    // 初期化
		    $('div#slidestackThumbnails').html("");
		    for(var i=0;i<SLIDE_INFO.slides.length;i++){
		    	console.log(SLIDE_INFO);
		    	$('<div></div>')
			    .html('<img src="'+_serverURL + "/slideimage?fileid=" + SLIDE_INFO.pageId + "&filename=" + SLIDE_INFO.slides[i] + ".jpg"+'" class="slideThumbnail"></img>')
			    .attr({
			    	'data-index':i,
			    	'data-id':SLIDE_INFO.slides[i],
		    	})
		    	.click(function(){
		    		_initSlideIndex=parseInt($(this).attr('data-index'));
		    		$(iframe)[0].contentWindow.location.reload(true);
		    	    return false;
		    	})
			    .appendTo($('div#slidestackThumbnails'));
		    }		    		    
		    $('div#slidestackThumbnails').sortable({
		    	revert: true,
		    	distance: 5,
		    	receive: function(e, ui){
		    	},
		    	over: function(e, ui){
		    	},
		    	update: function(e, ui){
		    		// 順番が変わったらサーバに送信
		    		var childrenList = $(e.target).children();
	    			SLIDE_INFO.slides.length=0;
		    		for(var i=0;i<childrenList.length;i++){
		    			SLIDE_INFO.slides.push($(childrenList[i]).attr('data-id'));
		    		}
		    		SLIDE_INFO.slidenum=SLIDE_INFO.slides.length;
		    		sendSettingInfo();   		
		    	},
		    })
		    .disableSelection();
		    
			_presentScreen.hide();
			_presentScreen = $('#slideManage');
			_presentScreen.show();
		},
		error: function(xhr, textStatus, errorThrown){
			console.log(xhr);
			console.log(textStatus + ": " + errorThrown);

			console.log('スライド情報取得エラー');
		}
	});
}

var makeSearchPage = function(){
    $('#searchSubmitButton').unbind().click(function(){
    	doSearch($('#searchForm').val());
    })
    .css("cursor","pointer");
    
    $(window).scroll(function(){
        var $this = $(this);
        $('#slidestackMaker').css('top', -$this.scrollTop());
    });
    
    // スライドスタックドロップ欄の表示非表示
//    $('#slidestackMakerButton').unbind().toggle(
//    		function(){
//    			$('#slidestackMaker').animate({
//    				right: "0px"
//    			},300);
//    			
//    			$(this).attr("src", "./img/right_arrow.png");
//    			
//    			$('.searchResult').css("margin","10px 10px 10px 10px");
//    		},
//    		function(){
//    			$('#slidestackMaker').animate({
//    				right: "-500px"
//    			},300);
//    			
//    			$(this).attr("src", "./img/left_arrow.png");
//
//    			$('.searchResult').css("margin","10px 50px 10px 50px");
//    		}
//    )
//    .css("cursor","pointer");
//
    // スライドスタックの生成ボタンの設定
    $('#slidestackMakerSubmitButton').unbind().click(function(){
    	// sortableのidリストが空値になるので無理矢理URLからidリスト作成
    	var sortableIdList = new Array();
    	var childrenList = $('#slidestackMakerHolder').children();
    	for(var i=0;i<childrenList.length;i++){
    		var imgURL = $($(childrenList[i]).children()[0]).attr("src");
    		var imgId = imgURL.split('=').pop().split('.')[0];
    		sortableIdList.push(imgId);    		
    	}
    	
    	$.ajax({
    		url: _serverURL+'/makess',
    		type: "GET",
    		data: {slides: JSON.stringify(sortableIdList)},
    		success: function(res){
				 _selectedSlide = res;
				 makeManagePage();
    		}
    	});	
    })
    .css("cursor","pointer");
    
    $('#slidestackMakerHolder').sortable({
    	revert: true,
    	distance: 5,
    	receive: function(e, ui){
    		var bodyH = $('body').height();
    		var newH = (_slideThumbnailSize.h+20)*$(this).sortable("toArray").length;
    		if(bodyH<newH){
    			$('body').height(newH);
    		}
    	},
    	over: function(e, ui){
    		var thisH = $(this).height();
    		var newH = (_slideThumbnailSize.h+20)*$(this).sortable("toArray").length;
    		if(thisH<newH){
    			$(this).height(newH);    			
    		}    		
    	},
    });
    
    $('#slideSearch').unbind().disableSelection()
    
    $('#searchForm').unbind().keydown(function(e){
        if(e.keyCode == 13){
        	doSearch($('#searchForm').val());  
            return false;
        }
    })
    .click(function(){
		$(this).select();
	});
}

var doSearch = function(searchQuery){
	if(searchQuery == ""){
		return;
	}
	
	// 検索レスポンス時間計測
	var start = new Date();
	$.ajax({
		url: _serverURL+'/searchslides',
		type: "GET",
		data: {searchquery: searchQuery},
		success: function(res){
			// 検索レスポンス時間計測
			var end = new Date();
			var searchTime = end.getTime()-start.getTime();
			console.log('search time: '+searchTime+" ms");
			_allTime+=searchTime;
			
			// 初期化
			$('#searchedSlides').html("");
			
			var parsedRes = $.parseJSON(res);

			$('#searchMessage').html("\'"+searchQuery+"\'の検索結果: "+parsedRes.length+"件<br>" +
					"検索ドキュメント数: "+_slidestackNum+", "+
					"検索スライド枚数: "+_allSlidePageNum+"<br>" +
					"検索時間: "+searchTime+"ms");

			for(var i=0;i<parsedRes.length;i++){
				var div = document.createElement('div');
				$(div).attr({
					"id": parsedRes[i].slideid,
					"class": "searchResult", 
			    	'data-id':parsedRes[i].slideid,
				})
				.click(function(){
					if(!_draggableFlag){
						// クリックされたらスライドスタックへ
						var selectedId = $(this).attr("id").split("-");
						_selectedSlide = selectedId[0];
						_initSlideIndex = parseInt(selectedId[1]);
						makeManagePage();						
					}
				})
				.draggable({
			        connectToSortable: '#slidestackThumbnails',
			        helper: 'clone',
					revert: 'invalid',
					start: function(e, ui){
						_draggableFlag=true;
					},
//					drag: loupeDragging,
					stop: function(e, ui){
						_draggableFlag=false;
					},
				})
				.css("cursor","pointer");
				var img = document.createElement('img');
				$(img).attr({
					"src": _serverURL + "slideimage?fileid=" + parsedRes[i].pageid + "&filename=" + parsedRes[i].slideid + ".jpg",
					"class": "searchResultImage",
				});

				$(div).append(img);
				$('#searchedSlides').append(div);				
			}
		}
	});	
}

// 設定情報送信
var sendSettingInfo = function(){
	$.ajax({
		url: _serverURL+'/updatesetting',
		type: "GET",
		data: {setting: JSON.stringify(SLIDE_INFO)},
		success: function(res){
			console.log(res);
			
			makeManagePage();
		}
	});	
}

// ランダム文字列生成
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

var _allTime=0;
// 連続検索（評価）
// 引数 → 検索回数，クエリの数
var test = function(searchNum, queryNum){
	var counter = 1;
	_allTime=0;
	
	if(typeof queryNum=="undefined"){		
		timer_id = setInterval(function(){
			console.log(counter+"回目");
			doSearch("Web");
			if (counter == searchNum+1) {
				clearInterval(timer_id);
				var average = _allTime/searchNum;
				console.log("search time average: "+average+"ms");
			}
			counter++;
		}, 2000);
	}else{
		var query="";
		for(var i=0;i<queryNum;i++){
			query += "Web ";
		}
		
		timer_id = setInterval(function(){
			console.log(counter+"回目");
			doSearch(query);	
			if (counter == searchNum) {
				clearInterval(timer_id);
				var average = _allTime/searchNum;
				console.log("search time average: "+average+"ms");
			}
			counter++;
		}, 2000);		
	}
}
