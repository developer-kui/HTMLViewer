
import { pushComment, StartComment } from "./mcv_client";
import { JsonData, ImagePoint } from "./json_data";
import { HtmlComment } from "./html_comment";
import * as PIXI from "pixi.js";

//Debugモード
var IS_DEBUG = false;
/************************************************/
const VERSION = "nico_5.0.1.1";
const TokenListLine = new Array<Array<HtmlComment>>();
//フレームレート
const FPS = 60;
//コメント表示秒数
const DISPLAY_SEC = 5;
const SPECIAL_DISPLAY_SEC1 = 7;
const SPECIAL_DISPLAY_SEC2 = 10;
const SPECIAL_DISPLAY_SEC3 = 13;
const LINE_SPACING = 0;
const TOP_MERGIN = 5;
//画面横幅
const boxWidth = window.innerWidth;
//画面高幅
const boxHeight = window.innerHeight;
const stage = new PIXI.Container();
const TEXT_STYLE = new PIXI.TextStyle({
    fontFamily: "MS P ゴシック",
    fill: "white",
    fontSize: 46,
    lineJoin: "round",
    fontWeight: "900",
    strokeThickness: 4
});
const TEXT_SPECIAL_STYLE = new PIXI.TextStyle({
    fontFamily: "MS P ゴシック",
    fill: "white",
    // fill: ['#FF0000', '#00FF00', '#0000FF'],
    // fillGradientStops: [0.1, 0.7, 0.8],
    // fillGradientType: 1,
    fontSize: 36,
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
        powerPreference: "high-performance"
    });
document.body.appendChild(renderer.view);
/************** 変更可能パラメータ **********/
// Sytem用のコメントです(広告とか放送閉じるとか(ニコ生))
const IS_SHOW_SYSTEM_COMMENT = false;

/************************************************/
// 時間情報のDataKey
const TYPE_SYSTEM_COMMENT = "System";
const TYPE_SERVICE_COMMENT = "Service";
var TEST_COUNT = 1;
/******************************************/

const BOX_HEIGHT = COMMENT_HEIGHT - 15 - 5;
const STAMP_DATA = new Map<string, Array<string>>()

const TYPE_TEXT = 0;
const TYPE_IMAGE = 1;
const TYPE_SERVICE = 2;


