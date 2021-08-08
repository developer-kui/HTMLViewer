import * as PIXI from "pixi.js";
//テキストと画像の間隔
const TOKEN_SPACE = 5;
export class HtmlComment {
    // public x: number;
    public stepCount: number;
    public tokens: PIXI.Container | PIXI.Text;
    // public width: number;
    public backFlg: boolean;
    public displayTime: number;
    public animation: boolean;

    constructor(x: number,displayTime:number, tokens: PIXI.Container | PIXI.Text) {
        this.tokens = tokens;
        this.tokens.x = x;
        this.stepCount = 0;
        // this.width = 0;
        this.backFlg = false;
        this.displayTime = displayTime;
        this.animation = false;
    }
    set y(y: number) {
        this.tokens.y = y;
    }
    get x() {
        return this.tokens.x;
    }
    get width() {
        return this.tokens.width;
    }
    step() {
        // var sumWidth = 0;
        this.tokens.x -= this.stepCount;
        if (this.animation) {
            const item = this.tokens.getChildByName("item");
            if (item != null) {
                if (this.backFlg) {
                    item.angle = item.angle - 1;
                } else {
                    item.angle = item.angle + 1;
                }
                if (25 < item.angle) {
                    this.backFlg = true;
                } else if (item.angle < -25) {
                    this.backFlg = false;
                } else {
                }
            }
        }

    }
    remove(stage:PIXI.Container) {
        for (var i = this.tokens.children.length - 1; i >= 0; i--) {
            this.tokens.removeChildAt(i).destroy(true);
        }
        stage.removeChild(this.tokens);
        this.tokens.destroy(true);
        // this.tokens.destroy();
    }
    isHide() {
        return this.tokens.x + this.tokens.width <= 0
    }
    updateWidth(fps:number,commentHeight:number) {
        var sumWidth = 0;
        if (this.tokens instanceof PIXI.Container) {
            // }else{
            for (var i = 0; i < this.tokens.children.length; i++) {
                const o = this.tokens.getChildAt(i);
                o.x = sumWidth;
                if (o instanceof PIXI.Text) {
                    sumWidth += o.width + TOKEN_SPACE;
                } else if (o instanceof PIXI.Sprite) { // Within the block TypeScript knows that `x` must be a string
                    const calcH = commentHeight / o.height;
                    o.scale.x = calcH;
                    o.scale.y = calcH;
                    // o.width = Math.round(o.width * calcH);
                    sumWidth += o.width + TOKEN_SPACE;
                } else {

                }
            }
        }
        this.updateStepCount(fps);
    }
    updateStepCount(fps:number) {
        this.stepCount = Math.round((this.tokens.x + this.tokens.width) / (fps * this.displayTime));
    }
}