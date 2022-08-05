/*********************************
 * ゲーム基幹クラス
 *********************************/
class Game {
  constructor(width, height, color){
    this.isPushedScene = false;
    this.isActive = true;//画面の表示切替チェック用(サウンド管理で必要)
    this.loadProgress = {loaded: 0};//ロード状況確認用
    //ゲーム画面作成
    const app = new PIXI.Application({ 
      width: width, 
      height: height,                       
      backgroundColor: color,
      resolution: 1,
      autoDensity: true
    });
    document.body.appendChild(app.view);
    
    //右クリックで出るメニューを非表示に
    app.view.addEventListener("contextmenu", function(e){
      e.preventDefault();
    }, false);
    
    //更新処理
    app.ticker.add((delta) => {
      if(this.currentScene){
        this.currentScene.update(delta);
      }
    });
    
    //使いやす場所に
    this.app = app;
    this.loader = PIXI.Loader.shared;
    this.resources = PIXI.Loader.shared.resources;
    this.sound = PIXI.sound;
    
    //音のファイルだけ取っておく(ポーズとかで使いたいので)
    this._sounds = [];
    PIXI.Loader.shared.use((resource, next) =>  {
      if(resource.sound){
        this._sounds.push(resource.sound);
      }
      next();
    });
    // リサイズイベントの登録
    window.addEventListener('resize', () => {this.resizeCanvas();});
    this.resizeCanvas();  
      
    //ブラウザの種類を取得
    const browser = (function(ua) {
      if (/MSIE|Trident/.test(ua)) {
        return 'ie';
      } else if (/Edg/.test(ua)) {
        return 'edge';
      } else if (/Android/.test(ua)) {
        return 'android';
      } else if (/Chrome/.test(ua)) {
          return 'chrome';
      } else if (/(?:Macintosh|Windows).*AppleWebKit/.test(ua)) {
          return 'safari';
      } else if (/(?:iPhone|iPad|iPod).*AppleWebKit/.test(ua)) {
          return 'mobilesafari';
      } else if (/Firefox/.test(ua)) {
          return 'firefox';
      } else {
          return '';
      }
    }(window.navigator.userAgent));
    
    this.setWindowLifeCycleEvent(browser);
    // モバイルは可能であればフルスクリーンの有効化
    this.enableFullScreen(browser);

    //ロード画面表示
    this.replaceScene(new LoadingScene(width, height, this.loadProgress));
  }
  //Androidはフルスクリーンに
  enableFullScreen(browser) {
    if (browser === 'android') {
      const type = typeof document.ontouchend;
      const eventName = (type === 'undefined') ? 'mousedown' : 'touchend';
      document.body.addEventListener(eventName, this.requestFullScreen);
    }
  }
  //フルスクリーンに
  requestFullScreen() {
    const body = window.document.body;
    const requestFullScreen =
      body.requestFullScreen || body.webkitRequestFullScreen;
    requestFullScreen.call(body);
  }

  //画面切り替え時に音を停止/再生させる
  setWindowLifeCycleEvent(browser) {
    if(browser === 'safari' || browser === 'mobilesafari') {
      //動作未確認
      document.addEventListener('webkitvisibilitychange', () => {
        document.webkitHidden ? this.soundPauseAll() : this.soundResumeAll();
      });
    }else{
      document.addEventListener('visibilitychange', () => {
        document.hidden ? this.soundPauseAll() : this.soundResumeAll();
      });
    }
  }
  //画面を切り替えられたらすべてをポーズ
  soundPauseAll() {
    if(!this.isActive) return;
    this.isActive = false;
    this.sound.pauseAll();//こいつ使うとこの後なにも再生できない(ポーズ画面で使えない)
  }
  //画面を戻したらすべてを再開
  soundResumeAll() {
    if(this.isActive) return;
    this.isActive = true;
    this.sound.resumeAll();
  }
  //鳴ってる音だけ止める処理(一時停止用)
  pausePlayingSounds(){
    this._sounds.forEach((sound) => {
      if(sound.isPlaying){
        sound.pause();
      }
    });
  }
  //ポーズされている音を再生(一時停止解除用)
  resumePausedSounds(){
    this._sounds.forEach((sound) => {
      if(sound.paused){
        sound.resume();
      }
    });
  }
  
