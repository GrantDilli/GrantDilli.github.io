// Full-screen helpers shared by the page-style games: the header's full-screen button, one automatic switch on the
// first touch on phones, closing the "more" panel, and a resize nudge when only the play area changes size.
(()=>{
  const d=document,root=d.documentElement;
  const can=!!(d.fullscreenEnabled||d.webkitFullscreenEnabled);
  const isFs=()=>!!(d.fullscreenElement||d.webkitFullscreenElement);
  const enter=()=>{const f=root.requestFullscreen||root.webkitRequestFullscreen;if(!f)return;
    try{const p=f.call(root,{navigationUI:'hide'});if(p&&p.catch)p.catch(()=>{})}catch(e){}};
  const exit=()=>{const f=d.exitFullscreen||d.webkitExitFullscreen;if(f)f.call(d)};
  const btns=[...d.querySelectorAll('[data-fs]')];
  const sync=()=>btns.forEach(b=>{const on=isFs();b.setAttribute('aria-pressed',on);b.title=on?'Exit full screen':'Full screen'});
  btns.forEach(b=>{b.hidden=!can;b.addEventListener('click',()=>{isFs()?exit():enter();b.blur()})});
  d.addEventListener('fullscreenchange',sync);d.addEventListener('webkitfullscreenchange',sync);sync();
  // Phones and tablets: go full screen on the first touch, once per visit. Portal builds leave this to the portal.
  if(can&&!window.bridge&&matchMedia('(pointer:coarse)').matches){
    const once=e=>{if(e.pointerType!=='touch')return;removeEventListener('pointerup',once,true);if(!isFs())enter()};
    addEventListener('pointerup',once,true);
  }
  // The "more" panel: close button, Escape, and picking a level or difficulty all close it.
  d.querySelectorAll('details.more').forEach(m=>{
    const shut=()=>{m.open=false};
    m.addEventListener('toggle',()=>m.querySelector('summary').blur());
    m.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&(b.classList.contains('close')||b.closest('.levels,.skills')))shut()},true);
    addEventListener('keydown',e=>{if(e.key==='Escape'&&m.open)shut()});
  });
  // Games size their canvas on window resize; tell them when only the stage changed.
  const st=d.querySelector('.fs .stage');
  if(st&&window.ResizeObserver)new ResizeObserver(()=>dispatchEvent(new Event("resize"))).observe(st);
})();
