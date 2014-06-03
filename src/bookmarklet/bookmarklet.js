/**
 * Created with IntelliJ IDEA.
 * User: inoueryouta
 * Date: 13/11/14
 * Time: 11:05
 * To change this template use File | Settings | File Templates.
 */
javascript:(function(){
    var s1=document.createElement("script");
    s1.charset="UTF-8";
    s1.src="http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js";
    var s2=document.createElement("script");
    s2.charset="UTF-8";
    s2.src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js";
    var s3=document.createElement("script");
    s3.charset="UTF-8";
    s3.src="http://localhost:4000/bookmarklet/bookmarklet_substance.js";
    document.head.appendChild(s1);
    document.head.appendChild(s2);
    document.head.appendChild(s3);
})();