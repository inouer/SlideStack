var Slide = function (container) {
    var page = location.hash.replace(/#([0-9]*)$/, '$1');
    if (!page) {
        location.hash = '#0';
    }
    this.container = container;
    this.articles = this.container.querySelectorAll('#container > article');

    //アニメーションカウンタ配列の初期化
    var slides = this.container.querySelectorAll('#container article');
    this.animationCounterArray = new Array(slides.length);
    for (var i = 0; i < this.animationCounterArray.length; i++) {
        this.animationCounterArray[i] = 0;   
    }
   
    window.addEventListener('resize', this.resize.bind(this));
    window.addEventListener('popstate', this.transition.bind(this));
    window.addEventListener('keydown', this.transitionOrAnimation.bind(this));
    
    // bodyにキーイベント
    document.body.addEventListener('keydown', this.transitionOrAnimation.bind(this));
    
    // 動画を一瞬再生
    // 複数ウインドウでvideoタグを閲覧すると最初以外が再生できないやつに対応(Chrome)
    var videos = document.querySelectorAll('video');  
    var videoPause = function(video){
    	video.pause();
    }
    for(var i=0;i<videos.length;i++){
    	videos[i].load();
    	videos[i].play();
    	setTimeout(videoPause,500,videos[i])
    }  
    
//    window.addE
    this.resize();
    this.transition();
    
    this.setSlideList();
}
Slide.prototype = {
    transition: function() {
        var page = parseInt(location.hash.replace(/#([0-9]*)$/, '$1'));
        if (page == NaN) return;
        var position = page / this.articles.length;
//        document.body.style.backgroundPositionX = '-'+((parseInt(getComputedStyle(document.body).width) * position) | 0)+'px';
        var first = page-3 > 0 ? page-3 : 0;
        var last = page+4 < this.articles.length ? page+4 : this.articles.length;
        
        this.removeClassForPrevCurrentNext();
        
        for (var i = first; i < last; i++) {
            if (i == page-2)      this.articles[i].classList.add('prev2');
            else if (i == page-1) this.articles[i].classList.add('prev');
            else if (i == page)   this.articles[i].classList.add('current');
            else if (i == page+1) this.articles[i].classList.add('next');
            else if (i == page+2) this.articles[i].classList.add('next2');
            //else this.articles[i].className = '';
        }
        
        //アニメーション配列作成
        var currentObjectDomElement = this.container.querySelector('.current > object');
        var self = this;

        currentObjectDomElement.onload = function() {
            var currentSVGContent = currentObjectDomElement.contentDocument;
            self.currentSVGDomElement = currentSVGContent.querySelector('svg');
            var animations = self.currentSVGDomElement.querySelectorAll('animate[class="animationtrigger"]');
            
            /* [0, 1, 2, 3] 普通なら実行の順番が0のアニメーションはないが一応あけておく*/
            self.animationObjectArray = new Array(animations.length+1);
            self.animationObjectArray[0] = self.getAnimationWhichNumberIsZero();
            for (var i = 1; i < self.animationObjectArray.length; i++) {
                //アニメーションオブジェクト生成
                var animationObject = [];
                animationObject.domElement = animations[i-1];
                //アニメーションオブジェクトの追加
                self.animationObjectArray[i] =  animationObject;
            }
        
            //アニメーションカウンタの初期化
            self.animationCounter = self.animationCounterArray[page];        
                                                                     
            //初期設定　非表示
            self.setVisibilityHidden();
            
            //ページ遷移時の状態に変更
            self.setAnimationState();
            
            if (self.animationCounter == 0) {
                //アニメーション実行順が0のアニメーション実行
                //ページ遷移と同時に実行するアニメーションの実行
                self.playAnimation();
            }

        };

    },  
    keydown: function(e) {
        // InternetExplorer 用
        if (!e)	e = window.event;

        // キーコード
        var keycode = e.keyCode;
        console.log("code:" + keycode);
        switch(keycode) {
            case 39:
                /*do something*/
                break;
            case 37:
                /*do something*/
                break;
        }
        
        // Shiftキーの押下状態
        var shift_key = e.shiftKey;
        console.log("shift:" + shift_key);

        // Ctrlキーの押下状態
        var ctrl_key = e.ctrlKey;
        console.log("ctrl:" + ctrl_key);

        // Altキーの押下状態
        var alt_key = e.altKey;
        console.log("alt:" + alt_key);
    },
    transitionOrAnimation: function(e, auto) {
        var page = parseInt(location.hash.replace(/#([0-9]*)$/, '$1'));
        if (auto || e.keyCode == 39 || e.target.id=="controllerRightArrow") {
        	//ページめくりか、アニメーション実行かを判断
            if (this.animationObjectArray.length > this.animationCounter) {
                //アニメーション実行
                this.playAnimation();
            } else {
                
                //アニメーションカウンタ配列にアニメーションカウンタを記録
                this.animationCounterArray[page] = this.animationCounter;
                
                //ページ遷移
                if(auto){
                	location.hash = page+1 < this.articles.length ? page+1 : 0;
                }else{
                    location.hash = page+1 < this.articles.length ? page+1 : this.articles.length-1;                	
                }
            }
            e.stopPropagation();
            e.preventDefault();            
        } else if (e.keyCode == 37 || e.target.id=="controllerLeftArrow") {   
            /*
            if(this.animationCounter > 1) {
                this.playbackAnimation();
                
            } else {                
                this.playbackAnimation();
                
                //アニメーションカウンタ配列にアニメーションカウンタを記録
                this.animationCounterArray[page] = this.animationCounter;
                
                //ページ遷移
                location.hash = page-1 >= 0 ? page-1 : 0;
            }*/
            //アニメーションカウンタ配列にアニメーションカウンタを記録
            this.animationCounterArray[page] = this.animationCounter;
                
            //ページ遷移
            location.hash = page-1 >= 0 ? page-1 : 0;
            e.stopPropagation();
            e.preventDefault();
        }  
    },
    resize: function(e) {
        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;
        var slideWidth = 720;
        var slideHeight = 540;
        var scale;
        if(3*windowWidth < 4*windowHeight) {
            scale = windowWidth / slideWidth;
        } else { 
            scale = windowHeight / slideHeight;
        }
        
        this.container.style.webkitTransform = 'scale(' + scale + ',' + scale + ')';
        this.container.style.MozTransform = 'scale(' + scale + ',' + scale + ')';
    },
//    click: function(e) {
//        
//    },
    playAnimation: function() {
        //playForwardAnimationにかえたい
        var animation = this.animationObjectArray[this.animationCounter];
        if (animation != null) {
            animation.domElement.beginElement();
        }
        
        //アニメーションカウンタのカウントアップ
        this.animationCounter++;

    },
    playbackAnimation: function() {
        this.animationCounter--;
        
        //元に戻す
    },
    //指定した実行順のアニメーションの配列を返す関数
    getCurrentAnimations: function(animationOrder) {
        var currentAnimationArray = new Array();

        for (var i = 0; i < this.animationObjectArray.length; i++) {
            if (this.animationObjectArray[i].animationOrder == animationOrder) {
                currentAnimationArray.push(this.animationObjectArray[i]);
            }
        }
        return currentAnimationArray;        
    },
    removeClassForPrevCurrentNext: function() {
        var toRemoves = new Array('prev2', 'prev', 'current', 'next', 'next2');

        for (var i = 0; i < toRemoves.length; i++) {
            var toRemove = this.container.querySelector('.' + toRemoves[i]);
            if(toRemove == null) continue;
            toRemove.classList.remove(toRemoves[i]);
        }

    },
    setSlideList: function() {
        var slideList = document.querySelector('#contents');
        var objects = document.querySelectorAll('#container object');   
        for (var i = 0; i < objects.length; i++) {
            var object = objects[i];
            var slidesrc = object.getAttribute('data');
            var li = document.createElement('li');
            slideList.appendChild(li);
            
            var slideAnchor = document.createElement('a');
            slideAnchor.setAttribute('href', '#' + i);
            li.appendChild(slideAnchor);
            
            var slideImg = document.createElement('img');
            slideImg.setAttribute('class', 'thumbnail');
            slideImg.setAttribute('src', slidesrc);
            slideAnchor.appendChild(slideImg);
            
        }
    },
    setVisibilityHidden: function() {
        var visibilityAnimations = this.currentSVGDomElement.querySelectorAll('animate[attributeName = "visibility"]');
        for(var i = 0; i < visibilityAnimations.length; i++) {
            var visibilityAnimation = visibilityAnimations[i];
            var values = visibilityAnimation.getAttribute('values');
            var firstValue = values.split(';')[0];
            if (firstValue == 'hidden') {
                var useId = visibilityAnimation.getAttribute('xlink:href');
                var useElement = this.currentSVGDomElement.querySelector(useId);
                useElement.setAttribute('visibility', 'hidden');
            }
        }
    },
    setAnimationState: function() {
        var animations = this.currentSVGDomElement.querySelectorAll('animate');
        var triggerCount = 0;
        var i = 0;
        
        for (; i < animations.length && triggerCount < this.animationCounter; i++) {
            var animation = animations[i];
            var classValue = animation.className;
            if (classValue == "animationtrigger") {
                triggerCount++;   
            }
        }
        if (triggerCount == this.animationCounter) {
            i--;
        }
        
        for (var j = 0; j < i; j++) {
            var animation = animations[j];
            var values = animation.getAttribute('values');
            var splitValues = values.split(';');
            var lastValue = splitValues[splitValues.length-1];
            var attribute = animation.getAttribute('attributeName');
            var useId = animation.getAttribute('xlink:href');
            var useElement = this.currentSVGDomElement.querySelector(useId);
            useElement.setAttribute(attribute, lastValue);
        }

    },
    getAnimationWhichNumberIsZero: function() {
        var firstAnimation = this.currentSVGDomElement.querySelector('animate');
        if (firstAnimation != null) {
            var classValue = firstAnimation.className;
            if (classValue == "animationtrigger") {
                return null;
            } else {
                //アニメーションオブジェクト生成
                var animationObject = [];
                animationObject.domElement = firstAnimation;
                return animationObject;
            }
        }
    }
}
    
