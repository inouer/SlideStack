function route(handle, pathname, response, request, query) {
//    console.log("About to route a request for " + pathname);
    if ( typeof handle[pathname] === 'function') {
        handle[pathname](response, request, pathname, query);
    } else if (pathname.indexOf('img') != -1){
        handle["/image"](response, request, pathname, query);
    } else if (pathname.indexOf('.') != -1){
        handle["/"](response, request, pathname, query);
    } else {
    	//末尾がランダムIDの時
        handle["/slidepage"](response, request, pathname, query);        
    }
}

exports.route = route; 