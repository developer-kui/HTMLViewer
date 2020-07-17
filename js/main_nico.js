$(function () {
    try {
        const VERSION = "nico_4.2.3.0";
        /************** 変更可能パラメータ **********/
        // コメントの表示時間：短くなるとコメントの流れる速度も早くなる（ms）
        const COMMENT_DISPLAY_TIME = 5.5;
        // Sytem用のコメントです(広告とか放送閉じるとか(ニコ生))
        const IS_SHOW_SYSTEM_COMMENT = true;
        // 投稿者のコメントの表示
        const IS_SHOW_NAME = false;
        /* 情報欄(コメントの右側)に表示させる情報のパターン */
        //サービス名(YoubueLiveやOPENRECやTwitch)
        const INFO_SERVICE_NAME = 0;
        /************************************************/
        //コメント番号(MCVで付与したもの)
        const INFO_INDEX = 1;//変更不可
        //配信名(MCVで名前を付けたもの)
        const INFO_STREAM_NAME = 2;//変更不可
        //非表示
        const NOT_DISPLAY = 3;//変更不可
        //表示させたい情報を上記から選ぶ
        const SHOW_INFO = NOT_DISPLAY;
        /************************************************/
        const TranslateXRegex = new RegExp(/[+-]?(?:\d+\.?\d*|\.\d+)/u);

        const STAMP_DATA = {
            //Key（左）に置き換え文字
            //Value（右）に対象の画像URL
            //HTTP経由でもOK
            // "(^^)/": ["./img/kawaii.png","./img/kawaii2.png"],
            // "サイコロ": ["./img/サイコロ1.png",
            //  "./img/サイコロ2.png",
            //   "./img/サイコロ3.png", 
            //   "./img/サイコロ4.png", 
            //   "./img/サイコロ5.png",
            //    "./img/サイコロ6.png"],
        };

        /************************************************/
        //Debugモード
        var IS_DEBUG = false;
        /************************************************/
        // 時間情報のDataKey
        const FIRST_ANIMATION = "FIRST_ANIMATION";
        const TYPE_SYSTEM_COMMENT = 1;
        var TEST_COUNT = 1;
        // コメント格納用変数
        const message_box = $('#message_box');
        var COMMENT_HEIGHT = 0;
        // コメント格納用配列
        const comment_array = new Array();
        /******************************************/
        const transitionEndEvents = [
            "webkitTransitionEnd",
            "mozTransitionEnd",
            "oTransitionEnd",
            "transitionend"
        ];
        const transitionEnd = transitionEndEvents.join(" ");

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
                        const index = 0;
                        if (1 < values.length) {
                            index = getRandomInt(values.length);
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
        function addComment(json_data, complete_function) {
            workCustomStamp(json_data);
            const name = json_data.user_data.name;
            var comment = json_data.comment;
            if (comment == null || 0 == comment.length) {
                comment = "　";
            }
            var provider = "";
            switch (SHOW_INFO) {
                case INFO_INDEX:
                    provider = json_data.index;
                    break;
                case INFO_STREAM_NAME:
                    provider = json_data.stream_data.stream_name;
                    break;
                case INFO_SERVICE_NAME:
                    provider = json_data.stream_data.service_name;
                    break;
                case NOT_DISPLAY:
                default:
                    break;
            }
            const type = json_data.type;
            const stamp_data_list = json_data.stamp_data_list;
            createComment(name, comment, provider, type, stamp_data_list, complete_function);
        }

        // コメント追加用関数
        function createComment(name, comment, provider, type, stamp_data_list, complete_function) {
            const message = $('<p />', {}).addClass('comment');
            if (IS_SHOW_SYSTEM_COMMENT && type == TYPE_SYSTEM_COMMENT) {
                message.addClass("system_comment");
                complete_function();
                return;
            } else {
                message.addClass("white_text");
            }

            const provider_elemet = $("<span></span>").addClass("white_provider_text");
            provider_elemet.text(provider);
            if (stamp_data_list && 0 < stamp_data_list.length) {
                stamp_data_list.sort(function (a, b) {
                    return b.start - a.start;
                });
                const comment_element_array = new Array();
                const image_obj_array = new Array();
                const image_src_array = new Array();
                jQuery.each(stamp_data_list, function () {
                    const front = comment.substring(0, this.start);
                    const back = comment.slice(this.end + 1);
                    const image_elemet = $("<img/>").addClass("stamp");
                    //スタンプの高さは文字の高さに合わせる
                    image_elemet.height(COMMENT_HEIGHT);

                    image_obj_array.push(image_elemet);
                    image_src_array.push(this.url.replace("https", "http"));

                    const back_element = $("<span></span>").text(back);
                    comment_element_array.unshift(back_element);
                    comment_element_array.unshift(image_elemet);
                    comment = front;
                });
                if (IS_SHOW_NAME) {
                    message.append($("<span></span>").text(name + ":" + comment));
                } else {
                    message.append($("<span></span>").text(comment));
                }

                jQuery.each(comment_element_array, function () {
                    message.append(this);
                });
                message.append(provider_elemet);

                var load_count = image_obj_array.length;
                for (var i = 0; i < image_obj_array.length; i++) {
                    const image_elemet = image_obj_array[i]
                    image_elemet.bind('load', function () {
                        load_count = load_count - 1;
                        if (load_count == 0) {
                            workComment(message, complete_function);
                        }
                    });
                    image_elemet.attr("src", image_src_array[i]);
                }
            } else {
                if (IS_SHOW_NAME) {
                    message.text(name + ":" + comment);
                } else {
                    message.text(comment);
                }
                message.append(provider_elemet);
                workComment(message, complete_function);
            }
        }
        function WorkAddComment(addElement) {
            var line = 0;
            var isAdd = false;
            const boxWidth = message_box.outerWidth(true);
            for (var i = 0; i < comment_array.length; i++) {
                const array = comment_array[i];
                if (0 < array.length) {
                    const commentElement = array[array.length - 1];
                    const webkitTransform = commentElement[0].style.webkitTransform;
                    const matchResult = webkitTransform.match(TranslateXRegex);
                    //Animationが始まってない場合はwebkitTransform null
                    if (matchResult && 0 < matchResult.length) {
                        const elementWidth = commentElement.outerWidth(true);
                        const left = commentElement.position().left;
                        const isAllShow = 0 < boxWidth - left - elementWidth + 10;
                        //コメントが全て表示されているか判定 
                        if (isAllShow) {
                            const addElementWidth = addElement.outerWidth(true);
                            //コメントが追いつかない判定
                            if (addElementWidth <= elementWidth + 50) {
                                array.push(addElement);
                                isAdd = true;
                                line = i;
                                break;
                            }
                        }
                    }
                } else {
                    array.push(addElement);
                    isAdd = true;
                    line = i;
                    break;
                }
            }
            if (isAdd == false) {
                line = comment_array.length;
                const array = new Array();
                array.push(addElement);
                comment_array.push(array);
            }
            return line;
        }
        function workComment(message, complete_function) {
            const boxWidth = message_box.outerWidth(true);
            //画面外に一度表示させる
            message.css("left", boxWidth + "px");
            message.appendTo(message_box);
            //表示させている幅を取得
            const msWidth = message.outerWidth(true);
            if (COMMENT_HEIGHT == 0) {
                COMMENT_HEIGHT = message.outerHeight(true);
            }
            const line = WorkAddComment(message);
            message.css("top", COMMENT_HEIGHT * line + "px");
            message.css('transition', 'transform 5s');
            message.css('transition-timing-function', 'linear');
            // message.css('will-change', 'transform');
            message.css('transform', 'translateX(-' + (boxWidth + msWidth) + 'px)');

            message.on(transitionEnd, function() {
                const array = comment_array[line];
                if (0 < array.length) {
                    array.shift().remove();
                }
            });
            message.dequeue(FIRST_ANIMATION);
            complete_function();
        }

        // コメント追加用関数
        function init() {
            const obj = new Object();
            obj["user_data"] = { name: "kui", user_id: "" };
            obj["comment"] = "Hello　MCV(^^)/" + VERSION;
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
                obj["comment"] = "TEST:" + TEST_COUNT++;
                const stream_data = { stream_name: "", service_name: "" };
                obj["stream_data"] = stream_data;
                pushComment(obj);
            }, 50);
            StartComment(addComment);
        } else {
            // 接続
            StartComment(addComment);
            StartReceiveComment();
        }
    }
    catch (e) {
        alert(e);
    }
});