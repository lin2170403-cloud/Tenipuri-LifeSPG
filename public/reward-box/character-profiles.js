(()=>{'use strict';
const S=()=>window.CharacterStamps;
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=v=>Number(v||0).toLocaleString('ja-JP');
let A=null,id=null,view='detail',tab='skills',goodsTab='special',attr=0,peek=null,oldOverflow='';
const person=()=>A.chars.find(c=>c.id===id);
const avatar=(s,c)=>S().img(s.charStamps[c]?.avatar,'cp-portrait-img')||'<span>'+E(A.chars.find(x=>x.id===c).name)+'</span>';
function header(s){
 const keys=['physical','mental','technical','wisdom','ingenuity','coins'],names=['フィジカル','メンタル','テクニック','悟性','工夫','ニャンコイン'];
 return `<div class="cp-toolbar"><div class="cp-resources">${keys.map((k,i)=>`<button data-cp-intake><small>${names[i]}</small><b>${F(s.resources[k])}${k==='coins'?'🐱':''}</b></button>`).join('')}</div><button class="cp-shoplink" data-cp-shop>🛍️ ショップ ›</button></div>`;
}
function lobby(s){
 return `<h2 class="cp-title">12人の王子たち</h2><div class="cp-portraits">${A.chars.map(c=>`<button data-cp-select="${c.id}" aria-label="${E(c.name)}">${avatar(s,c.id)}</button>`).join('')}</div>`;
}
function stat(s){
 const t=s.characters[id];
 return `<div class="cp-stats">${A.GROUPS.map(([k,name,i,j])=>`<div class="cp-statrow"><b>${E(name)}</b><div>${A.ATTR.slice(i,j).map((n,idx)=>`<button data-cp-attr="${i+idx}"><small>${E(n)}</small><strong>${F(t.attrs[i+idx])}</strong></button>`).join('')}</div></div>`).join('')}</div>`;
}
function skillPane(){
 const old=document.querySelector('#character-detail [data-char-pane="skills"]');
 return `<div class="cp-skillpane">${old?old.innerHTML.replaceAll('data-skill=','data-cp-skill='):'スキルなし'}</div>`;
}
function radarPane(){
 const st=A.state().characters[id],ch=person();
 return '<div class="cp-radar-stack">'+A.GROUPS.map(([key,name,start,end])=>{
 const labels=A.ATTR.slice(start,end),max=labels.map((_,i)=>ch.levels[start+i][5]),target=labels.map((_,i)=>ch.levels[start+i][Math.min(5,st.stage)]);
 const pol=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/5;return [200+125*v*Math.cos(a),170+125*v*Math.sin(a)]};
 const shape=vals=>vals.map((v,i)=>pol(i,v).map(x=>x.toFixed(1)).join(',')).join(' ');
 let lines='';for(const r of [.25,.5,.75,1])lines+='<polygon points="'+shape(Array(5).fill(r))+'" fill="none" stroke="#ded3e7" stroke-width="1.3"/>';
 lines+='<polygon points="'+shape(target.map((v,i)=>v/Math.max(1,max[i])))+'" fill="none" stroke="#80968b" stroke-dasharray="5,4" stroke-width="2.3"/>';
 lines+='<polygon points="'+shape(st.attrs.slice(start,end).map((v,i)=>v/Math.max(1,max[i])))+'" fill="#b583ba44" stroke="#b57b59" stroke-width="3"/>';
 labels.forEach((v,i)=>{const [x,y]=pol(i,1.2);lines+='<text x="'+x+'" y="'+y+'" font-size="13" text-anchor="middle" fill="#5e5969">'+E(v)+'</text>'});
 return '<section class="cp-radar-card"><h3>'+E(name)+'</h3><svg viewBox="0 0 400 350" role="img">'+lines+'</svg><div class="cp-radar-values">'+labels.map((v,i)=>'<span>'+E(v)+' <b>'+F(st.attrs[start+i])+' / '+target[i]+'</b> · あと'+Math.max(0,Math.ceil(target[i]-st.attrs[start+i]))+'</span>').join('')+'</div></section>';
 }).join('')+'</div><button class="cp-primary" data-cp-boost>✨ 次の段階まで一括投入</button>';
}
function points(s) {
 const t=s.characters[id],ch=person(),i=attr,g=A.GROUPS.find(v=>i>=v[2]&&i<v[3]),cap=ch.levels[i][5],factor=A.KEYS[i]===ch.signature?1.5:1;
 const next=ch.levels[i][Math.min(t.stage,5)],max=Math.max(0,Math.ceil((cap-t.attrs[i])/factor)),available=Math.min(max,s.resources[g[0]]+s.resources.base);
 return `<div class="cp-panel"><h3>${E(A.ATTR[i])}にポイントを投入</h3><p>現在 ${F(t.attrs[i])} / 次段階 ${next} / 最終 ${cap} · 所持から投入可能 ${available}pt</p>
 <p>${E(g[1])} ${F(s.resources[g[0]])} ＋ 共通 ${F(s.resources.base)}</p>
 <form id="cp-invest"><input type="number" name="amount" min="1" max="${available}" required inputmode="numeric"><button class="cp-primary" ${available?'':'disabled'}>投入</button></form></div>`;
}
function shop(s){
 const list=A.GIFTS.filter(g=>g.type===goodsTab);
 return `<div class="cp-panel"><div class="cp-shop-balance">🐱 所持ニャンコイン <b>${F(s.resources.coins)}</b></div><p>購入専用 · 贈呈は各キャラ画面から行います。</p>
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
 ${stat(s)}<div class="cp-tabs">${[['skills','スキル'],['radar','レーダー'],['date','デート']].map(([k,n])=>`<button data-cp-tab="${k}" class="${k===tab?'active':''}">${n}</button>`).join('')}</div>
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
}function render() {
 if(!A)return;
 const s=A.state();S().migrate(s,A.chars);
 document.getElementById('cp-home').innerHTML=header(s)+(id?detail(s):lobby(s));modalRender(s);
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
 if(b.dataset.cpSelect){id=b.dataset.cpSelect;view='detail';tab='skills';A.selectLegacy(id);render();return;}
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