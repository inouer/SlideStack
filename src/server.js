var http = require("http"), url = require("url");

function start(route, handle) {
    function onRequest(request, response) {
        var pathname = url.parse(request.url).pathname;
        var query = url.parse(request.url).query;
//        console.log("Request for " + pathname + " received.");
        route(handle, pathname, response, request, query);
    }
    
    http.createServer(onRequest).listen(4000);
    console.log("Server has started.");
}

exports.start = start;
