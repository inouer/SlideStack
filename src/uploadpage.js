/**
 * @author inouer
 */

//var _serverURL = location.href;
var _serverURL = "http://" + location.host;

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
    h: 270
};
// paginationのオプション
var paginationOptions = {
    items_per_page:9,
    num_display_entries:7,
    num_edge_entries:2
};

// ドラッグのフラグ
var _draggableFlag = false;

// 設定を行うスライドの情報
var SLIDE_INFO;

//サイズマッピング
var SLIDESTACK_SIZE = {
    0: {
        width: "520px",
        height: "460px"
    },
    1: {
        width: "720px",
        height: "610px"
    },
    2: {
        width: "1000px",
        height: "820px"
    }
};

var EditFeature = {
    ANNOTATIONMEMO: 0
};

function SlideStackManager() {
    this.thumbSize = {
        w:200,
        h:150
    };
};

SlideStackManager.prototype.init = function() {
    this.updateFiles();

    // メニューボタンの設定
    _presentScreen = $('#uploadedFiles');
    $('#menuTop').click(function(){
        $('.menuItems').parent().removeClass("active");

        _presentScreen.hide();
        _presentScreen = $('#uploadedFiles');
        _presentScreen.show();

        window.slidestackmanager.updateFiles();
    })
        .css("cursor","pointer");
    $('#menuUpload').click(function(){
        $('.menuItems').parent().removeClass("active");
        $(this).parent().addClass("active");

        _presentScreen.hide();
        _presentScreen = $('#uploadPage');
        _presentScreen.show();
    })
        .css("cursor","pointer");
    $('#menuSearch').click(function(){
        $('.menuItems').removeClass("active");
        $(this).addClass("active");

        _presentScreen.hide();
        _presentScreen = $('#slideSearch');
        _presentScreen.show();

        window.slidestackmanager.makeSearchPage();
    })
        .css("cursor", "pointer");
};

// スライドスタック一覧更新
SlideStackManager.prototype.updateFiles = function(){
    var data = null;
    var successHandler = function(res){
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
                    "scrolling": "no"
                });
                // サムネイルがクリックされた時の動作
                $(iframe).load(function(){
                    var iframeBody = $(this).contents().find('body');
                    iframeBody
                        .dblclick(function(){
                            _selectedSlide = $(this).attr("data-pageid");
                            window.slidestackmanager.makeManagePage();
                        })
                        .css("cursor","pointer");

                    // スライドのスタックの制御機能をオフにする
                    $(this).contents().find('#slideController').hide();

                    $(this)[0].contentWindow.slidestack.thumbnailModeActivation();
                });

                $(slideDiv).append(iframe);
                $('#uploadedSlides').append(slideDiv);
            }

            return false;
        }
    }

    this.sendRequest("allslide", data, successHandler);
};

