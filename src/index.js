var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");

var handle = {}
handle["/"] = requestHandlers.start;
handle["/start"] = requestHandlers.start;
handle["/image"] = requestHandlers.image;
handle["/slidepage"] = requestHandlers.slidepage;
handle["/upload"] = requestHandlers.upload;
handle["/slideinfo"] = requestHandlers.slideinfo;
handle["/slideimage"] = requestHandlers.slideimage;
handle["/allslide"] = requestHandlers.allslide;
handle["/deleteslide"] = requestHandlers.deleteslide;
handle["/saveedits"] = requestHandlers.saveedits;
handle["/fetchedits"] = requestHandlers.fetchedits;
handle["/deleteedits"] = requestHandlers.deleteedits;
handle["/searchslides"] = requestHandlers.searchslides;
handle["/searchonslidestack"] = requestHandlers.searchonslidestack;
handle["/updatesetting"] = requestHandlers.updatesetting;
handle["/makess"] = requestHandlers.makess;
handle["/commentsend"] = requestHandlers.commentsend;
handle["/getcomment"] = requestHandlers.getcomment;

// OpenOffice.orgをヘッドレスモードで起動
var exec = require('child_process').exec;
var openOfficeCommand = "/Applications/OpenOffice.org.app/Contents/MacOS/soffice.bin -headless -accept=\"socket,host=127.0.0.1,port=8100;urp;\" -nofirststartwizard &";
//var openOfficeCommand = "/opt/openoffice.org3/program/soffice -headless -accept=\"socket,host=127.0.0.1,port=8100;urp;\" -nofirststartwizard &";
 
exec(openOfficeCommand, function(err, stdout, stderr){
    if(err){
    	console.log("openoffice error");
        console.log("err="+err);
        console.log("stdout="+stdout);
        console.log("stderr="+stderr);        
    }
});
 
server.start(router.route, handle);