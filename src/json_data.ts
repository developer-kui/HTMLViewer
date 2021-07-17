
export class ImagePoint{
    public start:number;
    public end:number;
    public width:number;
    public height:number;
    public url:string;
    
    constructor(start:number, end:number) {
        this.start = start;
        this.end = end;
        this.width = 0;
        this.height = 0;
        this.url = "";
    }
}
export class UserData{
    public name:string;
    public img:string;
    public is_master:boolean;
    constructor() {
        this.name = "";
        this.img = "";
        this.is_master = false;
    }
}
export class StreamData{
    public service_type:string;
    constructor() {
        this.service_type = "";
    }
}
export class JsonData{
    public comment:string;
    public user_data:UserData;
    public stream_data:StreamData;
    public type:string;
    public tier:number;
    public tier_count:number;
    public message_id:number;
    public html_comment:string;
    public image_obj:string;
    public stamp_data_list:Array<ImagePoint>;
    constructor() {
        this.comment = "";
        this.user_data = new UserData();
        this.stream_data = new StreamData();
        this.type = "";
        this.image_obj = "";
        this.tier = 0;
        this.tier_count = 0;
        this.message_id = 0;
        this.html_comment = "";
        this.stamp_data_list = new Array<ImagePoint>();
    }
}