  //アセット読み込み
  preload(assets){
    this.loader.onProgress.add((loader) => {//読み込み状況のチェック
      this.loadProgress.loaded = Math.floor(loader.progress);
    });
    this.loader.add(assets).load(() => {
      this.onload();//読み込み完了でonload()実行
    }); 
  }

  //アセット読み込み後に実行される(今は空っぽ))
  onload = () => {};

  //シーンの置き換え処理
  replaceScene(newScene){
    if(this.currentScene){//現在のシーンを廃棄
      this.currentScene.destroy();
    }
    if(this.waitingScene){//waitingSceneもあれば廃棄
      this.waitingScene.destroy();
      this.isPushedScene = false;
    }
    this.app.stage.addChild(newScene);
    this.currentScene = newScene;
  }

  //カレントシーンの上に別シーンをプッシュする
  pushScene(newScene) {
    this.isPushedScene = true;
    this.waitingScene = this.currentScene;//現在のシーンを待機シーンに保存
    this.currentScene = newScene;
    this.app.stage.addChild(newScene);
  }
  
  //プッシュしていたシーンを削除し待機シーンをカレントに戻す
  popScene() {
    if(!this.isPushedScene) return;//pushされていなければ抜ける
    if(!this.waitingScene) return;

    this.isPushedScene = false;
    this.currentScene.destroy();    
    this.currentScene = this.waitingScene;
  }

  //canvas のりサイズ処理を行う
  resizeCanvas(){
    const renderer = this.app.renderer;
  
    let canvasWidth;
    let canvasHeight;
  
    const rendererHeightRatio = renderer.height / renderer.width;
    const windowHeightRatio = window.innerHeight / window.innerWidth;
  
    // 画面比率に合わせて縦に合わせるか横に合わせるか決める
    if (windowHeightRatio > rendererHeightRatio) {//縦長
      canvasWidth = window.innerWidth;
      canvasHeight = window.innerWidth * (renderer.height / renderer.width);
    } else {//横長
      canvasWidth = window.innerHeight * (renderer.width / renderer.height);
      canvasHeight = window.innerHeight;
    }
  
    this.app.view.style.width  = `${canvasWidth}px`;
    this.app.view.style.height = `${canvasHeight}px`;
  }
}
/*********************************
 * PIXI.Containerにupdate機能を追加
 *********************************/
class Container extends PIXI.Container {
  constructor(){
    super();
    this.isUpdateObject = true;
    this.isDestroyed = false;
    this.objectsToUpdate = [];
    this.age = 0; 
  }
  //メインループで更新処理を行うべきオブジェクトの登録
  registerUpdatingObject(object) {
    this.objectsToUpdate.push(object);
  }
  //更新処理を行うべきオブジェクトを更新する
  updateRegisteredObjects(delta) {
    const nextObjectsToUpdate = [];
    for (let i = 0; i < this.objectsToUpdate.length; i++) {
      const obj = this.objectsToUpdate[i];
      if (!obj || obj.isDestroyed) {
        continue;
      }
      obj.update(delta);
      nextObjectsToUpdate.push(obj);
    }
    this.objectsToUpdate = nextObjectsToUpdate;
  }
  addChild(obj){
    super.addChild(obj);
    if(obj.isUpdateObject){//フラグを持っていれば登録
      this.registerUpdatingObject(obj);
    }
  }
  removeChild(obj){//取り除く処理
    super.removeChild(obj);
    obj.isDestroyed = true;//破壊と同じにした
  }
  destroy() {
    super.destroy();
    this.isDestroyed = true;
  }
  update(delta){
    this.updateRegisteredObjects(delta);
    this.age++;
  }
}
/*********************************
 * PIXI.Spriteにupdate機能を追加
 *********************************/