// スライドスタック管理機能関係
SlideStackManager.prototype.makeManagePage = function(initIndex){
    var data = {
        'fileid': _selectedSlide,
    };
    var successHandler = function(res){
        var parsedRes = $.parseJSON(res);
        SLIDE_INFO = parsedRes[0];

        // 初期化
        _initSlideIndex = 0;

        // 編集関係のボタンの設定
        // 検索画面の表示非表示
        var toggleFlag = true;
        $('#slideReuseButton')
            .off()
            .on('click',function(){
                if(toggleFlag){
                    $('#slideSearch')
                        .animate({
                            right: "50px",
                            opacity:"show"
                        },300);

                    window.slidestackmanager.makeSearchPage();
                }else{
                    $('#slideSearch')
                        .animate({
                            right: "-900px",
                            opacity:"hide"
                        },300);
                }

                toggleFlag=!toggleFlag;
            });

        // 削除ボタン
        $('#slideDeleteButton').unbind().click(function(){
            if (confirm("Delete？")) {
                var data = {
                    'fileid': _selectedSlide,
                };
                var successHandler = function(res){
                    window.slidestackmanager.updateFiles();

                    _presentScreen.hide();
                    _presentScreen = $('#uploadedFiles');
                    _presentScreen.show();
                };
                window.slidestackmanager.sendRequest("deleteslide", data, successHandler);
            }
        });
        // 設定保存ボタン
        $('#slideSaveButton').unbind().click(function(){
            console.log('save');
        });

        var iframe = document.createElement('iframe');
        $(iframe)
            .attr({
                "src": _serverURL + "/" + _selectedSlide,
                "class": "selectedSlideIframe",
                "frameborder": "0",
                "scrolling": "no",
                "width": SLIDESTACK_SIZE[0].width,
                "height": SLIDESTACK_SIZE[0].height
            })
            .load(function(){
                // 表示するスライド番号
                // _initSlideIndexを初期化するために変数に移す
//                $(this)[0].contentWindow.settingIndex(_initSlideIndex); // この呼出の後ろに書いても実行されない
            });
        $('#selectedSlide').html("");
        $('#selectedSlide').append(iframe);

        // 情報欄の設定
        $('#creationDate').html("date: "+SLIDE_INFO.date);

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
            $(checkbox)
                .attr({
                    "type": "checkbox",
                    "id": i,
                    "checked": SLIDE_INFO.controller[i]
                })
                .change(function(){
                    SLIDE_INFO.controller[$(this).attr("id")] = this.checked;

                    sendSettingInfo();
                })
                .css("cursor","pointer");
            var checkboxLabel = document.createElement('label');
            $(checkboxLabel)
                .attr({
                    "id": i+"-Label",
                    "class": "settingLabel checkbox",
                    "for": i
                })
                .html(i)
                .css("cursor","pointer")
                .append($(checkbox));

            $('#controllerSettingItems').append(checkboxLabel);
        }
        // サイズ関係
        $('#slidestackSize').html("");
        for(var i=0;i<Object.keys(SLIDESTACK_SIZE).length;i++){
            var $radio = $('<input/>');
            $radio
                .attr({
                    "type": "radio",
                    "id": "size"+i,
                    "name":"slidestackSize",
                    "value":i
                })
                .css("cursor","pointer");
            var $label = $('<label></label>');
            $label
                .attr({
                    "class":"settingLabel radio",
                    "for":"size"+i
                })
                .html(SLIDESTACK_SIZE[i].width+" × "+SLIDESTACK_SIZE[i].height)
                .css("cursor","pointer")
                .append($radio);

            $('#slidestackSize').append($label);
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
        // サムネイル生成
        for(var i=0;i<SLIDE_INFO.slides.length;i++){
            var $div = $('<div />');
            $div
                .attr({
                    'class': "slideThumbnail",
                    'data-index':i,
                    'data-id':SLIDE_INFO.slides[i],
                    'data-thumbnailid': SLIDE_INFO.originalslides[i]
                })
                .css({
                    width:window.slidestackmanager.thumbSize.w,
                    height:window.slidestackmanager.thumbSize.h
                })
                .click(function(){
                    _initSlideIndex=parseInt($(this).attr('data-index'));
                    $(iframe)[0].contentWindow.slidestack.jumpSlide(_initSlideIndex);
                    return false;
                });

            var $object = $('<object />');
            $object
                .attr({
                    'type': "image/jpeg",
                    'data': _serverURL+"/slideimage?fileid="+SLIDE_INFO.pageid+"&filename="+SLIDE_INFO.originalslides[i]
                })
                .css({
                    position:"relative",
                    top:"0px",
                    left:"0px",
                    width:'100%' ,
                    height:'100%',
                    "z-index":1
                })
                .load(function(){
                    // 中身がhtmlかsvgの場合はzoomを使って大きさ調整
                    $(this).contents().find('html')
                        .css({
                            zoom:"27.5%"
                        });

                    $(this).contents().find('svg')
                        .css({
                            zoom:"27.5%"
                        });
                })
                .appendTo($div);

            var $overlapDiv = $('<div />');
            $overlapDiv
                .css({
                    position:"relative",
                    "margin-top":-window.slidestackmanager.thumbSize.h,
                    top:"0px",
                    left:"0px",
                    width:'100%',
                    height:'100%',
                    "z-index":2
                })
                .appendTo($div);

            $('div#slidestackThumbnails').append($div);
        }
        // sortable化
        $('div#slidestackThumbnails').sortable({
            revert: true,
            distance: 2,
//            axis:"y",
            containment:"#slidestackThumbnails",
            cursorAt:{
                left:-5
            },
            receive: function(e, ui){
            },
            over: function(e, ui){
            },
            update: function(e, ui){
                // 順番が変わったらサーバに送信
                var childrenList = $(e.target).children();
                SLIDE_INFO.slides.length=0;
                SLIDE_INFO.originalslides.length = 0
                for(var i=0;i<childrenList.length;i++){
                    SLIDE_INFO.slides.push($(childrenList[i]).attr('data-id'));
                    SLIDE_INFO.originalslides.push($(childrenList[i]).attr('data-thumbnailid'));
                }
                SLIDE_INFO.slidenum=SLIDE_INFO.slides.length;
                sendSettingInfo();
            }})
            .disableSelection();

        _presentScreen.hide();
        _presentScreen = $('#slideManage');
        _presentScreen.show();
    };
    this.sendRequest("slideinfo", data, successHandler);
}

