/**
 * Created with IntelliJ IDEA.
 * User: inoueryouta
 * Date: 13/11/08
 * Time: 1:14
 * To change this template use File | Settings | File Templates.
 */

var websocketPort = 4001;

var express = require('express'),
    http = require('http');

var app = express();

var server = http.createServer(app);

var io = require('socket.io').listen(server);

//app.configure(function(){
//    app.use(express.static(__dirname + '/static'));
//});
//
//app.listen(websocketPort);
//
//var socket = io.listen(app);

//ログを表示しないようにする
io.settings.log = false;

io.on('connection', function(client) {
    client.on('comment', function(msg) {
        var JSONData = JSON.stringify(msg);
        client.broadcast.emit('comment',JSONData);
    });

    client.on('pointer', function(msg){
        var JSONData = JSON.stringify(msg);
        client.broadcast.emit('pointer',JSONData);
    })

    //----- クライアントの切断 -----
    client.on('disconnect', function() {
//        console.log('disconnect');
    });
});

//socket.ioの準備をしてからlistenする
server.listen(websocketPort);

console.log('Server running at http://127.0.0.1:' + websocketPort + '/');