class Sprite extends PIXI.Sprite {
  constructor(){
    super();
    this.isUpdateObject = true;
    this.isDestroyed = false;
    this.objectsToUpdate = [];
    this.age = 0; 
  }
  //メインループで更新処理を行うべきオブジェクトの登録
  registerUpdatingObject(object) {
    this.objectsToUpdate.push(object);
  }
  //更新処理を行うべきオブジェクトを更新する
  updateRegisteredObjects(delta) {
    const nextObjectsToUpdate = [];
    for (let i = 0; i < this.objectsToUpdate.length; i++) {
      const obj = this.objectsToUpdate[i];
      if (!obj || obj.isDestroyed) {
        continue;
      }
      obj.update(delta);
      nextObjectsToUpdate.push(obj);
    }
    this.objectsToUpdate = nextObjectsToUpdate;
  }
  addChild(obj){
    super.addChild(obj);
    if(obj.isUpdateObject){//フラグを持っていれば登録
      this.registerUpdatingObject(obj);
    }
  }
  removeChild(obj){//取り除く処理
    super.removeChild(obj);
    obj.isDestroyed = true;//破壊と同じにした
  }
  destroy() {
    super.destroy();
    this.isDestroyed = true;
  }
  //更新処理
  update(delta) {
    this.updateRegisteredObjects(delta);
    this.age++;
  }
}

/***********************************************
 * enchant.js風のスプライト
 * 拡大縮小回転などをするとノイズが入る問題がある
 ***********************************************/
 class EnchantSprite extends Sprite {
  constructor(width, height){
    super();
    this.width = width;
    this.height = height;
    this._frameNumber = 0;
  }
  //画像データの取得(いるかな？)
  get image(){
    return this._image;
  }
  //画像をセットしスプライトサイズに合わせて計算してテクスチャーをセット
  set image(data) {
    this._image = data;
    this.frameColumns = this._image.width / this.width | 0;
    this.frameRows = this._image.height / this.height | 0;
    this.frameMax = this.frameRows * this.frameColumns;
    this.setTexture();
  }
  //フレームナンバーを返す
  get frameNumber(){
    return this._frameNumber;
  }
  //フレームナンバーをセットし、画像をセットする
  set frameNumber(frameNumber) {
    this._frameNumber = frameNumber % this.frameMax;
    if(!this._image)return;//まだ画像がセットされてなければ抜ける
    const scaleX = this.scale.x;
    const scaleY = this.scale.y;
    this.scale.set(1, 1);//一度スケールを戻す必要がある(サイズが違うとおかしくなる)
    this.setTexture();
    this.scale.set(scaleX, scaleY);
  }
  //フレームナンバーに沿ったテクスチャーをセット
  setTexture() {
    const left = this.frameNumber % this.frameColumns * this.width;
    const top = (this.frameNumber / this.frameColumns | 0) * this.height;
    this.texture = new PIXI.Texture(this._image, new PIXI.Rectangle(left, top, this.width, this.height));
  }
  //更新処理
  update(delta) {
    super.update(delta);
  }
}

/***********************************************
 * Graphicsにupdate機能追加
 * いくつかの図形をすぐかけるようにした
 ***********************************************/
