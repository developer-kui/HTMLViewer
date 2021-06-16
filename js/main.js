$(function () {
    // try {
        //2021/03/23 Update
        const VERSION = "nico_5.0.0.1";
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

        let ImageMap = new Map()
        class Comment {
            constructor(x) {
                this.tokens = [];
                this.x = x;
                this.y = 0;
                this.stepCount = 0;
                this.width = 0;
            }
            step() {
                this.x -= this.stepCount;
            }
            isHide() {
                return this.x + this.width < 0
            }
            updateWidth() {
                this.tokens.forEach(token => {
                    if (token.type == TYPE_IMAGE) {
                        let image = ImageMap.get(token.value)
                        let calcH = COMMENT_HEIGHT / image.height;
                        token.width = image.width * calcH;
                    }
                });

                this.tokens.forEach(token => {
                    this.width += token.width;
                });
                this.width += (this.tokens.length - 1) * TOKEN_SPACE;
                this.stepCount = Math.round((this.x + this.width) / STEP_COE);
            }
        }
        let TYPE_TEXT = 0;
        let TYPE_IMAGE = 1;
        class Token {
            constructor(type, value) {
                this.type = type;
                this.value = value;
                this.width = 0;
            }
        }

        var lastCalledTime;
        var fps;

        function CalcFps() {
            let now = Date.now();
            if (lastCalledTime) {
                delta = (now - lastCalledTime) / 1000;
                // fps = 1/delta;
                fps = Math.round(1 / delta);
                lastCalledTime = now;
            } else {
                lastCalledTime = now;
                fps = 0;
            }
        }
        let TOKEN_SPACE = 5;
        function drawComment(ctx, comment) {
            var x = comment.x;
            let y = comment.y;
            comment.tokens.forEach(token => {
                ctx.fillStyle = "white";
                ctx.strokeStyle = "black"
                if (token.type == TYPE_TEXT) {
                    ctx.strokeText(token.value, x, y);
                    ctx.fillText(token.value, x, y);
                } else if (token.type == TYPE_IMAGE) {
                    let image = ImageMap.get(token.value);
                    ctx.drawImage(image, x, y, token.width, COMMENT_HEIGHT);
                } else {

                }
                x += token.width + TOKEN_SPACE;
            });
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
        // increment by 1 on each frame;
        var box = document.getElementById('message_box');
        var ctx = box.getContext('2d');
        ctx.font = "900 46px 'メイリオ'";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        let boxWidth = box.width;//1920
        let boxHeight = box.height;//1920
        let TokenListLine = []

        let FPS = 60;
        let DISPLAY_SEC = 5;
        let STEP_COE = FPS * DISPLAY_SEC;
        let LINE_SPACING = 5;
        let COMMENT_HEIGHT = 46 + LINE_SPACING;

        function draw() {
            ctx.clearRect(0, 0, boxWidth, boxHeight); // 本来は必要な部分だけクリアした方が高速
            ctx.fillStyle = "white";
            ctx.strokeStyle = "black"

            ctx.lineWidth = "6";
            ctx.lineJoin = "round";
            // ctx.miterLimit = "5"
            // ctx.strokeStyle = "red"
            CalcFps();
            TokenListLine.forEach(tokenList => {
                tokenList.forEach(token => {
                    drawComment(ctx, token);
                    token.step();
                });
            });

            for (var i = 0; i < TokenListLine.length; i++) {
                let tokenList = TokenListLine[i];
                if (0 < tokenList.length && tokenList[0].isHide()) {
                    tokenList.shift();
                }
            }


            // ctx.strokeText(fps, 0, 0);
            // ctx.fillText(fps, 0, 0);

            // ctx.fillText(boxWidth, 0, 400);
            // ctx.fillText(mesure.fontBoundingBoxAscent , 0, 500);
            // ctx.fillText(mesure.actualBoundingBoxAscent , 0, 600);
            // ctx.fillText(x, 0, 500);

            // CalcFps();
            // drawText(ctx, comment.text, comment.x, comment.y);
            // ctx.drawImage(chara, 0, 0, 100, 100);  // ★ここを変更★
            window.requestAnimationFrame(draw);
            // const chara = new Image();
            // chara.src = "https://isscdn.mildom.tv/download/file/jp/mildom/nnphotos/c0fa77fc8da005616570c512c4418e0c.png";
            // chara.onload = () => {
            //     ctx.clearRect(0, 0, 1980,1280); // 本来は必要な部分だけクリアした方が高速
            //     ctx.font = "900 160px 'メイリオ'";
            //     ctx.textAlign = "left";
            //     ctx.textBaseline = "top";
            //     drawText(ctx, fps, 0, 0);
            //     i = i + 1;
            //     // ctx.drawImage(chara, 0, 0, 100, 100);  // ★ここを変更★
            //     window.requestAnimationFrame(draw);
            // };
            // ctx.fillStyle = "green";
            // ctx.font = "900 28px 'メイリオ'";
            // // ctx.shadowColor = "red" // 文字列
            // // ctx.shadowOffsetX = 10; // 整数
            // // ctx.shadowOffsetY = 10; // 整数
            // // ctx.shadowBlur = 1; // 整数

            // // ctx.fillText("今日の天気", 20, 50);
            // ctx.fillStyle = "green";
            // ctx.lineWidth = "6";
            // ctx.lineJoin = "round";
            // ctx.miterLimit = "5"
            // ctx.strokeStyle = "red"
            // ctx.strokeText("今日の天気", 20, 150);
        }
        draw();


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

            let comment = new Comment(boxWidth)
            if (stamp_data_list && 0 < stamp_data_list.length) {
                stamp_data_list.sort(function (a, b) {
                    return b.start - a.start;
                });
                let imageUrlList = [];
                jQuery.each(stamp_data_list, function (index, stamp_data) {
                    let url = stamp_data.url.replace("https", "http");
                    let front = text.substring(0, this.start);
                    let back = text.slice(this.end + 1);

                    if (0 < back.length) {
                        let textToken = new Token(TYPE_TEXT, back);
                        textToken.width = ctx.measureText(back).width;
                        comment.tokens.unshift(textToken);
                    }
                    let imageToken = new Token(TYPE_IMAGE, url);
                    imageToken.width = 100;
                    comment.tokens.unshift(imageToken);
                    if (!ImageMap.has(url) && !imageUrlList.includes(url)) {
                        imageUrlList.push(url);
                    }

                    text = front;
                });
                if (0 < text.length) {
                    let textToken = new Token(TYPE_TEXT, text);
                    textToken.width = ctx.measureText(text).width;
                    comment.tokens.unshift(textToken);
                }
                if (0 < imageUrlList.length) {
                    var loadCompleteCount = 0;
                    imageUrlList.forEach(url => {
                        let image = new Image();
                        image.onload = () => {
                            loadCompleteCount++;
                            if (loadCompleteCount <= imageUrlList.length) {
                                comment.updateWidth();
                                WorkAddComment(comment);
                                complete_function();
                            }
                        }
                        ImageMap.set(url, image);
                        image.src = url;
                    });
                } else {
                    comment.updateWidth();
                    WorkAddComment(comment);
                    complete_function();
                }

            } else {
                let textToken = new Token(TYPE_TEXT, text);
                textToken.width = ctx.measureText(text).width;
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

        const url = location.href;
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
                obj["comment"] = "カクTEST:" + TEST_COUNT++;
                const stream_data = { stream_name: "", service_name: "" };
                obj["stream_data"] = stream_data;
                // obj["stamp_data_list"] = [{
                //     start: 0,
                //     end: 1,
                //     url: "https://vpic.mildom.com/download/file/jp/mildom/imgs/fa0f22e951d4ca36d016e14b12d7e79b.png",
                //     width: 50,
                //     height: 50,
                // }, {
                //     start: 3,
                //     end: 4,
                //     url: "https://vpic.mildom.com/download/file/jp/mildom/nnfans/476cf3706758272cba1d597a24515dc7.png",
                //     width: 50,
                //     height: 50,
                // }, {
                //     start: 8,
                //     end: 9,
                //     url: "https://vpic.mildom.com/download/file/jp/mildom/imgs/87e483cad9c6f75b4c8c4ac6d8965ee8.png",
                //     width: 50,
                //     height: 50,
                // }
                // ]

                pushComment(obj);
            }, 20);
            StartComment(addComment);
        } else {
            // 接続
            StartComment(addComment);
            StartReceiveComment();
        }
    // }
    // catch (e) {
    //     alert(e);
    // }
});