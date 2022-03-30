//いろいろな設定を入れておきます
const Config = {
  //画面の解像度
  Screen: {
    Width: 640,//幅
    Height: 960,//高さ
    BackGroundColor: 0x555555,//背景色
  },
  //音量(０～１で設定)
  Volume: {
    Bgm: 0.2,
    Sound: 0.5
  }
}

//読みこむデータリスト(名前：ファイルパス)
const Resource = {
  Actor: 'image/player.png',
  PauseBtn: 'image/pausebutton.png',
  Bgm: 'audio/rescue.mp3',
  Pause: 'audio/pause.mp3',
}

//上のリストを読み込みやすい形に変えてます
const assets = [];
for (let key in Resource) {
  assets.push(Resource[key]);
}
  
let core;//ゲームの基幹プログラム用の変数

//ブラウザの読み込みが完了したら実行されます
window.onload = () => {
  //設定した画面サイズでcoreを作成
  core = new Game(Config.Screen.Width, Config.Screen.Height, Config.Screen.BackGroundColor);
  //データ読み込み
  core.preload(assets);
  //読み込み完了でメインシーンに切り替わります
  core.onload = () => {
    core.replaceScene(new MainScene());
  }
}

let player;//プレイヤーの変数

//メインシーン
class MainScene extends Container {
  constructor(){
    super();
    this.interactive = true;//タッチできるようにする

    //コンテナだけではタッチできないので空のSpriteを作ってます
    const bg = new PIXI.Sprite();
    bg.width = Config.Screen.Width;
    bg.height = Config.Screen.Height;
    bg.interactive = true;
    this.addChild(bg);

    //プレイヤー
    player = new Player(128, 128);//()内はサイズ
    player.position.set(Config.Screen.Width * 0.5, Config.Screen.Height - 256);//配置
    this.addChild(player);//コンテナに追加(これをしないと表示されない)

    //画面をタッチしたときの処理
    this.on("pointerdown", (e) => {
      player.isMove = true;
      const pos = e.data.getLocalPosition(e.currentTarget);//画面の座標を取得
      this.pointerX = pos.x;
      this.pointerY = pos.y;
    });
    //画面をぐりぐりしたときの処理
    this.on("pointermove", (e) => {
      if(!player.isMove) return;
      const pos = e.data.getLocalPosition(e.currentTarget);
      player.x += pos.x - this.pointerX;//前回ループとの差分が移動量
      player.y += pos.y - this.pointerY;
      this.pointerX = pos.x;
      this.pointerY = pos.y;
    });
    //タッチを止めたときの処理
    this.on("pointerup", () => {
      player.isMove = false;
      player.frameNumber = 1;
    });
    
    //ポーズボタン
    const pauseBtn = new Sprite();
    pauseBtn.texture = core.resources[Resource.PauseBtn].texture;//画像を設定
    pauseBtn.position.set(8, 8)//場所
    this.addChild(pauseBtn);
    pauseBtn.interactive = true;//タッチできるようにする

    //ポーズボタンを押したときの処理
    pauseBtn.on("pointerdown", (e) => {
      e.stopPropagation();//eventの伝播を止める
      core.pausePlayingSounds();//再生中の音を全部停止
      core.resources[Resource.Pause].sound.volume = Config.Volume.Sound;
      core.resources[Resource.Pause].sound.play();//ポーズ用の効果音を鳴らす
      core.pushScene(new PauseScene());//ポーズシーンをメインシーンの上に表示
    });

    //BGMの設定
    core.resources[Resource.Bgm].sound.loop = true;//ループします
    core.resources[Resource.Bgm].sound.volume = Config.Volume.Bgm;//ボリューム
    core.resources[Resource.Bgm].sound.play();//再生
    //core.sound.play(Resource.Bgm);こっちでもできる
  }
  //更新処理(今回は使ってない)
  update(delta){
    super.update(delta);
  }
}

//プレイヤーのクラス
class Player extends EnchantSprite {
  constructor(width, height){
    super(width, height);
    this.anchor.set(0.5, 0.5);//中心位置(0.5だと画像の真ん中になる)。この中心位置が座標の場所になる
    this.walkAnime = [0, 1, 2, 1];//歩くアニメーションパターン
    this.animeCount = 0;//アニメーションパターンの番号
    this.image = core.resources[Resource.Actor].texture; //プレイヤーの画像
    this.isMove = false;//動いてますかフラグ
  }
  //更新処理
  update(delta){
    super.update(delta);
    if(this.isMove && this.age % 10 == 0){//画面をタッチしてたらアニメーションします
      if(++this.animeCount >= this.walkAnime.length) this.animeCount = 0;//アニメーションパターンの数より大きくなったら0に戻す
      this.frameNumber = this.walkAnime[this.animeCount];//アニメーションの番号を設定
    }
  }
}

//ポーズシーンのクラス
class PauseScene extends Container {
  constructor(){
    super();
    this.interactive = true;//タッチできるようにする

    //背景にちょっとくらい画像を表示します(ここはちょっとややこしい)
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000);
    bg.drawRect(0, 0, Config.Screen.Width, Config.Screen.Height);
    bg.endFill();
    const texture = PIXI.RenderTexture.create({width: Config.Screen.Width, height: Config.Screen.Height});
    core.app.renderer.render(bg, texture);
    const backGround = new PIXI.Sprite(texture);
    backGround.alpha = 0.4;//透明度を指定
    this.addChild(backGround);

    //PAUSEの文字表示
    const text = new PIXI.Text('PAUSE', new PIXI.TextStyle({
      fontFamily: 'sans-serif',
      fontSize: 64,
      fill: 0xffffff,
    }));
    text.anchor.set(0.5, 0.5);
    text.position.set(Config.Screen.Width*0.5, Config.Screen.Height*0.5);
    this.addChild(text);

    //タッチしたらポーズシーンからメインシーンに戻ります
    this.on('pointerdown', () => {
      core.resumePausedSounds();//停止していた音を再生
      core.popScene();//このポーズシーンが消えてメインシーンに戻る
    });
  }
}

