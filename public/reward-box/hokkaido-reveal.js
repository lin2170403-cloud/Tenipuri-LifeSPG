/* Lightweight animation-only overlay. Does not own probability, inventory, or spending. */
(()=>{
'use strict';
const RANK={N:0,R:1,SR:2,SSR:3,UR:4,MR:5};
const COLORS={N:['#c9cdd7','#7a8392'],R:['#9dd7f5','#4c86cb'],SR:['#c3a4ff','#7f65c9'],SSR:['#f9d384','#c08c30'],UR:['#f0a1df','#9151d7'],MR:['#f3b6d9','#d19a45']};
const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
let layer=null,session=null,sequence=0;
function burst(tier){
 if(reduced()||typeof window.confetti!=='function')return;
 const color=COLORS[tier]||COLORS.SR;
 try{window.confetti({particleCount:tier==='MR'?130:tier==='UR'?75:38,spread:tier==='MR'?115:75,
 origin:{x:0.5,y:0.43},colors:color,gravity:0.85,scalar:tier==='MR'?1.2:0.8,
 ticks:125,disableForReducedMotion:true,zIndex:200010});}catch(_){}
}
function animateIn(items){
 if(reduced())return;
 if(typeof window.anime==='function'){
   window.anime({targets:items,opacity:[0,1],translateY:[20,0],scale:[0.93,1],
     duration:330,delay:window.anime.stagger(52),easing:'easeOutCubic'});
 }
}
function cleanup(){
 if(!session)return;
 session.timers.forEach(clearTimeout);
 if(typeof window.anime==='function'){
   try{window.anime.remove(layer?.querySelectorAll('.hkrev-card-wrap'));}catch(_){}
 }
 const old=session;session=null;sequence++;
 if(layer){layer.remove();layer=null;}
 document.body.style.overflow=old.previousOverflow;
 old.focus?.focus?.();
}
function cardMarkup(c,i,n){
 const rank=escapeText(c.rarity);
 return `<button type="button" class="hkrev-card-wrap" data-reveal-card="${i}" aria-label="${i+1}枚目を開封" aria-pressed="false">
 <span class="hkrev-flipper hkrev-${rank}">
 <span class="hkrev-face hkrev-back"><span class="hkrev-snow">❄</span><b>HOKKAIDO</b><small>${rank==='MR'?'✦': '✧'} </small></span>
 <span class="hkrev-face hkrev-front"><span class="hkrev-rank">${rank}</span>
 <span class="hkrev-icon" aria-hidden="true">${escapeText(c.icon||'❄️')}</span>
 <span class="hkrev-name">${escapeText(c.character)}</span>
 <span class="hkrev-title">${escapeText(c.name)}</span>
 ${c.duplicate?'<span class="hkrev-duplicate">重複</span>':'<span class="hkrev-new">NEW</span>'}</span>
 </span></button>`;
}
function paint(){
 if(!session||!layer)return;
 const s=session,n=s.results.length,best=s.results.reduce((a,c)=>RANK[c.rarity]>RANK[a.rarity]?c:a,s.results[0]);
 layer.innerHTML=`<div class="hkrev-backdrop" aria-hidden="true"><span>❄</span><span>✦</span><span>❄</span><span>✧</span></div>
 <section class="hkrev-dialog" role="dialog" aria-modal="true" aria-labelledby="hkrev-heading">
  <header class="hkrev-head"><span class="hkrev-kicker">HOKKAIDO MEMORY</span>
   <h2 id="hkrev-heading">${n===10?'10連ガチャ':'北海道ガチャ'}</h2>
   <p id="hkrev-message" aria-live="polite">雪の向こうから、誰が来るかな？</p></header>
  <div class="hkrev-board ${n===1?'hkrev-single':'hkrev-ten'}">
   ${s.results.map((c,i)=>cardMarkup(c,i,n)).join('')}
  </div>
  <div class="hkrev-status" aria-live="polite"><span id="hkrev-progress">開封中 · 0 / ${n}</span>
  <span id="hkrev-best">${RANK[best.rarity]>=3?'特別な出会いの予感 ✦':'北海道の思い出'}</span></div>
  <div class="hkrev-actions">
   <button type="button" class="hkrev-button hkrev-secondary" data-hkrev-all>全開封</button>
   <button type="button" class="hkrev-button hkrev-quiet" data-hkrev-skip>スキップ</button>
   <button type="button" class="hkrev-button hkrev-secondary" data-hkrev-close hidden>閉じる</button>
   <button type="button" class="hkrev-button hkrev-primary" data-hkrev-repeat hidden>${n===10?'もう10連':'もう1回'}</button>
  </div>
 </section>`;
 layer.querySelector('[data-hkrev-all]').addEventListener('click',()=>revealAll(true));
 layer.querySelector('[data-hkrev-skip]').addEventListener('click',()=>revealAll(false));
 layer.querySelector('[data-hkrev-close]').addEventListener('click',cleanup);
 layer.querySelector('[data-hkrev-repeat]').addEventListener('click',()=>{
   const callback=session?.repeat,repeatCount=session?.results.length;
   cleanup();callback?.(repeatCount);
 });
 layer.querySelectorAll('[data-reveal-card]').forEach(el=>el.addEventListener('click',()=>revealAt(Number(el.dataset.revealCard))));
}
function updateMessage(c){
 if(!layer)return;
 const el=layer.querySelector('#hkrev-message');
 if(!el)return;
 if(c.rarity==='MR')el.textContent='MR ✦ '+c.character+' · 最高の出会い！';
 else if(c.rarity==='UR')el.textContent='UR ✦ '+c.character+' が登場！';
 else if(c.rarity==='SSR')el.textContent='SSR ✧ '+c.character+' が登場！';
}
function revealAt(i){
 if(!session||session.opened.has(i))return;
 const s=session,c=s.results[i],button=layer?.querySelector('[data-reveal-card="'+i+'"]');
 if(!button)return;
 s.opened.add(i);
 button.classList.add('is-revealed');
 button.setAttribute('aria-label',c.rarity+' '+c.character+' '+c.name);
 button.setAttribute('aria-pressed','true');
 if(RANK[c.rarity]>=3){
   updateMessage(c);
   button.classList.add('is-rare');
   if(!s.celebrated.has(i)){
     s.celebrated.add(i);
     const delay=c.rarity==='MR'?330:190;
     if(s.opened.size===s.results.length)burst(c.rarity);
     else s.timers.push(setTimeout(()=>{if(session===s)burst(c.rarity)},delay));
   }
 }
 const progress=layer.querySelector('#hkrev-progress');
 if(progress)progress.textContent='開封 · '+s.opened.size+' / '+s.results.length;
 if(s.opened.size===s.results.length)finish(false);
}
function finish(instant){
 const s=session;if(!s||s.finished)return;
 s.finished=true;
 s.timers.forEach(clearTimeout);s.timers=[];
 if(instant)s.results.forEach((c,i)=>revealAt(i));
 layer?.querySelector('[data-hkrev-all]')?.setAttribute('hidden','');
 layer?.querySelector('[data-hkrev-skip]')?.setAttribute('hidden','');
 layer?.querySelector('[data-hkrev-close]')?.removeAttribute('hidden');
 layer?.querySelector('[data-hkrev-repeat]')?.removeAttribute('hidden');
 const top=s.results.reduce((a,c)=>RANK[c.rarity]>RANK[a.rarity]?c:a,s.results[0]);
 const message=layer?.querySelector('#hkrev-message');
 if(message)message.textContent=RANK[top.rarity]>=3?'✦ '+top.rarity+' '+top.character+' · おめでとう！':'開封完了！ 北海道の思い出が増えたよ ♡';
 const status=layer?.querySelector('#hkrev-progress');
 if(status)status.textContent='全'+s.results.length+'枚 開封済み';
}
function revealAll(effects){
 const s=session;if(!s)return;
 s.timers.forEach(clearTimeout);s.timers=[];
 s.results.forEach((c,i)=>{
   if(s.opened.has(i))return;
   const btn=layer?.querySelector('[data-reveal-card="'+i+'"]');
   s.opened.add(i);btn?.classList.add('is-revealed');
   btn?.setAttribute('aria-pressed','true');
   btn?.setAttribute('aria-label',c.rarity+' '+c.character+' '+c.name);
 });
 if(effects){
   const rare=s.results.filter(c=>RANK[c.rarity]>=3).sort((a,b)=>RANK[b.rarity]-RANK[a.rarity]);
   if(rare.length)burst(rare[0].rarity);
 }
 finish(true);
}
function play(results,{repeat}={}){
 if(!Array.isArray(results)||!results.length)return;
 cleanup();
 const data=results.map(x=>({...x}));
 const id=++sequence;
 session={id,results:data,repeat,opened:new Set(),celebrated:new Set(),
 timers:[],previousOverflow:document.body.style.overflow,focus:document.activeElement,finished:false};
 layer=document.createElement('div');layer.id='hk-reveal-overlay';layer.className='hkrev-overlay';
 document.body.appendChild(layer);document.body.style.overflow='hidden';paint();
 const s=session;
 const cards=Array.from(layer.querySelectorAll('.hkrev-card-wrap'));
 animateIn(cards);
 const small=reduced();
 if(small){revealAll(false);return;}
 // 0.35s entrance + rapid stagger; ten reveals typically complete in ~2.5s.
 const initial=380,step=data.length===1?0:165;
 data.forEach((c,i)=>s.timers.push(setTimeout(()=>{if(session===s)revealAt(i)},initial+i*step)));
 s.timers.push(setTimeout(()=>{
   if(session!==s||s.finished)return;
   // Last revealed card may already have finished the display; this is a safety net.
   revealAll(false);
 },initial+data.length*step+1900));
 layer.querySelector('[data-hkrev-skip]')?.focus();
}
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&session){if(session.finished)cleanup();else revealAll(false);}
});
window.HokkaidoReveal={play,close:cleanup,visible:()=>Boolean(session)};
})();