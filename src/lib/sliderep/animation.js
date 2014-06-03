var Animation = function(container) {
    /* インスタンス変数
    * container, animationCounterArray
    * svgElement, animationObjectArray, animationCounter
    */
    this.container = container;
    
    this.animationCounterArray = this.initAnimationCountArray();
    
    console.debug('animation');
    

}

Animation.prototype = {
    initAnimationCountArray: function() {
        //アニメーションカウンタ配列の初期化
        var slides = this.container.querySelectorAll('#container article');
        animationCounterArray = new Array(slides.length);
        for (var i = 0; i < animationCounterArray.length; i++) {
            animationCounterArray[i] = 0;   
        }
        
        return animationCounterArray;
    },
    /* playerforslideのinitAnimation()から呼ばれる */
    initAnimation: function(svgElement) {
        this.svgElement = svgElement;
         var animations = this.svgElement.querySelectorAll('animate[class="animationtrigger"]');
            
        /* [0, 1, 2, 3] 普通なら実行の順番が0のアニメーションはないが一応あけておく*/                
        this.animationObjectArray = new Array(animations.length+1);
        this.animationObjectArray[0] = this.getAnimationWhichNumberIsZero();
        for (var i = 1; i < this.animationObjectArray.length; i++) {
            //アニメーションオブジェクト生成
            var animationObject = [];
            animationObject.domElement = animations[i-1];
            //アニメーションオブジェクトの追加
            this.animationObjectArray[i] =  animationObject;
        }
        
        //アニメーションカウンタの初期化
        var page = parseInt(location.hash.replace(/#([0-9]*)$/, '$1'));
        this.animationCounter = this.animationCounterArray[page];        
        
        //初期設定　非表示
        this.setVisibilityHidden();
            
        //ページ遷移時の状態に変更
        this.setAnimationState();
            
        if (this.animationCounter == 0) {
            //アニメーション実行順が0のアニメーション実行
            //ページ遷移と同時に実行するアニメーションの実行
            this.playAnimation();
        }
    },
    getAnimationWhichNumberIsZero: function() {
        var firstAnimation = this.svgElement.querySelector('animate');
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
    },
    setVisibilityHidden: function() {
        var visibilityAnimations = this.svgElement.querySelectorAll('animate[attributeName = "visibility"]');
        for(var i = 0; i < visibilityAnimations.length; i++) {
            var visibilityAnimation = visibilityAnimations[i];
            var values = visibilityAnimation.getAttribute('values');
            var firstValue = values.split(';')[0];
            if (firstValue == 'hidden') {
                var useId = visibilityAnimation.getAttribute('xlink:href');
                var useElement = this.svgElement.querySelector(useId);
                useElement.setAttribute('visibility', 'hidden');
            }
        }
    },
    setAnimationState: function() {
        var animations = this.svgElement.querySelectorAll('animate');
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
            var useElement = this.svgElement.querySelector(useId);
            useElement.setAttribute(attribute, lastValue);
        }

    },
    playAnimation: function() {
        //playForwardAnimationにかえたい
        var animation = this.animationObjectArray[this.animationCounter];
        if (animation != null) {
            animation.domElement.beginElement();
        }
        
        //アニメーションカウンタのカウントアップ
        this.animationCounter++;
    },
    storeAnimationCounter: function(page) {
        //アニメーションカウンタ配列にアニメーションカウンタを記録
        this.animationCounterArray[page] = this.animationCounter;     
    },
    hasAnimations: function() {
        return this.svgElement != null && this.animationObjectArray != null && this.animationCounter != null;
    }
}