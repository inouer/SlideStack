var querystring = require("querystring"), 
	fs = require("fs"), 
	formidable = require("formidable"), 
	path = require('path'),
	exec = require('child_process').exec,
	libxmljs = require('libxmljs'),
	execSync = require('exec-sync'),
    httprequest = require('request');

// サーバのホスト名
var _serverURL = 'http://localhost:4000/';

// WFE-SのURL
//var _WFESURL = 'http://localhost:8086';
var _WFESURL = 'http://wfesvg.appspot.com'
var _WFESUploadURL = _WFESURL+'/upload';

/* MongoDB */
var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://localhost/myslidedb');
var editSchema = new mongoose.Schema({
	pageid: String,
	slideid: String,
    feature: Number,
    x: Number,
    y: Number,
    w: Number,
    h: Number,
    contents: String,
    color: String,
    fontsize: Number,
});
editSchema = db.model('editSchema', editSchema);

var slideSchema = new mongoose.Schema({
	pageid: String,
	slidenum: Number,
	controller:{
		annotation: Boolean,
        commentview: Boolean,
        pointer: Boolean,
		sendpage: Boolean,
		autosendpage: Boolean,
		presentationmode: Boolean
	},
	size: String,
	slides: [String],
	date: String,
    type: String,
    originalslides: [String]
});
slideSchema = db.model('slideSchema', slideSchema);

var textSchema = new mongoose.Schema({
	pageid: String,
    slidetype: String,
	slideid: String,
	type: String,
	text: String,
});
textSchema = db.model('textSchema', textSchema);

var commentSchema = new mongoose.Schema({
    pageid: String,
    text: String,
    date: String
});
commentSchema = db.model('commentSchema',commentSchema);

var slideFileDir = './files/';

// htmlとjsを返す
function start(response, request, pathname, query) {
    if (pathname == "/") {
        pathname = "/index.html";
    }

    // 拡張子
    var fileExtension = getFileExtension(pathname);
    
    fs.readFile("." + pathname, function(error, file) {
        if (error) {
            response.writeHead(500, {
                "Content-Type" : "text/plain"
            });
            response.write(error + "\n");
            response.end();
        } else {
            if(fileExtension == "html"){             
                response.writeHead(200, {
                    "Content-Type" : "text/html"
                });   
            } else if(fileExtension == "js"){  
                response.writeHead(200, {
                    "Content-Type" : "text/javascript"
                });                   
            } else if(fileExtension == "css"){
                response.writeHead(200, {
                    "Content-Type" : "text/css"
                });   
            } else {
                response.writeHead(200, {
                    "Content-Type" : "text/plain"
                });         
            }
            
            response.write(file);
            response.end();
        }
    });
}

// 画像ファイルを返す
function image(response, request, pathname, query){
    fs.readFile("." + pathname, "binary", function(error, file) {
        if (error) {
            response.writeHead(500, {
                "Content-Type" : "text/plain"
            });
            response.write(error + "\n");
            response.end();
        } else {
            var stat = fs.statSync("." + pathname);
            response.writeHead(200, {
                "Content-Type" : "image/png",
                "Content-Length" : stat.size
            });
            response.write(file, "binary");
            response.end();
        }
    });
}

// スライドページのHTMLを返す
function slidepage(response, request, pathname, query) {
    var fileId = pathname.replace("/","");
    
    slideSchema.find({pageid: fileId}, function(err, docs) {
    	if(docs.length!=0){
            fs.readFile("./slidepage.html", function(error, file) {
                if (error) {
                    response.writeHead(500, {
                        "Content-Type" : "text/plain"
                    });
                    response.write(error + "\n");
                    response.end();
                } else {
                    response.writeHead(200, {
                        "Content-Type" : "text/html"
                    });
                    response.write(file);
                    response.end();
                }
            });    		
    	}else{
            console.log("Page not found: " + pathname);
            response.writeHead(404, {
                "Content-Type" : "text/html"
            });
            response.write("404 Not found");
            response.end();
    	}
	});
}

