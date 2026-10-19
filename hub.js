// Hub: reads each game's own save (same site, same browser) plus the play counts and daily
// results that games/site-glue.js keeps, and turns them into progress, a brain profile and badges.
(function(){
  var $=function(id){return document.getElementById(id)};
  function raw(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function rd(k,d){try{var v=raw(k);return v==null?d:JSON.parse(v)}catch(e){return d}}
  function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function num(k){var n=parseFloat(raw(k));return isFinite(n)?n:0}
  function key(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
  var now=new Date(),DAY=key(now);

  var stats=rd('ig.stats',{}),daily=rd('ig.daily',{}),days=rd('ig.days',[]);
  function sessions(id){return (stats[id]&&stats[id].sessions)||0}
  function eyeLevel(xp){var L=1,need=250;while(xp>=need){xp-=need;L++;need+=50}return L}

  // Progress per game, from each game's own save format.
  var eye=rd('eyeSave',{}),top=rd('toppleSave',{}),snug=rd('snugSave',{}),comets=rd('cometsSave',{});
  var toppleDone=Object.keys(top.best||{}).length,snugDone=snug.lvl||0;
  var G={
    'eyeball-it':{pts:(eye.rounds||0)*20+(eye.best||0),skills:['perception'],
      line:eye.rounds?'Eye Lv '+eyeLevel(eye.xp||0)+' · best '+(eye.best||0):null},
    'topple':{pts:toppleDone*15,skills:['spatial','logic'],line:toppleDone?'Level '+Math.min(56,toppleDone+1)+' of 56':null},
    'snug-pack':{pts:snugDone*15,skills:['spatial'],line:snugDone?'Trip '+(snugDone+1):null},
    'flux-weave':{pts:sessions('flux-weave')*12,skills:['logic','reflex'],line:num('fluxBest')?'Best '+num('fluxBest'):null},
    'vortex-bloom':{pts:sessions('vortex-bloom')*12,skills:['reflex','spatial'],line:num('vb-best')?'Best '+num('vb-best'):null},
    'twin-comets':{pts:sessions('twin-comets')*6,skills:['reflex'],line:Object.keys(comets.done||{}).length?Object.keys(comets.done).length+' levels cleared':null},
    'spindle-hop':{pts:sessions('spindle-hop')*6,skills:['reflex'],line:num('spindleRun_1')?'Best '+num('spindleRun_1'):null},
    'snake':{pts:sessions('snake')*6,skills:['reflex'],line:num('snakeBest')?'Best '+num('snakeBest'):null}
  };
  // Daily tests count toward perception too.
  Object.keys(daily).forEach(function(d){G['eyeball-it'].pts+=10+Math.round((daily[d].score||0)/5)});

  [].forEach.call(document.querySelectorAll('[data-game]'),function(a){
    var g=G[a.getAttribute('data-game')],p=a.querySelector('.prog'),go=a.querySelector('.go'),fresh=a.querySelector('.new');
    if(!g||!g.line)return;
    if(p)p.textContent=g.line;
    if(go)go.textContent='Continue ▸';
    if(fresh)fresh.remove();
  });

  // Brain profile: each skill levels up on a square-root curve so early levels come fast.
  var skill={perception:0,spatial:0,logic:0,reflex:0},total=0;
  Object.keys(G).forEach(function(id){G[id].skills.forEach(function(s){skill[s]+=G[id].pts});total+=G[id].pts});
  function lvl(p){var L=Math.floor(Math.sqrt(p/25))+1,lo=25*(L-1)*(L-1),hi=25*L*L;return{L:L,frac:(p-lo)/(hi-lo)}}
  var brain=0;
  [].forEach.call(document.querySelectorAll('.meter'),function(m){
    var s=m.getAttribute('data-skill'),l=lvl(skill[s]);brain+=l.L;
    m.querySelector('.lv').textContent='Lv '+l.L;
    var t=m.querySelector('.track'),on=Math.round(l.frac*10);
    t.innerHTML=new Array(11).join('<i></i>');
    [].forEach.call(t.children,function(c,i){if(i<on)c.className='on'});
    m.setAttribute('aria-label',s+' level '+l.L);
  });
  brain-=3;
  $('brainLv').textContent=brain;
  $('profPts').textContent=total+' pts';
  if(total){
    var best=Object.keys(skill).sort(function(a,b){return skill[b]-skill[a]}),lo=best[best.length-1];
    var tip={perception:'Eyeball It!',spatial:'Snug Pack',logic:'Flux Weave',reflex:'Vortex Bloom'}[lo];
    $('profNote').textContent='Strongest: '+best[0]+'. To level up '+lo+', try '+tip+'.';
  }

  // Daily Challenge.
  function streak(){var n=0,d=new Date();if(!daily[key(d)])d.setDate(d.getDate()-1);while(daily[key(d)]){n++;d.setDate(d.getDate()-1)}return n}
  var sk=streak(),no=Math.floor((new Date(DAY+'T12:00:00')-new Date('2026-10-19T12:00:00'))/864e5)+1;
  $('streak').textContent=sk;
  $('dailyNo').textContent='Daily Challenge #'+no;
  $('dDays').textContent=Object.keys(daily).length;
  var t=daily[DAY];
  if(t){
    $('dailyTodo').hidden=true;$('dailyDone').hidden=false;
    $('dailyH').innerHTML='Done for <em>today</em>';
    $('dScore').textContent=t.score;$('dGrade').textContent=t.grade;
    var sq=(t.tests||[]).map(function(s){return s>=85?'🟩':s>=60?'🟨':'🟥'}).join('');
    $('dSq').textContent=sq;
    var text='Infinite Games Daily #'+no+'\n👁 '+t.score+'/100 '+t.grade+(sk>1?'  🔥'+sk:'')+'\n'+sq+'\ngrantdilli.github.io';
    $('dShare').onclick=function(){var b=this;
      try{navigator.clipboard.writeText(text).then(function(){b.textContent='Copied!'},function(){b.textContent='Copy failed'})}catch(e){b.textContent='Copy failed'}};
  }
  $('dailyGo').addEventListener('click',function(){wr('ig.dailyLaunch',DAY)});
  function tick(){var n=new Date(),m=new Date(n);m.setHours(24,0,0,0);var s=Math.max(0,Math.floor((m-n)/1000));
    $('dNext').textContent=Math.floor(s/3600)+'h '+('0'+Math.floor(s%3600/60)).slice(-2)+'m'}
  tick();setInterval(tick,30000);

  // Badges.
  var played=Object.keys(stats).filter(function(id){return sessions(id)>0}).length;
  var B=[
    ['First game','Play any game',played>0,'#00e5ff'],
    ['Daily player','Finish a Daily Challenge',Object.keys(daily).length>0,'#ffe14d'],
    ['On a roll','3-day daily streak',sk>=3,'#ff2bd6'],
    ['Week of wits','7-day daily streak',sk>=7,'#ff2bd6'],
    ['Sharp eyes','Score 85+ in Eyeball It!',(eye.best||0)>=85,'#00e5ff'],
    ['Block roller','Clear 10 Topple levels',toppleDone>=10,'#ff2bd6'],
    ['Topple master','Clear all 56 levels',toppleDone>=56,'#ff2bd6'],
    ['Light packer','Pack 10 suitcases',snugDone>=10,'#a06bff'],
    ['Explorer','Try 5 different games',played>=5,'#c6ff3d'],
    ['Big brain','Reach Brain Lv 10',brain>=10,'#c6ff3d']
  ];
  var got=0;
  $('badges').innerHTML=B.map(function(b){if(b[2])got++;
    return '<div class="badge'+(b[2]?' got':'')+'"><svg viewBox="0 0 34 34" aria-hidden="true"><path d="M17 2 L31 10 V24 L17 32 L3 24 V10Z" fill="none" stroke="'+b[3]+'" stroke-width="3"/>'+
      (b[2]?'<path d="M11 17 L15.5 21.5 L23.5 12.5" fill="none" stroke="'+b[3]+'" stroke-width="3"/>':'<rect x="13" y="15" width="8" height="7" fill="'+b[3]+'"/><path d="M14.5 15 V12.5 a2.5 2.5 0 0 1 5 0 V15" fill="none" stroke="'+b[3]+'" stroke-width="2"/>')+
      '</svg><span><b>'+b[0]+'</b><small>'+b[1]+'</small></span></div>'}).join('');
  $('badgeCount').textContent=got+' of '+B.length;
})();
