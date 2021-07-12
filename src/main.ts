
import { pushComment, StartComment } from "./mcv_client";
import { JsonData, ImagePoint } from "./json_data";
import * as PIXI from "pixi.js";

//Debugモード
var IS_DEBUG = true;
/************************************************/
const VERSION = "nico_5.0.0.6";
const ImageMap = new Map<string, PIXI.Texture>()
const TokenListLine = new Array<Array<HtmlComment>>();
//フレームレート
const FPS = 60;
//コメント表示秒数
const DISPLAY_SEC = 5;
const SPECIAL_DISPLAY_SEC = 10;
const LINE_SPACING = 0;
const TOP_MERGIN = 5;
//テキストと画像の間隔
const TOKEN_SPACE = 5;
//画面横幅
const boxWidth = window.innerWidth;
//画面高幅
const boxHeight = window.innerHeight;
//リングバッファサイズ(アクティブが高い場合は増やす)
const PIXITextRingBufferSize = 100;
const PIXISpecialTextRingBufferSize = 400;

//テキストオブジェクトのリングバッファ
const PIXITextRingBuffer = new Array<PIXI.Text>();
const PIXISpecialTextRingBuffer = new Array<PIXI.Text>();

const stage = new PIXI.Container();

const TEXT_STYLE = new PIXI.TextStyle({
    fontFamily: "メイリオ",
    fill: "white",
    fontSize: 46,
    lineJoin: "round",
    fontWeight: "900",
    strokeThickness: 4
});
const TEXT_SPECIAL_STYLE = new PIXI.TextStyle({
    fontFamily: "メイリオ",
    fill: "white",
    fontSize: 24,
    lineJoin: "round",
    fontWeight: "900",
    strokeThickness: 3
});

// var horizontal = {
//     fill: ['#FF0000', '#00FF00', '#0000FF' ],
//     fillGradientStops: [0.1, 0.7, 0.8],
//     fontSize: 61,
//     fillGradientType: 1,
//     stroke: ['#EEEEEE', '#555555', '#EEEEEE', '#555555'],
//     strokeGradientStops: [0.1, 0.3, 0.7, 0.9],
//     strokeThickness: 12,
//     lineJoin: 'round'
// }
const SPRITE_HEDER = "header";
const SPRITE_NAME = "name";
const SPRITE_BOX = "box";
const SPRITE_ITEM = "item";

const COMMENT_HEIGHT = PIXI.TextMetrics.measureText("■", TEXT_STYLE).height + LINE_SPACING;
const renderer = PIXI.autoDetectRenderer(
    {
        width: boxWidth,
        height: boxHeight,
        antialias: false,
        backgroundAlpha: 0,
        // backgroundColor:0,
        // useContextAlpha:true,
        // transparent: true,//v5
        // resolution: 1,
        powerPreference: "high-performance"
    });
/************** 変更可能パラメータ **********/
// Sytem用のコメントです(広告とか放送閉じるとか(ニコ生))
const IS_SHOW_SYSTEM_COMMENT = false;

/************************************************/
// 時間情報のDataKey
const TYPE_SYSTEM_COMMENT = "System";
const TYPE_SERVICE_COMMENT = "Service";
var TEST_COUNT = 1;
var lastRender = 0;
var x = 0;
/******************************************/

const BOX_HEIGHT = COMMENT_HEIGHT - 15 - 5;
const STAMP_DATA = new Map<string, Array<string>>()

const TYPE_TEXT = 0;
const TYPE_IMAGE = 1;
const TYPE_SERVICE = 2;
class HtmlComment {
    public x: number;
    public stepCount: number;
    public tokens: Array<Token>;
    public width: number;
    public backFlg:boolean;
    public displayTime:number;
    public animation:boolean;

    constructor(x: number) {
        this.tokens = [];
        this.x = x;
        this.y = 0;
        this.stepCount = 0;
        this.width = 0;
        this.backFlg = false;
        this.displayTime = DISPLAY_SEC;
        this.animation = true;
    }
    set y(y: number) {
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
            if(token.type === TYPE_SERVICE){
                const item = token.obj.getChildAt(3);

                if(item != null){
                    if(this.animation){
                        if(this.backFlg){
                            item.angle = item.angle - 1;
                        }else{
                            item.angle = item.angle + 1;
                        }
                        if(25 < item.angle){
                            this.backFlg = true;
                        }else if(item.angle < -25){
                            this.backFlg = false;
                        }else{
                        }
                    }
                }
            }
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
            if (token.type === TYPE_IMAGE) {
                const image = token.obj;
                const calcH = COMMENT_HEIGHT / image.height;
                token.width = image.width * calcH;
                token.obj.scale.x = calcH;
                token.obj.scale.y = calcH;
            } else if (token.type === TYPE_SERVICE) {
                token.width = token.obj.width;
            } else {
                token.width = PIXI.TextMetrics.measureText(token.value, TEXT_STYLE).width;
            }
        });

        var sumWidth = 0;
        this.tokens.forEach(token => {
            token.obj.x = this.x + sumWidth;
            sumWidth += token.width + TOKEN_SPACE;
        });
        this.width = sumWidth;
        this.stepCount = Math.round((this.x + this.width) / (FPS * this.displayTime));
    }
}
class Token {
    public width: number;
    public type: number;
    public obj: PIXI.Container;
    public value: string;
    constructor(type: number, value: string) {
        if (type == TYPE_TEXT) {
            const textObj = GetText();
            textObj.text = value;
            this.obj = textObj;
        } else {
            this.obj = GetText();
        }
        this.type = type;
        this.value = value;
        this.width = 0;
    }
}

