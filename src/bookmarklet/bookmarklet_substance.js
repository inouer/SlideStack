/**
 * Created with IntelliJ IDEA.
 * User: inoueryouta
 * Date: 13/11/14
 * Time: 11:14
 * To change this template use File | Settings | File Templates.
 */

function IframeGenerator(){};

IframeGenerator.prototype.init = function(){
    this.setEventToPage();
}

IframeGenerator.prototype.setEventToPage = function(){
    var $div = $('<div/>');

    var $input = $('<input/>');
    $input
        .attr({
            id:"iframeHTML"
        })
        .attr({
            type:'text'
        })
        .css({
            width:"480px",
            margin:"10px"
        })
        .appendTo($div);

    var $button = $('<button/>');
    $button
        .click(function(){
            var $handle = $('<div/>');

            $handle
                .attr({
                    id:"snippetHandle"
                })
                .css({
                    position:"absolute",
                    top:200
                })
                .hover(
                function(){
                    $(this)
                        .css({
                            "background-color":" rgba(51,51,255,0.9)"
                        });
                },
                function(){
                    $(this)
                        .css({
                            "background-color":" rgba(51,51,255,0.0)"
                        });
                })
                .appendTo($('body'));

            $($('#iframeHTML').val())
                .css({
                    margin:"20px 10px 10px 10px"
                })
                .draggable({
                    handle:"#snippetHandle"
                })
                .appendTo($handle);
        })
        .html('generate')
        .appendTo($div);

    $div
        .attr({
            id:"snippetAppender"
        })
        .css({
            position:"fixed",
            height:100,
            width:500,
            top:0,
            left:$(window).width()/2-250,
            "background-color":" rgba(255,255,255,0.9)",
            "border-left":"1px solid",
            "border-right":"1px solid",
            "border-bottom":"1px solid"
        })
        .hover(
        function(){
            $(this).stop();
            $(this)
                .animate({
                    top:0
                },300);
        },
        function(){
                $(this).stop();
                $(this)
                    .animate({
                        top:-90
                    },300);
        })
        .appendTo($('body'));
}

$(function(){
    window.ig = new IframeGenerator();
    window.ig.init();
});