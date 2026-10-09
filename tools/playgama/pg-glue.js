// Playgama Bridge glue shared by every game build. Loads before the game code so it can
// track audio contexts and gate the game loop when the platform pauses or mutes the game.
(function(){
  var paused=false,muted=false,ctxs=[],heldFrames=[],heldTimers=[],started=false;
  // Track every AudioContext the game creates so platform mute/pause can silence it.
  ['AudioContext','webkitAudioContext'].forEach(function(n){
    var C=window[n];if(!C)return;
    var W=function(o){var c=new C(o);ctxs.push(c);if(paused||muted)c.suspend();return c};
    W.prototype=C.prototype;window[n]=W;
  });
  function syncAudio(){ctxs.forEach(function(c){try{(paused||muted)?c.suspend():c.resume()}catch(e){}})}
  // Hold animation frames and timer callbacks while paused, then release them on resume.
  var raf=window.requestAnimationFrame.bind(window),st=window.setTimeout.bind(window),si=window.setInterval.bind(window);
  window.requestAnimationFrame=function(cb){return raf(function(t){paused?heldFrames.push(cb):cb(t)})};
  window.setTimeout=function(cb,ms){var a=[].slice.call(arguments,2);return st(function(){var run=function(){typeof cb==='function'?cb.apply(null,a):0};paused?heldTimers.push(run):run()},ms)};
  window.setInterval=function(cb,ms){var a=[].slice.call(arguments,2);return si(function(){if(!paused&&typeof cb==='function')cb.apply(null,a)},ms)};
  function setPaused(p){
    if(p===paused)return;paused=p;syncAudio();
    if(!p){var f=heldFrames.splice(0),t=heldTimers.splice(0);
      f.forEach(function(cb){raf(cb)});t.forEach(function(r){r()});
      }
  }
  function send(m){try{window.bridge&&bridge.platform.sendMessage(m)}catch(e){}}
  // Called by each game at natural breaks: game over, level clear, round end.
  window.pgBreak=function(){
    if(started){send('gameplay_stopped');started=false}
    try{if(window.bridge&&bridge.advertisement.isInterstitialSupported)bridge.advertisement.showInterstitial('break')}catch(e){}
  };
  function onInput(){if(!started&&!paused){started=true;send('gameplay_started')}}
  addEventListener('pointerdown',onInput,true);addEventListener('keydown',onInput,true);
  function ready(){
    if(!window.bridge){return}
    bridge.initialize().then(function(){
      var E=bridge.EVENT_NAME;
      bridge.platform.on(E.PAUSE_STATE_CHANGED,function(p){setPaused(!!p)});
      bridge.platform.on(E.AUDIO_STATE_CHANGED,function(on){muted=!on;syncAudio()});
      if(bridge.platform.isAudioEnabled===false){muted=true;syncAudio()}
      bridge.advertisement.on(E.INTERSTITIAL_STATE_CHANGED,function(s){
        if(s==='opened')setPaused(true);
        if(s==='closed'||s==='failed')setPaused(false);
      });
      if(bridge.advertisement.interstitialState==='opened')setPaused(true);
      raf(function(){raf(function(){send('game_ready')})});
    }).catch(function(){});
  }
  if(document.readyState==='complete')ready();else addEventListener('load',ready);
})();