SlideStackManager.prototype.makeSearchPage = function(){
    $('#searchSubmitButton').unbind().click(function(){
        doSearch($('#searchForm').val());
    });

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
                window.slidestackmanager.makeManagePage();
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
        }
    });

    $('#slideSearch').unbind().disableSelection()

    $('#searchForm').unbind()
        .keydown(function(e){
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

    var data = {
        'searchquery': searchQuery
    };
    var successHandler = function(res){
        // 検索レスポンス時間計測
        var end = new Date();
        var searchTime = end.getTime()-start.getTime();
        console.log('search time: '+searchTime+" ms");
        _allTime+=searchTime;

        // 初期化
        $('#searchedSlides').html("");

        var parsedRes = $.parseJSON(res);
        console.log(parsedRes);

        $('#searchMessage').html("query is \'"+searchQuery+"\': "+parsedRes.length+" slides<br>" +
//            "検索ドキュメント数: "+_slidestackNum+", "+
//            "検索スライド枚数: "+_allSlidePageNum+"<br>" +
            "search time: "+searchTime+"ms");

        for(var i=0;i<parsedRes.length;i++){
            var div = document.createElement('div');
            $(div)
                .attr({
                    "id": parsedRes[i].slideid,
                    "class": "searchResult",
                    'data-id':parsedRes[i].slideid
                })
                .click(function(){
                    if(!_draggableFlag){
                        // クリックされたらスライドスタックへ
                        var selectedId = $(this).attr("id").split("-");
                        _selectedSlide = selectedId[0];
                        _initSlideIndex = parseInt(selectedId[1]);
                        window.slidestackmanager.makeManagePage();
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
                    }
                })
                .css("cursor","pointer");

            var $object = $('<object />');
            $object.attr({
                'class': "searchResultImage",
                'type': parsedRes[i].slidetype,
                'data': parsedRes[i].slideid
            });

            $(div).append($object);
            $('#searchedSlides').append(div);
        };
    };
    window.slidestackmanager.sendRequest("searchslides", data, successHandler);
};

// 設定情報送信
var sendSettingInfo = function(){
    $.ajax({
        url: _serverURL+'/updatesetting',
        type: "GET",
        data: {setting: JSON.stringify(SLIDE_INFO)},
        success: function(res){
            console.log(res);

            window.slidestackmanager.makeManagePage();
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

// サーバとの通信を抽象化
SlideStackManager.prototype.sendRequest = function(url, data, successHandler){
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

function FileUploader(){
    // 加藤君の変換サーバのURL
    this.convertServer = "http://winter.ics.nitech.ac.jp:8070"

    // アップロードするファイルを格納
    this.uploadFiles;

    // アップロード中かどうか
    this.isUploading = false;

    // インターフェースの状態
    this.PageState = {
        SELECT: 0,
        UPLOADING: 1
    };
};

FileUploader.prototype.init = function(){
    // アップロードインターフェイスの構築

    // holder部分の通常動作をキャンセル
    $("#holder")
        .bind("dragover", function(){
            return false;
        })
        .bind("dragend", function(){
            return false;
        });

    // D&Dでアップロード
    $(window)
        .bind("drop", function(e){
            if(typeof e != "undefined"){
                e.preventDefault();
                window.fileuploader.handleFiles(e.originalEvent.dataTransfer.files);
            }

            if (confirm("Upload?")) {
                // アップロード開始
                var isAbort = false;

                // インターフェースの状態を変更
                window.fileuploader.updatePageState(window.fileuploader.PageState.UPLOADING);
                window.fileuploader.isUploading = true;

                // アップロードするファイル
                var files = window.fileuploader.uploadFiles;
                // ファイル数
                var fileNum = window.fileuploader.uploadFiles.length;
                // エラーが起きたファイルのファイル名
                var errFiles = "";

                // プログレスバー開始
                var counter=0;
                var progressTimer = setInterval(function() {
                    var nowValue = parseFloat($('#uploadProgressbar').attr('value'));
                    var maxValue = (counter+1)/fileNum*100
                    if(nowValue<maxValue){
                        $('#uploadProgressbar').attr('value',nowValue+0.02);
                    }
                }, 50);
                $("#progressmsg").text("...（" + counter + " / " + fileNum + "）");

                // 複数ファイルのアップロードに対応
                for (var i = 0; i < fileNum; i++) {
                    if (isAbort) {
                        break;
                    }

                    var randomId = makeRandobet(32);

                    var file = window.fileuploader.uploadFiles[i];

                    // 加藤君のサーバに送信
                    var fd = new FormData();
                    fd.append('files',file);

                    $.ajax({
                        url: window.fileuploader.convertServer+'/sliderep/convert',
                        type: 'POST',
                        data: fd,
                        processData: false,
                        contentType: false,

                        success: function (data, textStatus, jqXHR) {
//                            alert('Success file upload.');
                            // SVG化されたスライドのURLを取得
                            var parsedData = JSON.parse(decodeURIComponent(data));
                            console.log(parsedData);

                            // SlideStackのサーバに送信
                            var fd2 = new FormData();
                            fd2.append("file", file);
                            fd2.append("randomid", randomId);
                            fd2.append("user", "tempUser");
                            fd2.append("page", i+1);
                            fd2.append("slidenum", fileNum);
                            fd2.append("svgurls", parsedData[0].urls)

                            $.ajax({
                                url: _serverURL+'/upload',
                                type: "POST",
                                data: fd2,
                                processData: false,
                                contentType: false,
                                success: function(res){
                                    counter++;
                                    $("#progressmsg").text("処理中...（" + counter + " / " + fileNum + "）");
                                    $('#uploadProgressbar').attr('value',counter/fileNum*100);
                                    if (counter == fileNum) {
                                        setTimeout(function(){
                                            window.fileuploader.isUploading = false;
                                            window.fileuploader.updatePageState(window.fileuploader.PageState.SELECT);

                                            $('.menuItems').parent().removeClass("active");

                                            window.slidestackmanager.updateFiles();

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

                                    counter++;
                                    errFiles+=" "+file.name;

//                        if (confirm("「" + file.name + "」はエラーが発生したためアップロードできませんでした。アップロードを続けますか？")) {
//                        }
//                        else {
//                            $('#uploadProgressbar').attr('value','1');
//
//                            // 中止
//                            isAbort = true;
//                            window.fileuploader.updatePageState(window.fileuploader.PageState.SELECT);
//                            window.fileuploader.isUploading = false;
//                        }
                                }
                            });
                        },
                        error: function() {
                        }
                    });
                }

                if(errFiles.length!=0){
                    alert("error files: "+errFiles);
                }
            }
            return false;
        });

    $("#selector")
        .change(function(){
            window.fileuploader.handleFiles(this.files);

            $(window).trigger('drop');
        });
}

// ファイルハンドラ
FileUploader.prototype.handleFiles = function(files){
    if (files.length == 0) {
        return;
    }

    this.uploadFiles = files;
}

// アップロードに関する通知の制御
FileUploader.prototype.updatePageState = function(mode){
    switch (mode) {
        case window.fileuploader.PageState.SELECT:
            $("#fileSelect").show();
            $("#uploadState").hide();

            $("#selector").get(0).value = "";
            $("#preview").empty();
            break;
        case window.fileuploader.PageState.UPLOADING:
            $("#fileSelect").hide();
            $("#uploadState").show();

            break;
    };
}

$(function(){
    window.slidestackmanager = new SlideStackManager;
    window.slidestackmanager.init();

    window.fileuploader = new FileUploader;
    window.fileuploader.init();
});