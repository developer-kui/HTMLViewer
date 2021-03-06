$(function () {
    try {
        //2021/03/23 Update
        const VERSION = "4.3.0.1";
        /************** 変更可能パラメータ **********/
        // コメントの最大表示数
        const DISPLAY_COMMENT = 3;
        // コメントの表示加速度(1秒以内にコメントが連続するとこの値だけ加速)
        // ※一秒以内にコメントが到着しないと速度はMIN_COMMENT_DURATIONまで戻る
        const COMMENT_ACCELERATION = 100;
        // コメントの最遅速度(初速)
        const MIN_COMMENT_DURATION = 200;
        // コメントの最速速度(最高速)
        const MAX_COMMENT_DURATION = 50;
        // コメントが追加された時に既存のコメントが上がる速度
        const COMMENT_UP_DURATION = 10;
        // 表示されたコメントが削除されるまでの時間(msec)
        // 0を指定することで自動でコメントが消えなくなります
        const DELETE_COMMENT_TIME = 0;
        // 表示されたコメントが消える場合に右に戻る速度
        const DELETE_COMMENT_DURATION = 100;
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
        /* コメント登場アニメーション */
        //横アニメーション（右から左）（Default）
        const ANIMATION_HORIZON  = 1;//変更不可
        //縦アニメーション（下から上）
        const ANIMATION_VERTICAL = 2;//変更不可
        //アニメーションの種類（ANIMATION_HORIZON or ANIMATION_VERTICAL）
        const COMMENT_ANIMATION = ANIMATION_VERTICAL;

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
        const DATA_ADD_TIME_KEY = "ADD_TIME_KEY";

        const FIRST_ANIMATION = "FIRST_ANIMATION";
        const TYPE_SYSTEM_COMMENT = "System";
        const TYPE_SERVICE_COMMENT = "Service";

        var TEST_COUNT = 1;

        // コメント格納用変数
        const message_box = $('#message_box');

        // コメント格納用配列
        const comment_array = new Array();

        let comment_add_time = new Date().getTime();
        let duration = MIN_COMMENT_DURATION;
        /******************************************/

        function deleteElement(elem) {
            //表示させている幅を取得
            const msWidth = elem.outerWidth(true); 
            elem.velocity("finish").velocity({
                translateX: [msWidth + 'px']
            }, {
                duration: DELETE_COMMENT_DURATION,
                queue: false,
                complete: function (elements) {
                    setTimeout(function () {
                        const delete_array = $.inArray(elem, comment_array)
                        for (var i = 0; i <= delete_array; i++) {
                            comment_array.shift().remove();
                        }
                    }, 10);
                }
            });
        }
        function deleteComment(delete_time) {
            if (delete_time <= 0) {
                return;
            }
            setInterval(function () {
                $.each(comment_array,
                    function (index, elem) {
                        const add_time = $.data(elem, DATA_ADD_TIME_KEY);
                        const now = new Date();
                        if (add_time + delete_time < now.getTime()) {
                            deleteElement(elem);
                            return false;
                        }
                    }
                );
            }, 500);
        }
        // コメントアニメーション計算処理
        function calcDuration(now_time) {
            const diff = now_time - comment_add_time;
            if (diff < 1500) {
                if (MAX_COMMENT_DURATION < duration) {
                    duration -= COMMENT_ACCELERATION;
                }
            } else {
                duration = MIN_COMMENT_DURATION;
            }
            comment_add_time = now_time;
            return duration;
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
            var comment = json_data.html_comment;
            if (!comment || 0 === comment.length) {
                comment = json_data.comment;
            }
            if (!comment || 0 === comment.length) {
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
            createComment(json_data.user_data.name, comment, provider, json_data.type,json_data.tier, json_data.stamp_data_list, complete_function);
        }
        // コメント追加用関数
        function createComment(name, comment, provider, type, tier, stamp_data_list, complete_function) {
            const message = $('<p />', {}).addClass('comment');
            if (IS_SHOW_SYSTEM_COMMENT && type === TYPE_SYSTEM_COMMENT) {
                message.addClass("system_comment");
                complete_function();
                return;
            } else if(0 < tier) {
                message.addClass("rainbowText");
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

                    image_obj_array.push(image_elemet);
                    image_src_array.push(this.url.replace("https", "http"));

                    // image_elemet.css("height","");
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
        function workComment(message, complete_function) {
            const now_time = new Date().getTime();
            //時刻の設定
            $.data(message, DATA_ADD_TIME_KEY, now_time);

            const comments = message_box.children();
            if (DISPLAY_COMMENT <= comments.length) {
                const delete_obj = comment_array.shift();

                if (delete_obj) {
                    delete_obj.hide();
                    delete_obj.remove();
                }
            }
            if(COMMENT_ANIMATION == ANIMATION_HORIZON){
                //画面外に一度表示させる
                message.css("left",+200+"%");
                message.appendTo(message_box);
                //表示させている幅を取得
                const msWidth = message.outerWidth(true); 
                //改めて設定
                message.css("left",msWidth+"px");
                // 新規コメントを左に移動
                message.velocity({
                    translateX: [-msWidth+"px"],
                }, {
                    duration: calcDuration(now_time),
                    queue: FIRST_ANIMATION,
                    complete: complete_function
                });
            }else{
                message.css("bottom",-200+"%");
                message.appendTo(message_box);
                const msHeight = message.outerHeight(true); 
                message.css("bottom",-msHeight+"px");
                message.velocity({
                    translateY: '-=' + msHeight
                }, {
                    duration: COMMENT_UP_DURATION,
                    easing: [0.55, 0.085, 0.68, 0.53],
                    queue: FIRST_ANIMATION,
                    complete: complete_function
                });
            }


            if (0 < comment_array.length) {
                //コメントを上に移動 
                const move_up = message.outerHeight();
                var count = comment_array.length;
                $.each(comment_array,
                    function (index, elem) {
                        elem.velocity({
                            translateY: '-=' + move_up
                        }, {
                            queue: false,
                            duration: COMMENT_UP_DURATION,
                            easing: [0.55, 0.085, 0.68, 0.53],
                            complete: function (elements) {
                                count = count - 1;
                                if (count == 0) {
                                    message.dequeue(FIRST_ANIMATION);
                                    comment_array.push(message);
                                }
                            }
                        });
                    }
                );
            } else {
                message.dequeue(FIRST_ANIMATION);
                comment_array.push(message);
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

        deleteComment(DELETE_COMMENT_TIME);
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
                obj["stamp_data_list"]=[{
                    start:0,
                    end:1,
                    url:"https://vpic.mildom.com/download/file/jp/mildom/imgs/fa0f22e951d4ca36d016e14b12d7e79b.png",
                    width:50,
                    height:50,
                },{
                    start:3,
                    end:4,
                    url:"https://vpic.mildom.com/download/file/jp/mildom/nnfans/476cf3706758272cba1d597a24515dc7.png",
                    width:50,
                    height:50,
                },{
                    start:8,
                    end:9,
                    url:"https://vpic.mildom.com/download/file/jp/mildom/imgs/87e483cad9c6f75b4c8c4ac6d8965ee8.png",
                    width:50,
                    height:50,
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

    }
    catch (e) {
        alert(e);
    }
});