function GetText(text: string) {
    return new PIXI.Text(text, TEXT_STYLE);
}
function GetSpecialText(text: string) {
    return new PIXI.Text(text, TEXT_SPECIAL_STYLE);
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

const MILDOM_SKIP_MESSAGE_ID_SET = new Set<number>([
    4,//フォロー通知
    14,//入出通知
    18,//ギフトの文字列部分
    24//Clipの文字列部分
]);
function isSkipCheck(json_data: JsonData) {
    var isSkip = false;
    if (json_data.stream_data.service_type == "Mildom") {
        isSkip = MILDOM_SKIP_MESSAGE_ID_SET.has(json_data.message_id);
    }
    return isSkip;
}
function addComment(json_data: JsonData, complete_function: Function) {

    if (isSkipCheck(json_data)) {
        complete_function();
        return;
    }
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

function CreateSpecialToken(tier: number, count: number, comment: HtmlComment) {
    var num = tier;
    if (0 < count) {
        num = tier * count;
    }
    if (999 <= num) {
        comment.displayTime = SPECIAL_DISPLAY_SEC3;
    } else if (99 <= num) {
        comment.displayTime = SPECIAL_DISPLAY_SEC2;
    } else if (9 <= num) {
        comment.displayTime = SPECIAL_DISPLAY_SEC1;
    } else {

    }
    if (0 < num) {
        comment.animation = true;
    }

    comment.updateStepCount(FPS);
    stage.addChild(comment.tokens);
    WorkAddComment(comment);
}
// コメント追加用関数
function createComment(name: string, userImg: string,
    text: string,
    type: string, tier: number, tier_count: number, stamp_data_list: Array<ImagePoint>, complete_function: Function) {
    if (IS_SHOW_SYSTEM_COMMENT && type === TYPE_SYSTEM_COMMENT) {
        // message.addClass("system_comment");
        complete_function();
        return;
    } else if (type === TYPE_SERVICE_COMMENT) {
        const comment = new HtmlComment(boxWidth, DISPLAY_SEC, new PIXI.Container())
        const loader = new PIXI.Loader(); // 新規にローダーを作る場合
        if (userImg == null) {
            userImg = "https://www.mildom.com/assets/file/640bdc40a3d0fd78e9229a7751dc995d.png";
        }
        loader.add(userImg, userImg);
        loader.onError.add((loader: PIXI.Loader, resource: PIXI.Resource) => {
            complete_function();
        });
        if (stamp_data_list !== null && 0 < stamp_data_list.length) {
            loader.add(stamp_data_list[0].url, stamp_data_list[0].url);
            loader.load((loader, resources) => {
                CreateSpecialContainer(comment.tokens, name, tier_count, tier,
                    resources[userImg].texture, resources[stamp_data_list[0].url].texture);
                CreateSpecialToken(tier, tier_count, comment);
                complete_function();
            });
        } else {
            loader.load((loader, resources) => {
                CreateSpecialContainerTextOnly(comment.tokens, name, text, tier, resources[userImg].texture);
                CreateSpecialToken(tier, tier_count, comment);
                complete_function();
            });

        }
        return;
    } else {
        // message.addClass("white_text");
    }

    if (stamp_data_list && 0 < stamp_data_list.length) {
        const comment = new HtmlComment(boxWidth, DISPLAY_SEC, new PIXI.Container())
        stamp_data_list.sort(function (a, b) {
            return b.start - a.start;
        });
        const tokenArray = new Array<[number, string]>();

        stamp_data_list.forEach(stamp_data => {
            const url = stamp_data.url.replace("https", "http");
            const front = text.substring(0, stamp_data.start);
            const back = text.slice(stamp_data.end + 1);

            if (0 < back.length) {
                tokenArray.push([TYPE_TEXT, back]);
            }
            tokenArray.push([TYPE_IMAGE, url]);
            text = front;
        });

        if (0 < text.length) {
            tokenArray.push([TYPE_TEXT, text]);
        }

        tokenArray.reverse();
        const loader = new PIXI.Loader(); // 新規にローダーを作る場合
        const checkSet = new Set()
        tokenArray.forEach(token => {
            if (token[0] == TYPE_IMAGE) {
                if (!checkSet.has(token[1])) {
                    checkSet.add(token[1])
                    loader.add(token[1], token[1]);
                }
            }
        });
        loader.load((loader, resources) => {
            tokenArray.forEach(token => {
                if (token[0] == TYPE_IMAGE) {
                    const image = resources[token[1]].texture;
                    const sprite = new PIXI.Sprite(image)
                    // ImageMap.set(token[1], image);
                    comment.tokens.addChild(sprite);
                } else {
                    const textToken = GetText(token[1]);
                    comment.tokens.addChild(textToken);
                }
            });
            comment.updateWidth(FPS, COMMENT_HEIGHT);
            stage.addChild(comment.tokens);
            WorkAddComment(comment);
            complete_function();
        });

    } else {
        const textObj = GetText(text);
        const comment = new HtmlComment(boxWidth, DISPLAY_SEC, textObj);

        comment.updateWidth(FPS, COMMENT_HEIGHT);
        stage.addChild(comment.tokens);
        WorkAddComment(comment);
        complete_function();
    }
}

// コメント追加用関数
function init() {
    const obj = new JsonData();
    obj["user_data"] = { name: "kui", img: "https://pbs.twimg.com/profile_images/2235314315/IMG_0332_400x400.JPG", is_master: true };
    obj["comment"] = "Hello　MCV(^∇^)/ " + VERSION;
    // const stream_data = { stream_name: "", service_name: "" };
    // obj["stream_data"] = stream_data;
    pushComment(obj);
}

init();


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
function CreateSpecialContainer(specialStage: PIXI.Container, name: string, num: number, tier: number, headerImage: PIXI.Texture, itemImage: PIXI.Texture) {

    if (itemImage !== undefined && headerImage !== undefined && itemImage !== undefined) {
        const itemSprite = new PIXI.Sprite(itemImage)

        var pointX = 4;
        const pointY = 19;
        const iconSize = BOX_HEIGHT - 10;

        /** Header **/
        const mask = CreateHeaderSpriteMask(iconSize, pointX, pointY);
        const headerSprite = CreateHeaderSprite(mask, headerImage, iconSize, pointX);
        pointX = headerSprite.x + headerSprite.width;

        /** Name **/
        const nameText = CreateNameText(name, pointX);
        pointX = nameText.x + nameText.width;

        /** Item **/
        const calcH = (COMMENT_HEIGHT - 2) / itemSprite.height;
        itemSprite.scale.x = calcH;
        itemSprite.scale.y = calcH;
        itemSprite.x = pointX + 1 + (itemSprite.width / 2);
        itemSprite.y = + (itemSprite.height / 2);
        itemSprite.anchor.set(0.5);
        itemSprite.name = SPRITE_ITEM;

        pointX = pointX + 1 + itemSprite.width;
        var numText = null;
        /** Sub **/
        if (1 < num) {
            numText = GetSpecialText("x " + num.toString());
            numText.x = pointX;
            numText.y = 8;
            pointX = numText.x + numText.width;
        }
        /** Box **/
        const box = CreateBox(pointX, GetColor(tier));

        if (numText != null) {
            specialStage.addChild(box, mask, headerSprite, itemSprite, nameText, numText);
        } else {
            specialStage.addChild(box, mask, headerSprite, itemSprite, nameText);
        }
    }
}
const HEADER_ITEM_Y = 19
function CreateHeaderSpriteMask(iconSize: number, x: number, y: number) {
    const num = iconSize / 2;
    return new PIXI.Graphics().lineStyle(0)
        .beginFill(0x000000, 1)
        .drawCircle(x + num, y + num, num)
        .endFill();
}
function CreateHeaderSprite(mask: PIXI.Graphics, headerImage: PIXI.Texture, iconSize: number, x: number) {
    const headerSprite = new PIXI.Sprite(headerImage);
    headerSprite.mask = mask;
    headerSprite.x = x;
    headerSprite.y = HEADER_ITEM_Y;
    headerSprite.width = iconSize;
    headerSprite.height = iconSize;
    headerSprite.name = SPRITE_HEDER;
    return headerSprite;
}
function CreateBox(pointX: number, color: number) {
    const box = new PIXI.Graphics()
    box.beginFill(color, 0.8)
        .drawRoundedRect(0, 15, pointX + 8, BOX_HEIGHT, 50)
        .endFill();
    box.name = SPRITE_BOX;
    return box;
}
function CreateNameText(text: string, x: number) {
    const nameText = GetSpecialText(text);
    nameText.x = x + 3;
    nameText.y = 7;
    nameText.name = SPRITE_NAME;
    return nameText;
}
function CreateSpecialContainerTextOnly(specialStage: PIXI.Container, name: string, text: string, tier: number, headerImage: PIXI.Texture) {

    if (headerImage !== undefined) {
        var pointX = 4;
        const pointY = 19;
        const iconSize = BOX_HEIGHT - 10;

        /** Header **/
        const mask = CreateHeaderSpriteMask(iconSize, pointX, pointY);
        const headerSprite = CreateHeaderSprite(mask, headerImage, iconSize, pointX);
        pointX = headerSprite.x + headerSprite.width;
        /** Name **/
        const nameText = CreateNameText(name + ":" + text, pointX);
        pointX = nameText.x + nameText.width;

        /** Box **/
        const box = CreateBox(pointX, GetColor(tier));
        specialStage.addChild(box, mask, headerSprite, nameText);
    }
}

function animate(timestamp: number) {

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
                comment.remove(stage);
            }
            i--;
        }
    }

    renderer.render(stage);
    PIXI.utils.clearTextureCache();
    window.requestAnimationFrame(animate);
};

