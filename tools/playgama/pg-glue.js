// Playgama Bridge glue shared by every game build (see build.py). It runs before the game:
// the build turns each game script into an inert <script type="text/plain" data-pg-game>,
// and this file starts them only after the Bridge has initialized and saved progress has
// been loaded, following Playgama's game checklist.
(function(){
  var paused=false,muted=false,hidden=false,ctxs=[],heldFrames=[],heldTimers=[],started=false;
  var SAVE_KEY='save';
  // Bridge v2 parses stored JSON by default, so a loaded save may arrive as an object or a string.

  // Saves go through Bridge storage. Games keep calling localStorage; this stand-in keeps an
  // in-memory copy and writes every key as one batched Bridge save.
  var data={},flushTimer=0;
  function flush(){flushTimer=0;try{bridge.storage.set([SAVE_KEY],[JSON.stringify(data)])}catch(e){}}
  function queueSave(){if(!flushTimer)flushTimer=setTimeout(flush,300)}
  var store={
    getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(data,k)?data[k]:null},
    setItem:function(k,v){data[String(k)]=String(v);queueSave()},
    removeItem:function(k){delete data[String(k)];queueSave()},
    clear:function(){data={};queueSave()},
    key:function(i){return Object.keys(data)[i]||null},
    get length(){return Object.keys(data).length}
  };
  try{Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return store}})}catch(e){}

  // Track every AudioContext the game creates so platform mute, pause and backgrounding silence it.
  ['AudioContext','webkitAudioContext'].forEach(function(n){
    var C=window[n];if(!C)return;
    var W=function(o){var c=new C(o);ctxs.push(c);if(silent())c.suspend();return c};
    W.prototype=C.prototype;window[n]=W;
  });
  function silent(){return paused||muted||hidden}
  function syncAudio(){ctxs.forEach(function(c){try{silent()?c.suspend():c.resume()}catch(e){}})}
  document.addEventListener('visibilitychange',function(){hidden=document.hidden;syncAudio()});

  // Hold animation frames and timer callbacks while paused, then release them on resume.
  var raf=window.requestAnimationFrame.bind(window),st=window.setTimeout.bind(window),si=window.setInterval.bind(window);
  window.requestAnimationFrame=function(cb){return raf(function(t){paused?heldFrames.push(cb):cb(t)})};
  window.setTimeout=function(cb,ms){var a=[].slice.call(arguments,2);return st(function(){var run=function(){typeof cb==='function'?cb.apply(null,a):0};paused?heldTimers.push(run):run()},ms)};
  window.setInterval=function(cb,ms){var a=[].slice.call(arguments,2);return si(function(){if(!paused&&typeof cb==='function')cb.apply(null,a)},ms)};
  function setPaused(p){
    if(p===paused)return;paused=p;syncAudio();
    if(!p){var f=heldFrames.splice(0),t=heldTimers.splice(0);f.forEach(function(cb){raf(cb)});t.forEach(function(r){r()})}
  }

  function send(m){try{bridge.platform.sendMessage(m)}catch(e){}}
  // Called by each game at natural breaks: game over, level clear, round end.
  window.pgBreak=function(){
    if(started){send('gameplay_stopped');started=false}
    try{if(bridge.advertisement.isInterstitialSupported)bridge.advertisement.showInterstitial('break')}catch(e){}
  };
  function onInput(){if(!started&&!paused){started=true;send('gameplay_started')}}
  addEventListener('pointerdown',onInput,true);addEventListener('keydown',onInput,true);
  // Long presses on the game field must not select text or open the context menu.
  addEventListener('contextmenu',function(e){if(e.target.tagName!=='INPUT')e.preventDefault()});

  function runGame(){
    [].slice.call(document.querySelectorAll('script[data-pg-game]')).forEach(function(old){
      var s=document.createElement('script');s.textContent=old.textContent;old.replaceWith(s);
    });
    // First playable frame: the title screen is drawn and accepts input.
    raf(function(){raf(function(){send('game_ready')})});
  }

  function start(){
    var E=bridge.EVENT_NAME;
    bridge.platform.on(E.PAUSE_STATE_CHANGED,function(p){setPaused(!!p)});
    bridge.platform.on(E.AUDIO_STATE_CHANGED,function(on){muted=!on;syncAudio()});
    if(bridge.platform.isAudioEnabled===false){muted=true}
    bridge.advertisement.on(E.INTERSTITIAL_STATE_CHANGED,function(s){
      if(s==='opened')setPaused(true);
      if(s==='closed'||s==='failed')setPaused(false);
    });
    if(bridge.advertisement.interstitialState==='opened')setPaused(true);
    bridge.storage.get([SAVE_KEY]).then(function(v){
      try{var raw=Array.isArray(v)?v[0]:v,d=typeof raw==='string'?JSON.parse(raw):raw;if(d&&typeof d==='object')data=d}catch(e){}
    }).catch(function(){}).then(runGame);
  }
  function boot(){
    if(!window.bridge){runGame();return}
    bridge.initialize().then(start).catch(runGame);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
