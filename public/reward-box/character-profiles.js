(()=>{'use strict';
const S=()=>window.CharacterStamps;
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=v=>Number(v||0).toLocaleString('ja-JP');
let A=null,id=null,view='detail',tab='radar',goodsTab='special',attr=0,peek=null,oldOverflow='';
const person=()=>A.chars.find(c=>c.id===id);
const avatar=(s,c)=>S().img(s.charStamps[c]?.avatar,'cp-portrait-img')||'<span>'+E(A.chars.find(x=>x.id===c).name)+'</span>';
function header(s){
 const keys=['physical','mental','technical','wisdom','ingenuity','coins'],names=['フィジカル','メンタル','テクニック','悟性','工夫','ニャンコイン'];
 return `<div class="cp-toolbar"><div class="cp-resources">${keys.map((k,i)=>`<button data-cp-intake><small>${names[i]}</small><b>${F(s.resources[k])}${k==='coins'?'🐱':''}</b></button>`).join('')}</div><button class="cp-shoplink" data-cp-shop>🛍️ ショップ ›</button></div>`;
}
function lobby(s){
 return `<h2 class="cp-title">12人の王子たち</h2><div class="cp-portraits">${A.chars.map(c=>`<button data-cp-select="${c.id}" aria-label="${E(c.name)}">${avatar(s,c.id)}</button>`).join('')}</div>`;
}
function skillPane(){
 const old=document.querySelector('#character-detail [data-char-pane="skills"]');
 return `<div class="cp-skillpane">${old?old.innerHTML.replaceAll('data-skill=','data-cp-skill='):'スキルなし'}</div>`;
}
function radarPane(){
 const s=A.state(),st=s.characters[id],ch=person();
 return '<div class="cp-radar-stack">'+A.GROUPS.map(([key,name,start,end])=>{
  const labels=A.ATTR.slice(start,end),maximum=labels.map((_,i)=>ch.levels[start+i][5]);
  const target=labels.map((_,i)=>ch.levels[start+i][Math.min(5,st.stage)]);
  const values=st.attrs.slice(start,end);
  const point=(i,m)=>{const theta=-Math.PI/2+i*Math.PI*2/5;return [205+105*m*Math.cos(theta),190+105*m*Math.sin(theta)];};
  const poly=values=>values.map((v,i)=>point(i,v).map(v=>v.toFixed(1)).join(',')).join(' ');
  const rings=[.25,.5,.75,1].map(v=>'<polygon points="'+poly(Array(5).fill(v))+'" fill="none" stroke="var(--theme-line,#ded3e7)" stroke-width="1.2"/>').join('');
  const goal='<polygon points="'+poly(target.map((v,i)=>Math.min(1,v/Math.max(1,maximum[i]))))+'" fill="none" stroke="var(--theme-target,#829f94)" stroke-dasharray="6,5" stroke-width="2.4"/>';
  const current='<polygon points="'+poly(values.map((v,i)=>Math.min(1,v/Math.max(1,maximum[i]))))+'" fill="var(--theme-chart-fill,#b583ba33)" stroke="var(--theme-accent,#7256aa)" stroke-width="3"/>';
  const axis=labels.map((label,i)=>{
    const [x,y]=point(i,1.27),[tx,ty]=point(i,1.51);
    return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" fill="var(--theme-text,#4b4357)" font-size="13" font-weight="700" text-anchor="middle">'+E(label)+'</text>'+
      '<text x="'+tx.toFixed(1)+'" y="'+ty.toFixed(1)+'" fill="var(--theme-accent,#7256aa)" font-size="14" font-weight="800" text-anchor="middle">'+F(values[i])+' / '+F(target[i])+'</text>';
  }).join('');
  const resource=Number(s.resources[key]||0),shared=Number(s.resources.base||0);
  const actions=labels.map((label,i)=>{
    const n=start+i;
    return '<button type="button" class="cp-radar-point" data-cp-attr="'+n+'" aria-label="'+E(label)+'にポイント投入"><small>'+E(label)+'</small><b>'+F(values[i])+'</b><span>＋</span></button>';
  }).join('');
  return '<section class="cp-radar-card"><div class="cp-radar-heading"><h3>'+E(name)+'</h3><span>所持 '+F(resource)+'pt ＋ 共通 '+F(shared)+'pt</span></div>'+
  '<div class="cp-radar-point-actions">'+actions+'</div>'+
  '<div class="cp-radar-graphic"><svg viewBox="0 0 410 405" role="img" aria-label="'+E(name)+'の現在値と次段階目標">'+rings+goal+current+axis+'</svg></div></section>';
 }).join('')+'</div><button class="cp-primary cp-boost" data-cp-boost>✨ 次の段階まで一括投入</button>';
}function points(s) {
 const t=s.characters[id],ch=person(),i=attr,g=A.GROUPS.find(v=>i>=v[2]&&i<v[3]),cap=ch.levels[i][5],factor=A.KEYS[i]===ch.signature?1.5:1;
 const next=ch.levels[i][Math.min(t.stage,5)],max=Math.max(0,Math.ceil((cap-t.attrs[i])/factor)),available=Math.min(max,s.resources[g[0]]+s.resources.base);
 return `<div class="cp-panel"><h3>${E(A.ATTR[i])}にポイントを投入</h3><p>現在 ${F(t.attrs[i])} / 次段階 ${next} / 最終 ${cap} · 所持から投入可能 ${available}pt</p>
 <p>${E(g[1])} ${F(s.resources[g[0]])} ＋ 共通 ${F(s.resources.base)}</p>
 <form id="cp-invest"><input type="number" name="amount" min="1" max="${available}" required inputmode="numeric"><button class="cp-primary" ${available?'':'disabled'}>投入</button></form></div>`;
}
function shop(s){
 const list=A.GIFTS.filter(g=>g.type===goodsTab);
 return `<div class="cp-panel"><div class="cp-shop-balance">🐱 所持ニャンコイン <b>${F(s.resources.coins)}</b></div>
 <div class="cp-shop-tabs">${[['special','スペシャル'],['food','フード'],['fashion','ファッション']].map(([k,v])=>`<button data-cp-goods-tab="${k}" class="${goodsTab===k?'active':''}">${v}</button>`).join('')}</div>
 ${list.map(g=>`<div class="cp-good"><div><b>${E(g.name)}</b><small>🐱${F(g.price)} · 所持 ${s.itemStock[g.id]||0}</small></div>
 <button data-cp-buy="${g.id}" ${s.resources.coins<g.price||g.type!=='food'&&s.gifts[id]?.includes(g.id)?'disabled':''}>購入</button></div>`).join('')}</div>`;
}
function gifts(s){
 const list=A.GIFTS.filter(g=>s.itemStock[g.id]>0&&(g.type!=='special'||g.cid===id));
 return `<div class="cp-panel"><h3>🎁 ${E(person().name)}へ贈る</h3>
 ${list.length?list.map(g=>`<div class="cp-good"><div><b>${E(g.name)}</b><small>在庫 ${s.itemStock[g.id]} · 好感度+${A.giftValue(g,id)}</small></div>
 <button data-cp-give="${g.id}" ${g.type!=='food'&&s.gifts[id]?.includes(g.id)?'disabled':''}>贈る</button></div>`).join(''):'<p class="cp-notice">贈る品物がありません。ショップで購入してください。</p>'}
 <button class="cp-action" data-cp-shop>ショップへ</button></div>`;
}
function detail(s){
 const t=s.characters[id],cap=[150,300,550,900,1200,1500][t.stage-1];
 const pane=tab==='skills'?skillPane():tab==='radar'?radarPane():
 window.DateSystem.render(s,id,S().flames(s,id)>0);
 return `<button class="cp-back" data-cp-back>‹ 12人の王子たち</button>
 <div class="cp-profile"><div class="cp-photo">${avatar(s,id)}</div><div class="cp-info"><h2>${E(person().name)}</h2>
 <b>第${t.stage}段階 / 6</b>${S().flameHTML(s,id)}
 <button class="cp-action" data-cp-open-book>📅 打刻帳を開く</button>
 <div class="cp-heart"><span>💗 好感度</span><b>${F(t.affinity)} / ${cap}</b></div>
 <div class="cp-heartbar"><i style="width:${Math.min(100,100*t.affinity/cap)}%"></i></div>
 <button class="cp-action" data-cp-gift>🎁 プレゼントを贈る</button></div></div>
 <div class="cp-tabs">${[['radar','レーダー'],['skills','スキル'],['date','デート']].map(([k,n])=>`<button data-cp-tab="${k}" class="${k===tab?'active':''}">${n}</button>`).join('')}</div>
 ${pane}`;
}
function modalContent(s){
 if(view==='book')return S().calendar(s,id);
 if(view==='attr')return points(s);
 if(view==='shop')return shop(s);
 if(view==='gifts')return gifts(s);
 return '';
}
function closeModal(){view='detail';render();}
function modalRender(s){
 if(!peek)return;
 const open=Boolean((id||view==='shop')&&view!=='detail');
 if(!open){const wasOpen=peek.classList.contains('open');peek.innerHTML='';peek.classList.remove('open');peek.setAttribute('aria-hidden','true');if(wasOpen)document.body.style.overflow=oldOverflow;return;}
 if(!peek.classList.contains('open'))oldOverflow=document.body.style.overflow;
 peek.innerHTML=`<div class="cp-peek-scrim" data-cp-peek-close></div>
 <div class="cp-peek-dialog" role="dialog" aria-modal="true" aria-label="${{shop:'ショップ',book:'打刻帳',gifts:'プレゼント',attr:'ポイント投入'}[view]||'キャラ操作'}">
 <div class="cp-peek-top"><b>${view==='shop'?'ショップ':E(person().name)+' · '+({book:'打刻帳',gifts:'プレゼント',attr:'ポイント投入'}[view]||'キャラ操作')}</b>
 <button type="button" aria-label="閉じる" data-cp-peek-close>×</button></div>
 <div class="cp-peek-scroll">${modalContent(s)}</div></div>`;
 peek.classList.add('open');peek.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
}let lastUIKey='';
function render() {
 if(!A)return;
 const s=A.state();S().migrate(s,A.chars);
 const root=document.getElementById('cp-home');if(!root)return;
 // Do not discard the whole screen, focus, photo, or input state on unrelated saves.
 const key=JSON.stringify([id,view,tab,goodsTab,attr,
  s.resources,s.characters,s.charStamps,s.itemStock,s.gifts,s.stampTickets,
  s.protectionDays,s.dateLocked,s.dates,s.dateHistory]);
 if(key===lastUIKey&&root.childElementCount){return;}
 root.innerHTML=header(s)+(id?detail(s):lobby(s));
 lastUIKey=key;
 modalRender(s);
 window.AppPhotos?.hydrate(root).catch(error=>console.warn('キャラ写真を表示できません:',error));
}
function bind(api) {
 A=api;const root=document.getElementById('cp-home');
 peek=document.createElement('div');peek.id='cp-peek-overlay';peek.className='cp-peek-overlay';peek.setAttribute('aria-hidden','true');document.body.appendChild(peek);
 peek.addEventListener('click',event=>{if(event.target.closest('[data-cp-peek-close]'))closeModal()});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&peek.classList.contains('open')){event.stopPropagation();closeModal();}});

 const onSubmit=ev=>{
 if(ev.target.id!=='cp-invest')return;
 ev.preventDefault();const n=Number(new FormData(ev.target).get('amount'));
 if(!Number.isSafeInteger(n)||n<1)return A.toast('投入ptは1以上の整数にしてね');
 view='detail';A.invest(id,attr,n);render();
 };
 root.addEventListener('submit',onSubmit);peek.addEventListener('submit',onSubmit);
 const onClick=ev=>{
 const b=ev.target.closest('button');if(!b)return;
 const s=A.state();
 if(b.hasAttribute('data-cp-intake')){A.openIntake();return;}
 if(b.dataset.cpSelect){id=b.dataset.cpSelect;view='detail';tab='radar';A.selectLegacy(id);render();return;}
 if(b.hasAttribute('data-cp-back')){id=null;view='detail';render();return;}
 if(b.hasAttribute('data-cp-return')){view='detail';render();return;}
 if(b.dataset.cpTab){tab=b.dataset.cpTab;render();return;}
 if(b.hasAttribute('data-cp-shop')){view='shop';render();return;}
 if(b.hasAttribute('data-cp-gift')){view='gifts';render();return;}
 if(b.hasAttribute('data-cp-open-book')){S().resetMonth();view='book';render();return;}
 if(b.dataset.cpDate){S().chooseDay(b.dataset.cpDate);render();return;}
 if(b.dataset.cpMonth){S().changeMonth(Number(b.dataset.cpMonth));render();return;}
 if(b.hasAttribute('data-cp-stamp')){S().stamp(s,id);return;}
 if(b.dataset.cpFire){S().protect(s,b.dataset.cpFire,b.dataset.cpSlot);return;}
 if(b.dataset.cpSettings){view='detail';render();S().open(b.dataset.cpSettings);return;}
 if(b.dataset.cpAttr){attr=Number(b.dataset.cpAttr);view='attr';render();return;}
 if(b.dataset.cpSkill){A.learn(id,b.dataset.cpSkill);return;}
 if(b.hasAttribute('data-cp-boost')){A.boost(id);return;}
 if(b.dataset.cpGoodsTab){goodsTab=b.dataset.cpGoodsTab;render();return;}
 if(b.dataset.cpBuy){
  const g=A.GIFTS.find(x=>x.id===b.dataset.cpBuy);if(!g||s.resources.coins<g.price)return A.toast('残高が足りません');
  if(id&&g.type!=='food'&&s.gifts[id]?.includes(g.id))return A.toast('贈呈済みです');
  if(!window.confirm('「'+g.name+'」を🐱'+g.price+'で購入しますか？'))return;
  s.resources.coins-=g.price;s.itemStock[g.id]=(s.itemStock[g.id]||0)+1;
  A.log('purchase','購入 '+g.name,'🐱−'+g.price);A.commit();A.toast('購入して持ち物に追加しました');return;
 }
 if(b.dataset.cpGive){
  const g=A.GIFTS.find(x=>x.id===b.dataset.cpGive);
  if(!g||!s.itemStock[g.id]||g.type==='special'&&g.cid!==id)return;
  if(g.type!=='food'&&s.gifts[id]?.includes(g.id))return A.toast('贈呈済み');
  const val=A.giftValue(g,id);
  if(!window.confirm(person().name+'に「'+g.name+'」を贈りますか？ 好感度+'+val))return;
  s.itemStock[g.id]--;
  if(g.type!=='food')s.gifts[id]=[...(s.gifts[id]||[]),g.id];
  A.addAffinity(id,val,'ギフト '+g.name);A.commit();A.toast('プレゼントを贈りました ♡');
 }
 };
 root.addEventListener('click',onClick);peek.addEventListener('click',onClick);
 render();
}
window.CharacterProfiles={bind,render,current:()=>id};
})();