window.requestAnimationFrame(animate);



if (IS_DEBUG) {
    setInterval(function () {
        const obj = new JsonData();
        obj["user_data"] = { name: "■Ｗ＿KUI", img: "https://pbs.twimg.com/profile_images/2235314315/IMG_0332_400x400.JPG", is_master: true };
        var comment = "TEST:" + TEST_COUNT++;
        const length = getRandomInt(10);
        for (var i = 0; i < length; i++) {
            comment = comment + "★";
        }
        obj["comment"] = comment;
        // obj["comment"] = "あああ*あああ";
        // obj["html_comment"] = "あああ[/1021]あああ";
        obj["type"] = "Service";
        obj["tier_count"] = length;
        obj["tier"] = 2;
        // obj["tier"] = 1999;
        // obj["stamp_data_list"] = [{
        //     start: 3,
        //     end: 9,
        //     url: 'https://res.mildom.com/download/file/jp/mildom/nngift/5cfd61003caa8f873f3db0b6ec1ff905.png',
        //     width: 50,
        //     height: 50,
        // }]
        const stream_data = { stream_name: "", service_name: "", service_type: "Mildom" };
        // if (i < 3) {
        obj["stream_data"] = stream_data;
        if (length < 5) {
            obj["stamp_data_list"] = [{
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/5cfd61003caa8f873f3db0b6ec1ff905.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/914f4fb57a7eb792b06c41bea5dfd269.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/5b85d751779a2ccbc359b0d51cc40e3b.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/d021ac8a2e24b7f6a8021fce061c748c.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/004a0cf52395d4adf392f4ec1c36af95.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/93229ac116445cfb9416136f6a3db43e.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/d37caf7376cfef3427ee604aa12e6b10.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/aaa9de1af4b28a3d5c3adc153519ae32.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/eb4842eeb9e24db1016311676a877146.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/f52734dae2d37ae0ec60f228dae1f10e.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/0312b4f98daf2de1f5abfd86f8f91b79.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/2b6027d02b6075e77544f274fb7bae7a.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/b9e18492f57ac1b6b4bf3d5ef14f1f27.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/407e5ee25094d7d95912c57a4b7b8bab.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/5cfd61003caa8f873f3db0b6ec1ff905.png',
                width: 50,
                height: 50,
            }, {
                start: 32,
                end: 7,
                url: 'https://vpic.mildom.com/download/file/jp/mildom/cms/d54330db3e8356f62884a57bc8668f65.png',
                width: 50,
                height: 50,
            }, {
                start: 14,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/9c11bafe711f18b176b76ec29e4c2823.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/914f4fb57a7eb792b06c41bea5dfd269.png',
                width: 50,
                height: 50,
            }, {
                start: 0,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/5f286b7b9f4efc5e8d020a26d646b5f2.png',
                width: 50,
                height: 50,
            },
            ]
        }
        else {

            obj["stamp_data_list"] = [{
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/fe8bac3f31b9693aeb2305e6c2c23be5.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/f5de221cc0bdb6ff3f2f15fdcb9005e2.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/42eef16c6c907d5c7fe795cc5f919a20.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/d021ac8a2e24b7f6a8021fce061c748c.png',
                width: 50,
                height: 50,
            }, {
                start: 7,
                end: 7,
                url: 'https://res.mildom.com/download/file/jp/mildom/nngift/004a0cf52395d4adf392f4ec1c36af95.png',
                width: 50,
                height: 50,
            }]
        }
        // obj["stream_data"] = stream_data;
        obj["stamp_data_list"] = [{
            start: 0,
            end: 1,
            url: 'https://res.mildom.com/download/file/jp/mildom/nngift/5f286b7b9f4efc5e8d020a26d646b5f2.png',
            width: 50,
            height: 50,
        }
        ]
        // } else if (i < 8) {
        //     obj["tier"] = 2000;
        //     // obj["stream_data"] = stream_data;
        //     obj["stamp_data_list"] = [{
        //         start: 0,
        //         end: 1,
        //         url: 'https://res.mildom.com/download/file/jp/mildom/nngift/914f4fb57a7eb792b06c41bea5dfd269.png',
        //         width: 50,
        //         height: 50,
        //     }
        //     ]
        // } else if (i < 10) {

        //     obj["tier"] = 4000;
        //     // obj["stream_data"] = stream_data;
        //     obj["stamp_data_list"] = [{
        //         start: 0,
        //         end: 1,
        //         url: 'https://res.mildom.com/download/file/jp/mildom/nngift/9c11bafe711f18b176b76ec29e4c2823.png',
        //         width: 50,
        //         height: 50,
        //     }
        //     ]
        // } else {

        //     obj["tier"] = 9000;
        //     // obj["stream_data"] = stream_data;
        //     obj["stamp_data_list"] = [{
        //         start: 0,
        //         end: 1,
        //         url: 'https://res.mildom.com/download/file/jp/mildom/nngift/465a50bfb19a3580fbce507f01d9fc75.png',
        //         width: 50,
        //         height: 50,
        //     }
        //     ]
        // }
        pushComment(obj);
    }, 100);
    StartComment(addComment);
} else {
    // 接続
    StartComment(addComment);
}