class Graphics extends PIXI.Graphics {
  constructor(){
    super();
    this.isUpdateObject = true;
    this.isDestroyed = false;
    this.age = 0; 
  }
  destroy() {
    super.destroy();
    this.isDestroyed = true;
  }
  update(delta){
    this.age++;
  }
  line(x, y, x2, y2, thickness, color){
    this.lineStyle(thickness, color);
    this.moveTo(x, y);
    this.lineTo(x2, y2);
    this.lineStyle();//解除(他のにも影響がでるため) 
  }
  rectFill(x, y, w, h, color){
    this.beginFill(color);
    this.drawRect(x, y, w, h);
    this.endFill();
  }
  rect(x, y, w, h, thickness, color){
    this.lineStyle(thickness, color, 1, 0);
    this.drawRect(x, y, w, h);
    this.lineStyle();
  }
  circFill(x, y, radius, color){
    this.beginFill(color);
    this.drawCircle(x, y, radius);
    this.endFill();
  }
  circ(x, y, radius, thickness, color){
    this.lineStyle(thickness, color, 1, 0);
    this.drawCircle(x, y, radius);
    this.lineStyle();
  }
  //星型または正多角形のデータ計算用
  makeStarData(x, y, points, outerRadius, innerRadius){
    if(points < 3){//3未満は空の配列を返す(何も表示されない)
      return [];
    }
    let step = (Math.PI * 2) / points;//角度
    let halfStep = step / 2;
    const data = [];
    let dx, dy;

    const halfPI = Math.PI/2;//起点を90度ずらしたいので
    for (let n = 1; n <= points; ++n) {
      if(innerRadius){
        dx = x + Math.cos(step * n - halfStep - halfPI) * innerRadius;
        dy = y + Math.sin(step * n - halfStep - halfPI) * innerRadius;
        data.push(dx, dy);
      }      
      dx = x + Math.cos(step * n - halfPI) * outerRadius;
      dy = y + Math.sin(step * n - halfPI) * outerRadius;
      data.push(dx, dy);
    }
    return data;
  }
  starFill(x, y, points, outerRadius, innerRadius, color){
    this.beginFill(color);
    this.drawPolygon(this.makeStarData(x, y, points, outerRadius, innerRadius));
    this.endFill();
  }
  star(x, y, points, outerRadius, innerRadius, thickness, color){
    this.lineStyle(thickness, color, 1, 0);
    this.drawPolygon(this.makeStarData(x, y, points, outerRadius, innerRadius));
    this.lineStyle();
  }
  regPolyFill(x, y, points, radius, color){
    this.beginFill(color);
    this.drawPolygon(this.makeStarData(x, y, points, radius));
    this.endFill();
  }
  regPoly(x, y, points, radius, thickness, color){
    this.lineStyle(thickness, color, 1, 0);
    this.drawPolygon(this.makeStarData(x, y, points, radius));
    this.lineStyle();
  }
}


/***********************************************
 * 開始時のロード画面
 ***********************************************/
 class LoadingScene extends Container {
  constructor(width, height, loadProgress){
    super();
    const t = new PIXI.Text("Now Loading", new PIXI.TextStyle({
      fontFamily: 'sans-serif',
      fontSize: width * 0.05,
      fill: 0xffffff,
    }));
    t.anchor.set(0, 0);
    t.position.set(width*0.5 - t.width*0.5, height*0.5);
    this.addChild(t);
    this.text = t;
    this.count = 0;

    const p = new PIXI.Text('0%', new PIXI.TextStyle({
      fontFamily: 'sans-serif',
      fontSize: width * 0.1,
      fill: 0xffffff,
    }));
    p.anchor.set(0.5, 1);
    p.position.set(width*0.5, height*0.5);
    this.addChild(p);
    this.p = p;
    this.loadProgress = loadProgress;
  }
  update(delta){
    super.update(delta);
    this.p.text = this.loadProgress.loaded + '%';
    if(this.age % 15 == 0) {
      switch(this.count) {
        case 0: 
          this.text.text = "Now Loading";
          break;
        case 1: 
          this.text.text = "Now Loading.";
          break;
        case 2: 
          this.text.text = "Now Loading..";
          break;
        case 3: 
          this.text.text = "Now Loading...";
          break;
      }
      if(++this.count > 3) {
        this.count = 0;
      }
    }
  }
}