// スライドのアップロード処理
function upload(response, request, pathname, query) {
    var form = new formidable.IncomingForm();
    
    form.parse(request, function(error, fields, files) {
        var fileId = fields.randomid;

        var svgURLs = fields.svgurls.split(',');
        console.log(svgURLs);

        // 拡張子
        var fileExtension = getFileExtension(files.file.name);
        // ファイル名
        var newFileName = fileId + "." + fileExtension;

        fs.rename(files.file.path, "./tmp/" + newFileName, function(err) {
            if (err) {
                console.log(err);
                fs.unlink("./tmp/" + newFileName);
                fs.rename(files.file.path, "./tmp/" + newFileName);
            }
        });

        // 画像変換，XML抽出，一時ファイル消去処理のコマンド実行
        var jodCommand = 'java -jar ./jodconverter-2.2.2/lib/jodconverter-cli-2.2.2.jar ./tmp/' + newFileName + ' ./tmp/' + fileId + '.pdf';
        var mkdirCommand = 'mkdir ' + slideFileDir + fileId;
        var convertCommand = 'convert ./tmp/' + fileId + '.pdf ' + slideFileDir + fileId + '/' + fileId + '.jpg';
        var changeToZipCommand = 'mv ./tmp/' + newFileName + ' ./tmp/' + fileId + '.zip';
        var unzipCommand = 'unzip ./tmp/' + fileId + '.zip -d ' + './tmp/' + fileId;
        var rmTmpCommand = 'rm ./tmp/' + fileId + '.* | rm -r ./tmp/' + fileId;
        var countSlidesCommand = 'ls ' + slideFileDir + fileId + '/*.jpg -1 | wc -l';

        var fetchXMLCommand;
        if (newFileName.indexOf('ppt') != -1) {
            fetchXMLCommand = 'cp -r ./tmp/' + fileId + '/ppt/slides ' + slideFileDir + fileId;
        }

        // ネストして順に処理（ネスト地獄）
        exec(jodCommand + ' | ' + mkdirCommand, function(err, stdout, stderr) {
            if (err) {
                console.log("err=" + err);
                console.log("stdout=" + stdout);
                console.log("stderr=" + stderr);
            }

            exec(convertCommand, function(err, stdout, stderr) {
                if (err) {
                    console.log("err=" + err);
                    console.log("stdout=" + stdout);
                    console.log("stderr=" + stderr);
                }

                exec(changeToZipCommand + " | " + unzipCommand, function(err, stdout, stderr) {
                    if (err) {
                        console.log("err=" + err);
                        console.log("stdout=" + stdout);
                        console.log("stderr=" + stderr);
                    }

                    exec(fetchXMLCommand, function(err, stdout, stderr) {
                        if (err) {
                            console.log("err=" + err);
                            console.log("stdout=" + stdout);
                            console.log("stderr=" + stderr);
                        }

                        exec(rmTmpCommand, function(err, stdout, stderr) {
                            if (err) {
                                console.log("err=" + err);
                                console.log("stdout=" + stdout);
                                console.log("stderr=" + stderr);
                            }

                            exec(countSlidesCommand, function(err, stdout, stderr) {
                                if (err) {
                                    console.log("err=" + err);
                                    console.log("stdout=" + stdout);
                                    console.log("stderr=" + stderr);
                                }

                                // スライド情報の記録
                                // スライド枚数
                                var fileNum = stdout.split(" ");
                                fileNum = parseInt(fileNum[fileNum.length - 1].split("\n")[0]);

                                // スライドのURLのリスト
                                var slideIdList = new Array();
                                // WFE-Sにリクエストを送信
                                for(var i=0;i<svgURLs.length;i++){
                                    if(svgURLs[i].indexOf('index.html') != -1){
                                        continue;
                                    }

                                    // url以外は適当
                                    var options = {
                                        uri: _WFESUploadURL,
                                        form: {
                                            url : svgURLs[i] ,
                                            host : 'http://winter.ics.nitech.ac.jp/~toralab/sliderep/data/slidestack/' ,
                                            charset : 'utf-8' ,
                                            useragent : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.22 Safari/537.36' ,
                                            password : 'none',
                                            seq : i-1
                                        }
                                    };
                                    console.log(options);

                                    if(i==svgURLs.length-1){
                                        // 最後のスライドは他のスライドの変換を待機
                                        var timer = setInterval(function(){
                                            var all = fileNum-1;
                                            console.log('wait...'+slideIdList.length+"/"+all);

                                            if(slideIdList.length == fileNum-1){
                                                clearInterval(timer);

                                                httprequest.post(options, function(error, httpresponse, body){
                                                    if (!error && httpresponse.statusCode == 200) {
                                                        console.log(body);
                                                        parsedRes = JSON.parse(body);

                                                        if(parsedRes.pageid==""){
                                                            slideIdList[parseInt(parsedRes.seq)] = parsedRes.pageid;
                                                        }else{
                                                            slideIdList[parseInt(parsedRes.seq)] = _WFESURL+parsedRes.pageid;
                                                        }

                                                        // 作成時刻
                                                        var nowTime = makeTime();

                                                        // スライドIDリストの生成(jpgバージョン)
                                                        var originelSlideIdList = new Array();
                                                        for(var i=0;i<fileNum;i++){
//                                                        slideIdList.push(_serverURL+"slideimage?fileid="+fileId+"&filename="+fileId+"-"+i+".jpg");
                                                            originelSlideIdList.push(fileId+"-"+i+".jpg");
                                                        }

                                                        // DBに保存
                                                        var slideData = {
                                                            "pageid": fileId,
                                                            "slidenum": fileNum,
                                                            "controller": {
                                                                "annotation": true,
                                                                "commentview": true,
                                                                "pointer": true,
                                                                "sendpage": true,
                                                                "autosendpage": true,
                                                                "presentationmode": true
                                                            },
                                                            "size": "0",
                                                            "slides": slideIdList,
                                                            "date": nowTime,
                                                            "type": "text/html",
                                                            "originalslides": originelSlideIdList
                                                        };
                                                        console.log(slideData);
                                                        var newSlide = new slideSchema(slideData);
                                                        newSlide.save();

                                                        // スライドのテキストをxmlから抽出してDBに保存
                                                        for(var i=0;i<slideData.slidenum;i++){
                                                            var fileIndex = i+1;
                                                            var filePath = slideFileDir + fileId + "/slides/slide"+fileIndex+".xml";
                                                            if (path.existsSync(filePath)) {
                                                                var xmlString = fs.readFileSync(filePath)+"";
                                                                xmlString = xmlString.replace(/:/g, "-");
                                                                var xmlDoc = libxmljs.parseXmlString(xmlString);

                                                                for(var j=0;j<xmlDoc.find('//p-sp').length;j++){
                                                                    var index = j+1;
                                                                    var objType;

                                                                    // どの要素なのかを取り出し（タイトル要素，body要素とか）
                                                                    if(typeof xmlDoc.find('//p-sp['+index+']//p-ph')[0] != "undefined"){
                                                                        objType = xmlDoc.find('//p-sp['+index+']//p-ph')[0].attr('type') + "";
                                                                    }

                                                                    switch(objType){
                                                                        case " type=\"ctrTitle\"":
                                                                            objType="ctrTitle";
                                                                            break;
                                                                        case " type=\"title\"":
                                                                            objType="title";
                                                                            break;
                                                                        case " type=\"body\"":
                                                                            objType="body";
                                                                            break;
                                                                        default:
                                                                            objType="";
                                                                            break;
                                                                    }

                                                                    // テキスト取り出し
                                                                    for(var k=0;k<xmlDoc.find('//p-sp['+index+']//a-t').length;k++){
                                                                        var beforeWakati = xmlDoc.find('//p-sp['+index+']//a-t')[k].text();
                                                                        // mecabを使って分かち書き
                                                                        var mecabWakatiCommand = 'echo \'' + beforeWakati + '\' | mecab -O wakati';

                                                                        var wakatiList = execSync(mecabWakatiCommand).split(" ");

                                                                        for(var l=0;l<wakatiList.length;l++){
                                                                            if(wakatiList[l]!=""){
                                                                                var obj = new Object();
                                                                                obj = {
                                                                                    "pageid": fileId,
                                                                                    "slidetype": "image/jpg",
                                                                                    "slideid": _serverURL+"slideimage?fileid="+fileId+"&filename="+fileId+"-"+i+".jpg",
                                                                                    "type": objType,
                                                                                    "text": wakatiList[l]
                                                                                };
                                                                                console.log(obj);

                                                                                var newText = new textSchema(obj);
                                                                                newText.save();
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        response.writeHead(200, {
                                                            "Content-Type" : "text/plain"
                                                        });
                                                        response.write(fields.page);
                                                        response.end();
                                                    } else {
                                                        console.log('error: '+httpresponse.response);
                                                    }
                                                });
                                            }
                                        },100);
                                    }else{
                                        httprequest.post(options, function(error, httpresponse, body){
                                            if (!error && httpresponse.statusCode == 200) {
                                                console.log(body);
                                                parsedRes = JSON.parse(body);

                                                if(parsedRes.pageid==""){
                                                    slideIdList[parseInt(parsedRes.seq)] = parsedRes.pageid;
                                                }else{
                                                    slideIdList[parseInt(parsedRes.seq)] = _WFESURL+parsedRes.pageid;
                                                }
                                            } else {
                                                console.log('error: '+error);
                                            }
                                        });
                                    }
                                }
                            });
                        });
                    });
                });
            });
        });
    });
}

// スライドの情報を返す
function slideinfo(response, request, pathname, query) {
    var parsedQuery = querystring.parse(query);
    var fileId = parsedQuery.fileid;
    
    slideSchema.find({pageid: fileId}, function(err, docs) {		
		response.writeHead(200, {
			"Content-Type" : "text/plain"
		});
		var JSONData = JSON.stringify(docs);
		response.write(JSONData);
		response.end();
	});
}

// スライドの画像を返す
// slideimage?fileid=hoge1&filename=hoge2
function slideimage(response, request, pathname, query) {
    var parsedQuery = querystring.parse(query);

    var imgDirName = parsedQuery.filename.split("-")[0];
    var filePath = imgDirName + '/' + parsedQuery.filename;

    fs.readFile(slideFileDir + filePath, "binary", function(error, file) {
        if (error) {
            response.writeHead(500, {
                "Content-Type" : "text/plain"
            });
            response.write(error + "\n");
            response.end();
        } else {
            var stat = fs.statSync(slideFileDir + filePath);
            var fileExtension = getFileExtension(filePath);
            if(fileExtension == "jpg"){
                response.writeHead(200, {
                    "Content-Type" : "image/jpeg",
                    "Content-Length" : stat.size
                });
            }else if(fileExtension == "html"){
                response.writeHead(200, {
                    "Content-Type" : "text/html",
                    "Content-Length" : stat.size
                });
            }else if(fileExtension == "svg"){
                response.writeHead(200, {
                    "Content-Type" : "image/svg+xml",
                    "Content-Length" : stat.size
                });
            };
            response.write(file, "binary");
            response.end();
        }
    });
}

// 全てのスライドの情報を返す
function allslide(response, request, pathname, query){
	slideSchema.find({}).sort('-created').execFind( function(err, docs) {		
		response.writeHead(200, {
			"Content-Type" : "text/plain"
		});
		var JSONData = JSON.stringify(docs);
		response.write(JSONData);
		response.end();		
	});
}

// スライドの削除処理
function deleteslide(response, request, pathname, query){
	var parsedQuery = querystring.parse(query);
	var fileId = parsedQuery.fileid;

	slideSchema.find({pageid: fileId}, function(err, docs) {	
		if(docs.length!=0){
			var deleteSlideComman = 'rm -r ' + slideFileDir + fileId;

			exec(deleteSlideComman, function(err, stdout, stderr) {
				if (err) {
					console.log("err=" + err);
					console.log("stdout=" + stdout);
					console.log("stderr=" + stderr);
				}

				// 編集内容の削除
				editSchema.remove({pageid: fileId}, function(err, docs) {
					// スライド情報の削除
					slideSchema.remove({pageid: fileId}, function(err, docs) {
						// テキスト情報の削除
						textSchema.remove({pageid: fileId}, function(err, docs) {
							response.writeHead(200, {
								"Content-Type" : "text/plain"
							});
							response.write('delete success');
							response.end();
						});
					});
				});
			});
		}else {
			console.log("Page not found: " + pathname);
			response.writeHead(404, {
				"Content-Type" : "text/html"
			});
			response.write("404 Not found");
			response.end();
		}
	});
}

// 編集内容の保存
function saveedits(response, request, pathname, query){
	var parsedQuery = querystring.parse(query);
	
	editSchema.findOne({_id: parsedQuery._id}, function(err, docs) {
		if(docs){
			// 更新の時
			editSchema.update({_id: parsedQuery._id},{ $set : {color: parsedQuery.color}}, false, true);
			editSchema.update({_id: parsedQuery._id},{ $set : {fontsize: parsedQuery.fontsize}}, false, true);
			editSchema.update({_id: parsedQuery._id},{ $set : {h: parsedQuery.h}}, false, true);
			editSchema.update({_id: parsedQuery._id},{ $set : {w: parsedQuery.w}}, false, true);
		}else{
			// 新規登録の時
			var newEditing = new editSchema(parsedQuery);
			newEditing.save();		
		}
		
		response.writeHead(200, {
			"Content-Type" : "text/plain"
		});
		response.write('save success');
		response.end();
	});
}

// 編集内容の取り出し
function fetchedits(response, request, pathname, query){
	var parsedQuery = querystring.parse(query);
	
	var slideId = parsedQuery.slideid;

	editSchema.find({slideid: slideId}, function(err, docs) {		
		response.writeHead(200, {
			"Content-Type" : "text/plain"
		});
		var JSONData = JSON.stringify(docs);
		response.write(JSONData);
		response.end();
	});
}

// 編集内容の削除
function deleteedits(response, request, pathname, query){
	var parsedQuery = querystring.parse(query);
	
	var deleteId = parsedQuery._id;

	editSchema.remove({_id: deleteId}, function(err, docs) {		
		response.writeHead(200, {
			"Content-Type" : "text/plain"
		});
		response.write("delete success");
		response.end();
	});
}

// テキスト検索
function searchslides(response, request, pathname, query){
	var parsedQuery = querystring.parse(query);
	
	var searchQuery = parsedQuery.searchquery;
	var searchQueryList = searchQuery.split(/[\s　]/);
//	console.log('query: '+searchQueryList);
	
	// 検索クエリ生成
	var mongodbQuery = "this.text == \'"+searchQueryList[0]+"\'";
	for(var i=1;i<searchQueryList.length;i++){
		mongodbQuery += " || this.text == \'"+searchQueryList[i]+"\'";
	}	
	console.log('slide search query: '+mongodbQuery);
	
	// 検索時間測定
	var start = new Date();
	
	textSchema.find({$where: mongodbQuery}, function(err, docs) {		
		response.writeHead(200, {
			"Content-Type" : "text/plain"
		});

		// 検索時間測定
		var end = new Date();
		var searchTime = end.getTime()-start.getTime();
		console.log('search time mongodb: '+searchTime+' ms');

		// 検索結果
		var data = new Array();
		for(var j=0;j<docs.length;j++){
			var existFlag = false;
			for(var k=0;k<data.length;k++){
				if(docs[j].slideid == data[k].slideid){
					existFlag = true;
				}
			}

			if(!existFlag){
				data.push(docs[j]);
			}			
		}
//		console.log('search result:\n'+data);

		var JSONData = JSON.stringify(data);
		response.write(JSONData);
		response.end();	
	});
}

// スライドスタック内の検索
function searchonslidestack(response, request, pathname, query){
    var parsedQuery = querystring.parse(query);

    var fileId = parsedQuery.fileid;

    var searchQuery = parsedQuery.searchquery;
    var searchQueryList = searchQuery.split(/[\s　]/);
//	console.log('query: '+searchQueryList);

    // 検索クエリ生成
    var mongodbQuery = "this.text == \'"+searchQueryList[0]+"\'";
    for(var i=1;i<searchQueryList.length;i++){
        mongodbQuery += " || this.text == \'"+searchQueryList[i]+"\'";
    }
    console.log('query on slidestack: '+mongodbQuery);

    // 検索時間測定
    var start = new Date();

    textSchema.find({pageid: fileId, $where: mongodbQuery}, function(err, docs) {
        response.writeHead(200, {
            "Content-Type" : "text/plain"
        });

        // 検索時間測定
        var end = new Date();
        var searchTime = end.getTime()-start.getTime();
        console.log('search time mongodb: '+searchTime+' ms');

        // 検索結果
        var data = new Array();
        for(var j=0;j<docs.length;j++){
            var existFlag = false;
            for(var k=0;k<data.length;k++){
                if(docs[j].slideid == data[k].slideid){
                    existFlag = true;
                }
            }

            if(!existFlag){
                data.push(docs[j]);
            }
        }
//		console.log('search result:\n'+data);

        var JSONData = JSON.stringify(data);
        response.write(JSONData);
        response.end();
    });
}

// 設定変更，アップデート
function updatesetting(response, request, pathname, query){
	var parsedQuery = querystring.parse(query);
	
	var parsedSetting = JSON.parse(parsedQuery.setting);
	
	slideSchema.update({_id: parsedSetting._id},{ $set : {controller : parsedSetting.controller}}, false, true);
	slideSchema.update({_id: parsedSetting._id},{ $set : {size : parsedSetting.size}}, false, true);
	slideSchema.update({_id: parsedSetting._id},{ $set : {slides : parsedSetting.slides}}, false, true);
	slideSchema.update({_id: parsedSetting._id},{ $set : {slidenum : parsedSetting.slidenum}}, false, true);
    slideSchema.update({_id: parsedSetting._id},{ $set : {originalslides : parsedSetting.originalslides}}, false, true);

	response.writeHead(200, {
		"Content-Type" : "text/plain"
	});
	response.write('update setting success');
	response.end();
}

// スライドスタック生成（再利用）
function makess(response, request, pathname, query){
	var parsedQuery = querystring.parse(query);
	
	var parsedSlides = JSON.parse(parsedQuery.slides);
    
    var nowTime = makeTime();
    
    // IDの生成
    var randomId = makeRandobet(32);
    
    var slideData = {
    		"pageid": randomId,
    		"slidenum": parsedSlides.length,
    		"controller": {
                "annotation": true,
                "commentview": true,
                "pointer": true,
                "sendpage": true,
                "autosendpage": true,
                "presentationmode": true
    		},
    		"size": "0",
    		"slides": parsedSlides,
    		"date": nowTime,
    };
	var newSlide = new slideSchema(slideData);
    newSlide.save();
    
    response.writeHead(200, {
		"Content-Type" : "text/plain"
	});
	response.write(randomId);
	response.end();
}

// コメント投稿
function commentsend(response, request, pathname, query){
    var parsedQuery = querystring.parse(query);

    console.log(parsedQuery.pageid);
    console.log(parsedQuery.text);

    var nowTime = makeTime();

    var commentData = {
        "pageid": parsedQuery.pageid,
        "text": parsedQuery.text,
        "date": nowTime
    };
    var newComment = new commentSchema(commentData);
    newComment.save();

    var JSONData = JSON.stringify(commentData);

    response.writeHead(200, {
        "Content-Type" : "text/plain"
    });
    response.write(JSONData);
    response.end();
}

// コメントの履歴取得
function getcomment(response, request, pathname, query) {
    var parsedQuery = querystring.parse(query);
    var pageid = parsedQuery.pageid;

    commentSchema.find({pageid: pageid}, function(err, docs) {
        response.writeHead(200, {
            "Content-Type" : "text/plain"
        });
        var JSONData = JSON.stringify(docs);
        response.write(JSONData);
        response.end();
    });
}

// 拡張子抜き出し
function getFileExtension(filename){
    var fileExtension = filename.split('.');
    return fileExtension[fileExtension.length - 1];
}

// 時刻情報作成
function makeTime(){
    // 作成時刻
    var nowTime = new Date();
    var yy = nowTime.getYear();
    var mm = nowTime.getMonth() + 1;
    var dd = nowTime.getDate();
    var hh = nowTime.getHours();
    var min = nowTime.getMinutes();
    var ss = nowTime.getSeconds();
    if (yy < 2000) { yy += 1900; };
    if (mm < 10) { mm = "0" + mm; };
    if (dd < 10) { dd = "0" + dd; };
    if (hh < 10) { hh = "0" + hh; };
    if (min < 10) { min = "0" + min; };
    if (ss < 10) { ss = "0" + ss; };
    var timeString = yy+"/"+mm+"/"+dd+" "+hh+":"+min+":"+ss;
    
    return timeString;
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

exports.start = start;
exports.image = image;
exports.slidepage = slidepage;
exports.upload = upload;
exports.slideinfo = slideinfo;
exports.slideimage = slideimage; 
exports.allslide = allslide; 
exports.deleteslide = deleteslide; 
exports.saveedits = saveedits;
exports.fetchedits = fetchedits;
exports.deleteedits = deleteedits;
exports.searchslides = searchslides;
exports.searchonslidestack = searchonslidestack;
exports.updatesetting = updatesetting;
exports.makess = makess;
exports.commentsend = commentsend;
exports.getcomment = getcomment;