$(function () {
    const ImageMap = new Map()
    const TokenListLine = []

    const FPS = 60;
    const DISPLAY_SEC = 5;
    const STEP_COE = FPS * DISPLAY_SEC;
    const LINE_SPACING = 0;

    const stage = new PIXI.Container();

    const TOKEN_SPACE = 5;
    const boxWidth = window.innerWidth;//1920
    const boxHeight = window.innerHeight;//1920

    const url = location.href;
    const ticker = PIXI.Ticker.shared;

    // ticker.maxFPS = FPS;

    const style = new PIXI.TextStyle({
        fontFamily: "メイリオ",
        fill: "white",
        fontSize: 46,
        lineJoin: "round",
        fontWeight: 900,
        strokeThickness: 6
    });
    const COMMENT_HEIGHT = PIXI.TextMetrics.measureText("■", style).height + LINE_SPACING;

    // // try {
    // //2021/03/23 Update
    const VERSION = "nico_5.0.0.2";
    /************** 変更可能パラメータ **********/
    // Sytem用のコメントです(広告とか放送閉じるとか(ニコ生))
    const IS_SHOW_SYSTEM_COMMENT = true;

    /************************************************/
    //Debugモード
    var IS_DEBUG = false;
    /************************************************/
    // 時間情報のDataKey
    const TYPE_SYSTEM_COMMENT = "System";
    const TYPE_SERVICE_COMMENT = "Service";
    var TEST_COUNT = 1;
    /******************************************/

    const STAMP_DATA = {
        //Key（左）に置き換え文字
        //Value（右）に対象の画像URL
        //HTTP経由でもOK
        "いちほ": ["https://develop-kui.com/mcv/img/ichiho.png"],
        "カク": ["https://develop-kui.com/mcv/img/kaku1.png",
            "https://develop-kui.com/mcv/img/kaku2.png"],
        "かく": ["https://develop-kui.com/mcv/img/kaku1.png",
            "https://develop-kui.com/mcv/img/kaku2.png"],
        "きぅ": ["https://develop-kui.com/mcv/img/kiu1.jpg",
            "https://develop-kui.com/mcv/img/kiu2.jpg",
            "https://develop-kui.com/mcv/img/kiu3.png"],
        // "サイコロ": ["./img/サイコロ1.png",
        //  "./img/サイコロ2.png",
        //   "./img/サイコロ3.png", 
        //   "./img/サイコロ4.png", 
        //   "./img/サイコロ5.png",
        //    "./img/サイコロ6.png"],
    };

    class Comment {
        constructor(x) {
            this.tokens = [];
            this.x = x;
            this.stepCount = 0;
            this.width = 0;
        }
        set y(y) {
            this.tokens.forEach(token => {
                token.obj.y = y;
            });
        }
        step() {
            var sumWidth = 0;
            this.x -= this.stepCount;
            this.tokens.forEach(token => {
                token.obj.x = this.x + sumWidth;
                sumWidth += token.width + TOKEN_SPACE;
            });
        }
        remove() {
            this.tokens.forEach(token => {
                stage.removeChild(token.obj);
            });
        }
        isHide() {
            return this.x + this.width < 0
        }
        updateWidth() {
            this.tokens.forEach(token => {
                if (token.type == TYPE_IMAGE) {
                    const image = token.obj;
                    const calcH = COMMENT_HEIGHT / image.height;
                    token.width = image.width * calcH;
                    token.obj.scale.x = calcH;
                    token.obj.scale.y = calcH;
                } else {
                    token.width = PIXI.TextMetrics.measureText(token.value, style).width;
                }
            });

            var sumWidth = 0;
            this.tokens.forEach(token => {
                token.obj.x = this.x + sumWidth;
                sumWidth += token.width + TOKEN_SPACE;
            });
            this.width = sumWidth;
            this.stepCount = Math.round((this.x + this.width) / STEP_COE);
        }
    }
    const TYPE_TEXT = 0;
    const TYPE_IMAGE = 1;
    class Token {
        constructor(type, value) {

            if (type == TYPE_TEXT) {
                this.obj = new PIXI.Text(value, style);
            } else {
                this.obj = null;
            }
            this.type = type;
            this.value = value;
            this.width = 0;
        }
    }


    function getRandomInt(max) {
        return Math.floor(Math.random() * (max + 1));
    }
    function workCustomStamp(json_data) {
        for (key in STAMP_DATA) {
            var start_index = 0;
            var search_index = 0;
            while (0 <= search_index) {
                search_index = json_data.comment.indexOf(key, start_index)
                if (0 <= search_index) {
                    var image_obj = new Object();
                    image_obj["start"] = search_index;
                    image_obj["end"] = search_index + key.length - 1;
                    const values = STAMP_DATA[key];
                    var index = 0;
                    if (1 < values.length) {
                        index = getRandomInt(values.length - 1);
                    }
                    image_obj["url"] = values[index];
                    start_index = image_obj["end"];
                    if (json_data.stamp_data_list == null) {
                        json_data.stamp_data_list = new Array();
                    }
                    json_data.stamp_data_list.push(image_obj);
                }

            }
        }
    }

    function WorkAddComment(addComment) {
        var isAdd = false;
        for (var i = 0; i < TokenListLine.length; i++) {
            let tokenList = TokenListLine[i];
            if (0 < tokenList.length) {
                let showToken = tokenList[tokenList.length - 1];
                let showTokenWidth = showToken.width;
                let x = showToken.x;
                //コメントが全て表示されているか判定 
                if (0 < boxWidth - (x + showTokenWidth + 10)) {
                    let addTokenWidth = addComment.width;
                    //コメントが追いつかない判定
                    if (addTokenWidth <= showTokenWidth + 40) {
                        tokenList.push(addComment);
                        addComment.y = i * COMMENT_HEIGHT;
                        isAdd = true;
                        break;
                    }
                }
            } else {
                addComment.y = i * COMMENT_HEIGHT;
                tokenList.push(addComment);
                isAdd = true;
                break;
            }
        }
        if (isAdd == false) {
            addComment.y = TokenListLine.length * COMMENT_HEIGHT;
            const array = new Array();
            array.push(addComment);
            TokenListLine.push(array);
        }
    }

    function addComment(json_data, complete_function) {
        workCustomStamp(json_data);
        var comment = json_data.html_comment;
        if (!comment || 0 === comment.length) {
            comment = json_data.comment;
        }
        if (!comment || 0 === comment.length) {
            comment = "　";
        }

        createComment(json_data.user_data.name, comment, json_data.type, json_data.tier, json_data.stamp_data_list, complete_function);
    }

    // コメント追加用関数
    function createComment(name, text, type, tier, stamp_data_list, complete_function) {
        if (IS_SHOW_SYSTEM_COMMENT && type == TYPE_SYSTEM_COMMENT) {
            // message.addClass("system_comment");
            complete_function();
            return;
        } else if (0 < tier) {
            // message.addClass("rainbowText");
        } else {
            // message.addClass("white_text");
        }

        const comment = new Comment(boxWidth)
        if (stamp_data_list && 0 < stamp_data_list.length) {
            stamp_data_list.sort(function (a, b) {
                return b.start - a.start;
            });
            const imageTokenList = [];
            jQuery.each(stamp_data_list, function (index, stamp_data) {
                const url = stamp_data.url.replace("https", "http");
                const front = text.substring(0, this.start);
                const back = text.slice(this.end + 1);

                if (0 < back.length) {
                    const textToken = new Token(TYPE_TEXT, back);
                    stage.addChild(textToken.obj);
                    comment.tokens.unshift(textToken);
                }
                const imageToken = new Token(TYPE_IMAGE, url);
                imageTokenList.push(imageToken);
                comment.tokens.unshift(imageToken);

                text = front;
            });
            if (0 < text.length) {
                const textToken = new Token(TYPE_TEXT, back);
                stage.addChild(textToken.obj);
                comment.tokens.unshift(textToken);
            }
            if (0 < imageTokenList.length) {
                var loadCompleteCount = 0;

                for (var i = 0; i < imageTokenList.length; i++) {
                    const token = imageTokenList[i];
                    const url = token.value;
                    if (ImageMap.has(url)) {
                        const image = ImageMap.get(token.value)
                        const sprite = new PIXI.Sprite(image)
                        token.obj = sprite;
                        stage.addChild(token.obj);
                        imageTokenList.shift(token);
                        i--;
                    }
                }
                if(0 < imageTokenList.length){
                    imageTokenList.forEach(token => {
                        const url = token.value;
                        const loader = new PIXI.Loader(); // 新規にローダーを作る場合
                        loader.add(url, url);
                        loader.load((loader, resources) => {
                            const image = resources[url].texture;
                            const sprite = new PIXI.Sprite(image)
                            ImageMap.set(url, image);
                            token.obj = sprite;
                            stage.addChild(token.obj);
                            loadCompleteCount++;
                            if (imageTokenList.length <= loadCompleteCount) {
                                comment.updateWidth();
                                WorkAddComment(comment);
                                complete_function();
                            }
                         });
                    });
                }else{
                    comment.updateWidth();
                    WorkAddComment(comment);
                    complete_function();
                }

            } else {
                comment.updateWidth();
                WorkAddComment(comment);
                complete_function();
            }

        } else {
            const textToken = new Token(TYPE_TEXT, text);
            stage.addChild(textToken.obj);
            comment.tokens.push(textToken);

            comment.updateWidth();
            WorkAddComment(comment);
            complete_function();
        }
    }


    // コメント追加用関数
    function init() {
        const obj = new Object();
        obj["user_data"] = { name: "kui", user_id: "" };
        obj["comment"] = "Hello　MCV(^∇^)/ " + VERSION;
        const stream_data = { stream_name: "", service_name: "" };
        obj["stream_data"] = stream_data;
        pushComment(obj);
    }

    init();

    const renderer = PIXI.autoDetectRenderer(
        {
            width: boxWidth,
            height: boxHeight,
            antialias: false,
            // backgroundColor:0,
            // useContextAlpha:true,
            backgroundAlpha: 0,
            transparent: true,
            // resolution: 1
        });


    document.body.appendChild(renderer.view);
    ticker.add(function (time) {
        TokenListLine.forEach(tokenList => {
            tokenList.forEach(token => {
                token.step();
            });
        });
        for (var i = 0; i < TokenListLine.length; i++) {
            const tokenList = TokenListLine[i];
            if (0 < tokenList.length && tokenList[0].isHide()) {
                const comment = tokenList.shift();
                comment.remove();
                i--;
            }
        }
        renderer.render(stage);
    });
    ticker.start();

    params = url.split("?");
    if (1 < params.length) {
        mode = params[1].split("&");
        mode = mode[0].split("=");
        if (1 < mode.length && mode[0] == "mode" && mode[1] == "debug") {
            IS_DEBUG = true;
        }
    }
    if (IS_DEBUG) {
        setInterval(function () {
            const obj = new Object();
            obj["user_data"] = { name: "kui", user_id: "" };
            obj["comment"] = "今日の天気は晴れ:" + TEST_COUNT++;
            const stream_data = { stream_name: "", service_name: "" };
            obj["stream_data"] = stream_data;
            obj["stamp_data_list"] = [{
                start: 0,
                end: 1,
                url: "https://vpic.mildom.com/download/file/jp/mildom/imgs/fa0f22e951d4ca36d016e14b12d7e79b.png",
                width: 50,
                height: 50,
            }, {
                start: 3,
                end: 4,
                url: "https://vpic.mildom.com/download/file/jp/mildom/nnfans/476cf3706758272cba1d597a24515dc7.png",
                width: 50,
                height: 50,
            }
            ]

            pushComment(obj);
        }, 100);
        StartComment(addComment);
    } else {
        // 接続
        StartComment(addComment);
        StartReceiveComment();
    }
});