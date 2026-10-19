// Site glue for every game page (see tools/site/build_games.py). The game builds hold their
// scripts as inert <script type="text/plain" data-pg-game>; this file starts them, keeps saves
// in this browser, counts plays for the hub, runs the Daily Challenge and adds a home button.
(function(){
  var me=document.currentScript,GAME=me&&me.getAttribute('data-game')||'',HUB='../../index.html';
  var real;try{real=window.localStorage}catch(e){}
  function rd(k,d){try{var v=real.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}}
  function wr(k,v){try{real.setItem(k,JSON.stringify(v))}catch(e){}}
  function today(){var d=new Date();return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}

  // ---- Daily Challenge: today's Eyeball It! round, the same five tests for everyone ----
  // The hub sets ig.dailyLaunch before opening the game; #daily works too.
  var DAY=today(),daily=false;
  if(GAME==='eyeball-it'){
    var flag=rd('ig.dailyLaunch',null);
    daily=flag===DAY||location.hash==='#daily';
    try{real.removeItem('ig.dailyLaunch')}catch(e){}
  }
  var nativeRandom=Math.random;
  if(daily){
    // Seed the game's random numbers from the date so every player gets the same round.
    var h=1779033703;for(var i=0;i<DAY.length;i++){h=Math.imul(h^DAY.charCodeAt(i),3432918353);h=h<<13|h>>>19}
    var s=h>>>0;Math.random=function(){s=s+0x6D2B79F5|0;var t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
    // A fixed practice save: all ten tests unlocked at medium difficulty, never touching the real save.
    var mem={eyeSave:JSON.stringify({rounds:6,xp:0,best:0,plays:{},bestT:{}})};
    var store={getItem:function(k){k=String(k);return k in mem?mem[k]:(k==='eyeSound'?rd0(k):null)},
      setItem:function(k,v){k=String(k);if(k==='eyeSound'){try{real.setItem(k,v)}catch(e){}}else mem[k]=String(v)},
      removeItem:function(k){delete mem[String(k)]},clear:function(){mem={}},key:function(i){return Object.keys(mem)[i]||null},get length(){return Object.keys(mem).length}};
    function rd0(k){try{return real.getItem(k)}catch(e){return null}}
    try{Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return store}})}catch(e){}
  }

  // ---- play counting for the hub's progress and brain profile ----
  var counted=false;
  function onInput(){
    if(counted)return;counted=true;
    var st=rd('ig.stats',{}),g=st[GAME]||{sessions:0};g.sessions++;g.last=DAY;st[GAME]=g;wr('ig.stats',st);
    var days=rd('ig.days',[]);if(days.indexOf(DAY)<0){days.push(DAY);wr('ig.days',days.slice(-400))}
  }
  addEventListener('pointerdown',onInput,true);addEventListener('keydown',onInput,true);
  addEventListener('contextmenu',function(e){if(e.target.tagName!=='INPUT')e.preventDefault()});

  // Called by each game at natural breaks (game over, level clear, round end).
  // This is where a between-levels ad will go once the site carries ads.
  window.pgBreak=function(){};

  // Eyeball It! reports its results through Bridge analytics; on the site we read them here.
  var tests=[];
  window.bridge={analytics:{send:function(name,d){
    if(!daily||!d)return;
    if(name==='progression_started')tests=[];
    if(name==='test_completed')tests.push(Math.round(d.score||0));
    if(name==='progression_completed')finishDaily(Math.round(d.score||0),d.grade||'');
  }}};

  function finishDaily(score,grade){
    var log=rd('ig.daily',{}),first=!log[DAY];
    if(first){log[DAY]={score:score,grade:grade,tests:tests.slice()};wr('ig.daily',log)}
    daily=false;var tg=document.querySelector('.ig-tag');if(tg)tg.remove();
    setTimeout(function(){showDailyCard(log[DAY],first)},1400);
  }
  function streak(log){var n=0,d=new Date();for(;;){var k=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);if(!log[k])break;n++;d.setDate(d.getDate()-1)}return n}
  function dailyNo(){return Math.floor((new Date(DAY+'T12:00:00')-new Date('2026-10-19T12:00:00'))/864e5)+1}
  function showDailyCard(r,first){
    var log=rd('ig.daily',{}),sk=streak(log);
    var sq=r.tests.map(function(s){return s>=85?'🟩':s>=60?'🟨':'🟥'}).join('');
    var text='Infinite Games Daily #'+dailyNo()+'\n👁 '+r.score+'/100 '+r.grade+(sk>1?'  🔥'+sk:'')+'\n'+sq+'\ngrantdilli.github.io';
    var el=document.createElement('div');el.className='ig-daily';
    el.innerHTML='<div class="ig-card" role="dialog" aria-label="Daily Challenge result"><p class="ig-k">Daily #'+dailyNo()+(first?'':' · already played')+'</p>'+
      '<p class="ig-score"><b>'+r.score+'</b><span>/100</span><i>'+r.grade+'</i></p><p class="ig-sq">'+sq+'</p>'+
      '<p class="ig-k">'+(sk>1?'Streak: '+sk+' days':'Come back tomorrow to start a streak')+'</p>'+
      '<div class="ig-row"><button type="button" id="igShare">Copy result</button><a href="'+HUB+'">Back to games</a></div>'+
      '<button type="button" class="ig-x" id="igClose" aria-label="Keep playing">Keep playing</button></div>';
    document.body.appendChild(el);
    el.querySelector('#igShare').onclick=function(){var b=this;
      var done=function(){b.textContent='Copied!'};
      try{navigator.clipboard.writeText(text).then(done,function(){prompt0(text)})}catch(e){prompt0(text)}};
    el.querySelector('#igClose').onclick=function(){el.remove()};
    function prompt0(t){var p=el.querySelector('.ig-sq');p.textContent=t;p.style.whiteSpace='pre-wrap';p.style.userSelect='text'}
  }

  // ---- home button and the small styles the site adds ----
  var css='.ig-home{position:fixed;z-index:60;left:max(10px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom));'+
    'font:700 12px/1 "Space Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;color:#00e5ff;'+
    'background:rgba(11,11,26,.82);border:2px solid #2e2e5c;border-radius:3px;padding:8px 10px;opacity:.75}.ig-home:hover,.ig-home:focus-visible{opacity:1;border-color:#00e5ff}'+
    '.ig-daily{position:fixed;inset:0;z-index:70;display:grid;place-items:center;background:rgba(5,5,16,.72);padding:16px}'+
    '.ig-card{width:min(340px,100%);background:#14142c;color:#f2f2ff;border:2px solid #2e2e5c;box-shadow:6px 6px 0 #ff2bd6;border-radius:3px;padding:20px;display:grid;gap:10px;text-align:center;font-family:"Space Mono",ui-monospace,monospace}'+
    '.ig-k{margin:0;color:#8d8dbd;font-size:12px;letter-spacing:.08em;text-transform:uppercase}'+
    '.ig-score{margin:0;display:flex;justify-content:center;align-items:baseline;gap:6px}.ig-score b{font-size:56px;color:#00e5ff;line-height:1}.ig-score span{color:#8d8dbd}.ig-score i{font-style:normal;font-size:28px;font-weight:700;color:#0b0b1a;background:#ffe14d;padding:0 10px;margin-left:8px;border-radius:2px}'+
    '.ig-sq{margin:0;font-size:24px;letter-spacing:4px}.ig-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}'+
    '.ig-row button,.ig-row a{font:700 14px "Space Mono",ui-monospace,monospace;text-transform:uppercase;letter-spacing:.06em;border-radius:3px;padding:10px 14px;cursor:pointer;text-decoration:none}'+
    '.ig-row button{background:#ff2bd6;color:#0b0b1a;border:0;box-shadow:3px 3px 0 #00e5ff}.ig-row a{color:#00e5ff;border:2px solid #2e2e5c}'+
    '.ig-tag{position:fixed;z-index:60;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));font:700 12px/1 "Space Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:#0b0b1a;background:#ffe14d;border-radius:3px;padding:9px 10px;pointer-events:none}'+
    '.ig-x{background:none;border:0;color:#8d8dbd;font:12px "Space Mono",monospace;text-decoration:underline;cursor:pointer}';
  function addChrome(){
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    var a=document.createElement('a');a.className='ig-home';a.href=HUB;a.textContent='◂ Games';a.setAttribute('aria-label','Back to all games');
    document.body.appendChild(a);
    if(daily){var t=document.createElement('div');t.className='ig-tag';t.textContent='Daily #'+dailyNo();document.body.appendChild(t)}
  }

  function runGame(){
    [].slice.call(document.querySelectorAll('script[data-pg-game]')).forEach(function(old){
      var s=document.createElement('script');s.textContent=old.textContent;old.replaceWith(s);
    });
    // The game keeps its seeded generator (captured at load); sound effects go back to the normal one.
    Math.random=nativeRandom;
    addChrome();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',runGame,{once:true});else runGame();
})();