//事前にオブジェクトを作成しておく
var PIXITextRingBufferCount = 0;
for (var i = 0; i < PIXITextRingBufferSize; i++) {
    PIXITextRingBuffer.push(new PIXI.Text("", TEXT_STYLE));
}

//事前にオブジェクトを作成しておく
var PIXISpecialTextRingBufferCount = 0;
for (var i = 0; i < PIXISpecialTextRingBufferSize; i++) {
    PIXISpecialTextRingBuffer.push(new PIXI.Text("", TEXT_SPECIAL_STYLE));
}
function GetText() {
    const textObj = PIXITextRingBuffer[PIXITextRingBufferCount];
    PIXITextRingBufferCount++;
    if (PIXITextRingBufferSize <= PIXITextRingBufferCount) {
        PIXITextRingBufferCount = 0;
    }
    return textObj;
}
function GetSpecialText() {
    const textObj = PIXISpecialTextRingBuffer[PIXISpecialTextRingBufferCount];
    PIXISpecialTextRingBufferCount++;
    if (PIXISpecialTextRingBufferSize <= PIXISpecialTextRingBufferCount) {
        PIXISpecialTextRingBufferCount = 0;
    }
    return textObj;
}


function getRandomInt(max: number) {
    return Math.floor(Math.random() * (max + 1));
}

function workCustomStamp(json_data: JsonData) {
    for (var key in STAMP_DATA) {
        var start_index = 0;
        var search_index = 0;
        while (0 <= search_index) {
            search_index = json_data.comment.indexOf(key, start_index)
            if (0 <= search_index) {
                var image_obj = new ImagePoint(search_index, search_index + key.length - 1);
                const values = STAMP_DATA.get(key);
                var index = 0;
                if (values != undefined) {
                    if (1 < values.length) {
                        index = getRandomInt(values.length - 1);
                    }
                    image_obj.url = values[index];
                    start_index = image_obj.end;
                    if (json_data.stamp_data_list == null) {
                        json_data.stamp_data_list = new Array();
                    }
                    json_data.stamp_data_list.push(image_obj);
                }
            }

        }
    }
}

function WorkAddComment(addComment: HtmlComment) {
    var isAdd = false;
    for (var i = 0; i < TokenListLine.length; i++) {
        const tokenList = TokenListLine[i];
        if (0 < tokenList.length) {
            const showComment = tokenList[tokenList.length - 1];
            //コメントがすべて表示されているかチェック(マージン)
            if (showComment.x + showComment.width < boxWidth + 20) {
                const showCommentRight = showComment.width + showComment.x - (showComment.stepCount * FPS * 4);
                const addComment_after4sec_x = addComment.x - (addComment.stepCount * FPS * 4);//4秒
                //4秒後にコメントが追いつかないか判定
                if (showCommentRight < addComment_after4sec_x) {
                    tokenList.push(addComment);
                    addComment.y = i * COMMENT_HEIGHT + TOP_MERGIN;
                    isAdd = true;
                    break;
                }
            }
        } else {
            addComment.y = i * COMMENT_HEIGHT + TOP_MERGIN;
            tokenList.push(addComment);
            isAdd = true;
            break;
        }
    }
    if (isAdd == false) {
        addComment.y = TokenListLine.length * COMMENT_HEIGHT + TOP_MERGIN;
        const array = new Array();
        array.push(addComment);
        TokenListLine.push(array);
    }
}

function addComment(json_data: JsonData, complete_function: Function) {
    workCustomStamp(json_data);
    var comment = json_data.html_comment;
    if (!comment || 0 === comment.length) {
        comment = json_data.comment;
    }
    if (!comment || 0 === comment.length) {
        comment = "　";
    }

    createComment(json_data.user_data.name, json_data.user_data.img,
        comment, json_data.type, json_data.tier, json_data.tier_count, json_data.stamp_data_list, complete_function);
}

