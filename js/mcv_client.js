// WebSocketオブジェクト
let webSocket = null;
let comment_obj_array = new Array();

let comment_listener = null;
let mcv_url = null;
// Localアクセスサーバー
const MCV_WS_URL = "ws://localhost:51021";
const VERSION = "4.0.0.3";

function StartReceiveComment(url = MCV_WS_URL) {
    // WebSocket の初期化
    if (webSocket == null) {
        mcv_url = url;
        open();
    }
}
function StartComment(listener) {
    comment_listener = listener;
    setTimeout(
        function () {
            SendComment()
        }, 100);
}
function open() {
    webSocket = new WebSocket(mcv_url);
    // イベントハンドラの設定
    webSocket.onopen = onOpen;
    webSocket.onmessage = onMessage;
    webSocket.onclose = onClose;
    webSocket.onerror = onError;
}
// 接続イベント
function onOpen(event) {
}

function pushComment(json) {
    comment_obj_array.push(json);
}
function SendComment() {
    if (0 < comment_obj_array.length) {
        setZeroTimeout(
            function () {
                json = comment_obj_array[0];
                comment_obj_array.shift();
                if (comment_listener) {
                    comment_listener(json, SendComment);
                }
            }, 0);
    } else {
        setTimeout(SendComment, 50);
    }
}
// メッセージ受信イベント
function onMessage(event) {
    if (event && event.data) {
        let json = $.parseJSON(event.data);
        pushComment(json);
    }
}

// エラーイベント
function onError(event) {
}

// 切断イベント
function onClose(event) {
    webSocket = null;
    setTimeout(open(), 100);
}


(function () {
    var timeouts = [],
        messageName = 'zero-timeout-message';

    function setZeroTimeoutPostMessage(fn) {
        timeouts.push(fn);
        window.postMessage(messageName, '*');
    }

    function setZeroTimeout(fn) {
        setTimeout(fn, 0);
    }

    function handleMessage(event) {
        if (event.source == window && event.data == messageName) {
            if (event.stopPropagation) {
                event.stopPropagation();
            }
            if (timeouts.length) {
                timeouts.shift()();
            }
        }
    }

    if (window.postMessage) {
        if (window.addEventListener) {
            window.addEventListener('message', handleMessage, true);
        } else if (window.attachEvent) {
            window.attachEvent('onmessage', handleMessage);
        }
        window.setZeroTimeout = setZeroTimeoutPostMessage;
    } else {
        window.setZeroTimeout = setZeroTimeout;
    }
}());