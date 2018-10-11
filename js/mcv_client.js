// WebSocketオブジェクト
let webSocket = null;
let comment_obj_array = new Array();

let comment_listener = null;
let mcv_url = null;
// Localアクセスサーバー
const MCV_WS_URL = "ws://localhost:51021";
const VERSION = "4.0.0.1";


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

function pushComment(json){
    comment_obj_array.push(json);
}
function SendComment() {
    if (0 < comment_obj_array.length) {
        json = comment_obj_array[0];
        comment_obj_array.shift();
        if (comment_listener) {
            comment_listener(json, SendComment);
        }
    } else {
        setTimeout(
            function () {
                SendComment()
            }, 100);
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