// コメント追加用関数
function createComment(name: string, userImg: string,
    text: string,
    type: string, tier: number, tier_count: number, stamp_data_list: Array<ImagePoint>, complete_function: Function) {
    const comment = new HtmlComment(boxWidth)
    if (IS_SHOW_SYSTEM_COMMENT && type === TYPE_SYSTEM_COMMENT) {
        // message.addClass("system_comment");
        complete_function();
        return;
    } else if (type === TYPE_SERVICE_COMMENT) {
        if (stamp_data_list !== null && 0 < stamp_data_list.length) {
            LoadImage(stamp_data_list[0].url, function () {
                LoadImage(userImg, function () {
                    const special = CreateSpecialContainer(name, tier_count, tier, userImg, stamp_data_list[0].url);
                    const token = new Token(TYPE_SERVICE, "");
                    token.obj = special;
                    if(2000 <= tier){
                        comment.displayTime = SPECIAL_DISPLAY_SEC;
                    }else if(tier == 0){
                        comment.animation = false;
                    }else{

                    }
                    stage.addChild(token.obj);
                    comment.tokens.push(token);

                    comment.updateWidth();
                    WorkAddComment(comment);
                    complete_function();
                });
            });
        } else {
            complete_function();
        }
        return;
    } else {
        // message.addClass("white_text");
    }

    if (stamp_data_list && 0 < stamp_data_list.length) {
        stamp_data_list.sort(function (a, b) {
            return b.start - a.start;
        });
        const imageTokenList = new Array<Token>();

        stamp_data_list.forEach(stamp_data => {
            const url = stamp_data.url.replace("https", "http");
            const front = text.substring(0, stamp_data.start);
            const back = text.slice(stamp_data.end + 1);

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
            const textToken = new Token(TYPE_TEXT, text);
            stage.addChild(textToken.obj);
            comment.tokens.unshift(textToken);
        }
        if (0 < imageTokenList.length) {

            for (var i = 0; i < imageTokenList.length; i++) {
                const token = imageTokenList[i];
                const url = token.value;
                if (ImageMap.has(url)) {
                    const image = ImageMap.get(token.value)
                    const sprite = new PIXI.Sprite(image)
                    token.obj = sprite;
                    stage.addChild(token.obj);
                    imageTokenList.shift();
                    i--;
                }
            }
            if (0 < imageTokenList.length) {
                var loadCompleteCount = 0;
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
            } else {
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
    const obj = new JsonData();
    obj["user_data"] = { name: "kui", img: "https://pbs.twimg.com/profile_images/2235314315/IMG_0332_400x400.JPG" };
    obj["comment"] = "Hello　MCV(^∇^)/ " + VERSION;
    // const stream_data = { stream_name: "", service_name: "" };
    // obj["stream_data"] = stream_data;
    pushComment(obj);
}

init();


function LoadImage(url: string, func: Function) {
    if (url != undefined && !ImageMap.has(url)) {
        const loader = new PIXI.Loader(); // 新規にローダーを作る場合
        loader.add(url, url);
        loader.onError.add((loader: PIXI.Loader, resource: PIXI.Resource) => {
            func();
        }); // called once per errored file
        loader.load((loader, resources) => {
            ImageMap.set(url, resources[url].texture);
            func();
        });

    } else {
        func();
    }
}

function GetColor(tier: number) {
    if (tier == 0) {
        return 0x0000FF;
    } else if (tier <= 200) {
        return 0x00FFFF;
    } else if (tier <= 500) {
        return 0x008000;
    } else if (tier <= 1000) {
        return 0xFFFF00;
    } else if (tier <= 2000) {
        return 0xFF6633;
    } else if (tier <= 5000) {
        return 0xFF0066;
    }
    return 0xFF0000;
}
//左から150上から75の位置に、半径60の半円を反時計回り（左回り）で描く
function CreateSpecialContainer(name: string, num: number, tier: number, headUrl: string, itemUrl: string) {
    const headerImage = ImageMap.get(headUrl)
    const itemImage = ImageMap.get(itemUrl)
    const specialStage = new PIXI.Container();

    if (itemImage !== undefined && headerImage !== undefined) {
        const itemSprite = new PIXI.Sprite(itemImage)
        const headerSprite = new PIXI.Sprite(headerImage)

        var pointX = 4;
        const pointY = 19;
        const iconSize = BOX_HEIGHT - 10;

        /** Header **/
        const graphics = new PIXI.Graphics().lineStyle(0)
            .beginFill(0x000000, 1)
            .drawCircle(pointX + (iconSize / 2), pointY + (iconSize / 2), iconSize / 2)
            .endFill();
        headerSprite.mask = graphics;
        headerSprite.x = pointX;
        headerSprite.y = pointY;
        headerSprite.width = iconSize;
        headerSprite.height = iconSize;
        headerSprite.name = SPRITE_HEDER;
        pointX = pointX + iconSize;
        /** Name **/
        const nameText = GetSpecialText();
        nameText.x = pointX + 3;
        nameText.y = 20;
        nameText.text = name;
        headerSprite.name = SPRITE_NAME;
        pointX = nameText.x + nameText.width;

        /** Item **/
        const calcH = (COMMENT_HEIGHT - 2) / itemSprite.height;
        itemSprite.scale.x = calcH;
        itemSprite.scale.y = calcH;
        itemSprite.x = pointX + 1 + (itemSprite.width / 2);
        itemSprite.y = + (itemSprite.height / 2);
        itemSprite.anchor.set(0.5);
        headerSprite.name = SPRITE_ITEM;

        pointX = pointX + 1 + itemSprite.width;
        var numText = null;
        /** Sub **/
        if (1 < num) {
            numText = GetSpecialText();
            numText.x = pointX;
            numText.y = 20;
            numText.text = "x " + num.toString();
            pointX = numText.x + numText.width;
        }
        /** Box **/
        const box = new PIXI.Graphics()
        box.beginFill(GetColor(tier),0.8)
            .drawRoundedRect(0, 15, pointX + 8, BOX_HEIGHT, 50)
            .endFill();
        box.name = SPRITE_BOX;

        if (numText != null) {
            specialStage.addChild(box,graphics,headerSprite,itemSprite,nameText,numText);
        }else{
            specialStage.addChild(box,graphics,headerSprite,itemSprite,nameText);
        }
    }

    return specialStage;
}
document.body.appendChild(renderer.view);


function animate(timestamp: number) {
    // console.log(1000/(timestamp - lastRender));

    TokenListLine.forEach(tokenList => {
        tokenList.forEach(token => {
            token.step();
        });
    });
    for (var i = 0; i < TokenListLine.length; i++) {
        const tokenList = TokenListLine[i];
        if (0 < tokenList.length && tokenList[0].isHide()) {
            const comment = tokenList.shift();
            if (comment != undefined) {
                comment.remove();
            }
            i--;
        }
    }

    lastRender = timestamp;
    renderer.render(stage);
    window.requestAnimationFrame(animate);
};

window.requestAnimationFrame(animate);



if (IS_DEBUG) {
    setInterval(function () {
        const obj = new JsonData();
        obj["user_data"] = { name: "kui", img: "https://pbs.twimg.com/profile_images/2235314315/IMG_0332_400x400.JPG" };
        var comment = "TEST:" + TEST_COUNT++;
        const length = getRandomInt(10);
        for (var i = 0; i < length; i++) {
            comment = comment + "★";
        }
        obj["comment"] = comment;
        obj["type"] = "Service";
        obj["tier_count"] = i;
        const stream_data = { stream_name: "", service_name: "" };
        if (i < 3) {
            obj["tier"] = 0;
            // obj["stream_data"] = stream_data;
            obj["stamp_data_list"] = [{
                start: 0,
                end: 1,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/5cfd61003caa8f873f3db0b6ec1ff905.png',
                width: 50,
                height: 50,
            }
            ]

        } else if (i < 6) {
            obj["tier"] = 1999;
            // obj["stream_data"] = stream_data;
            obj["stamp_data_list"] = [{
                start: 0,
                end: 1,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/5f286b7b9f4efc5e8d020a26d646b5f2.png',
                width: 50,
                height: 50,
            }
            ]
        } else if (i < 8) {
            obj["tier"] = 2000;
            // obj["stream_data"] = stream_data;
            obj["stamp_data_list"] = [{
                start: 0,
                end: 1,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/914f4fb57a7eb792b06c41bea5dfd269.png',
                width: 50,
                height: 50,
            }
            ]
        } else if (i < 10) {

            obj["tier"] = 4000;
            // obj["stream_data"] = stream_data;
            obj["stamp_data_list"] = [{
                start: 0,
                end: 1,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/9c11bafe711f18b176b76ec29e4c2823.png',
                width: 50,
                height: 50,
            }
            ]
        } else {

            obj["tier"] = 9000;
            // obj["stream_data"] = stream_data;
            obj["stamp_data_list"] = [{
                start: 0,
                end: 1,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/465a50bfb19a3580fbce507f01d9fc75.png',
                width: 50,
                height: 50,
            }
            ]
        }
        pushComment(obj);
    }, 100);
    StartComment(addComment);
} else {
    // 接続
    StartComment(addComment);
}
