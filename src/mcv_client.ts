import { JsonData } from "./json_data"; // ボタン生成関数をインポート

// WebSocketオブジェクト
// Localアクセスサーバー
const MCV_WS_URL = "ws://localhost:51021";

let webSocket = new WebSocket(MCV_WS_URL);
webSocket.onopen = onOpen;
webSocket.onmessage = onMessage;
webSocket.onclose = onClose;
webSocket.onerror = onError;

function reconnect(){
    webSocket = new WebSocket(MCV_WS_URL);
    // イベントハンドラの設定
    webSocket.onopen = onOpen;
    webSocket.onmessage = onMessage;
    webSocket.onclose = onClose;
    webSocket.onerror = onError;
}

const comment_obj_array = new Array<JsonData>();
var commentListener: Function;

export function StartComment(listener: Function) {
    commentListener = listener;
    setTimeout(SendComment, 100);
}

// 接続イベント
function onOpen() {
}

export function pushComment(json: JsonData) {
    comment_obj_array.push(json);
}
function SendComment() {
    if (0 < comment_obj_array.length) {
        const func = function () {
            const json = comment_obj_array[0];
            comment_obj_array.shift();
            if (json != undefined && commentListener) {
                commentListener(json, SendComment);
            }else{
                setTimeout(func,0);
            }
        };
        setTimeout(func,0);
    } else {
        setTimeout(SendComment, 50);
    }
}
// メッセージ受信イベント
function onMessage(this: WebSocket, event: MessageEvent) {
    if (event && event.data) {
        const json = JSON.parse(event.data);
        console.log(json);
        pushComment(json);
    }
}

// エラーイベント
function onError(event: Event) {
    // console.error(event.me);
    webSocket.close();
}

// 切断イベント
function onClose() {
    setTimeout(reconnect, 1000);
}


