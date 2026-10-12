(()=>{'use strict';
const S=()=>window.CharacterStamps;
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=v=>Number(v||0).toLocaleString('ja-JP');
let A=null,id=null,view='detail',tab='skills',goodsTab='special',attr=0;
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
 const old=document.querySelector('#character-detail .radar-grid');
 return `<div class="cp-radar-stack">${old?old.innerHTML:'レーダーなし'}</div><button class="cp-primary" data-cp-boost>✨ 次の段階まで一括投入</button>`;
}
function points(s) {
 const t=s.characters[id],ch=person(),i=attr,g=A.GROUPS.find(v=>i>=v[2]&&i<v[3]),cap=ch.levels[i][5],factor=A.KEYS[i]===ch.signature?1.5:1;
 const max=Math.max(0,Math.ceil((cap-t.attrs[i])/factor));
 return `<div class="cp-panel"><h3>${E(A.ATTR[i])}にポイントを投入</h3><p>現在 ${F(t.attrs[i])} / ${cap} · 最大 ${max}pt</p>
 <p>${E(g[1])} ${F(s.resources[g[0]])} ＋ 共通 ${F(s.resources.base)}</p>
 <form id="cp-invest"><input type="number" name="amount" min="1" max="${max}" required inputmode="numeric"><button class="cp-primary" ${max?'':'disabled'}>投入</button></form></div>`;
}
function shop(s){
 const list=A.GIFTS.filter(g=>g.type===goodsTab&&(g.type!=='special'||g.cid===id));
 return `<div class="cp-panel"><h3>🛍️ ニャンコインショップ</h3><p>こちらは購入専用。贈呈はキャラ画面で行います。</p>
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
 let pane;
 if(view==='book')pane=S().calendar(s,id);
 else if(view==='attr')pane=points(s);
 else if(view==='shop')pane=shop(s);
 else if(view==='gifts')pane=gifts(s);
 else if(tab==='skills')pane=skillPane();
 else if(tab==='radar')pane=radarPane();
 else pane=`<div class="cp-panel"><h3>💗 デート</h3><p>${S().flames(s,id)?'🔥 デート条件達成':'火がすべて消えているためデート不可'}</p><p class="cp-notice">デート内容は準備中</p></div>`;
 const nav=view==='detail'?`<div class="cp-tabs">${[['skills','スキル'],['radar','レーダー'],['date','デート']].map(([k,n])=>`<button data-cp-tab="${k}" class="${k===tab?'active':''}">${n}</button>`).join('')}</div>`:'<button class="cp-back" data-cp-return>‹ 育成詳細に戻る</button>';
 return `<button class="cp-back" data-cp-back>‹ 12人の王子たち</button>
 <div class="cp-profile"><div class="cp-photo">${avatar(s,id)}</div><div class="cp-info"><h2>${E(person().name)}</h2>
 <b>第${t.stage}段階 / 6</b>${S().flameHTML(s,id)}
 <button class="cp-action" data-cp-open-book>📅 打刻帳を開く</button>
 <div class="cp-heart"><span>💗 好感度</span><b>${F(t.affinity)} / ${cap}</b></div>
 <div class="cp-heartbar"><i style="width:${Math.min(100,100*t.affinity/cap)}%"></i></div>
 <button class="cp-action" data-cp-gift>🎁 プレゼントを贈る</button></div></div>
 ${stat(s)}${nav}${pane}`;
}
function render() {
 if(!A)return;
 const s=A.state();S().migrate(s,A.chars);
 document.getElementById('cp-home').innerHTML=header(s)+(id?detail(s):lobby(s));
}
function bind(api) {
 A=api;const root=document.getElementById('cp-home');
 root.addEventListener('submit',ev=>{
 if(ev.target.id!=='cp-invest')return;
 ev.preventDefault();const n=Number(new FormData(ev.target).get('amount'));
 if(!Number.isSafeInteger(n)||n<1)return A.toast('投入ptは1以上の整数にしてね');
 A.invest(id,attr,n);view='detail';
 });
 root.addEventListener('click',ev=>{
 const b=ev.target.closest('button');if(!b)return;
 const s=A.state();
 if(b.hasAttribute('data-cp-intake')){A.openIntake();return;}
 if(b.dataset.cpSelect){id=b.dataset.cpSelect;view='detail';tab='skills';A.selectLegacy(id);render();return;}
 if(b.hasAttribute('data-cp-back')){id=null;view='detail';render();return;}
 if(b.hasAttribute('data-cp-return')){view='detail';render();return;}
 if(b.dataset.cpTab){tab=b.dataset.cpTab;render();return;}
 if(b.hasAttribute('data-cp-shop')){if(!id)id=A.chars[0].id;view='shop';render();return;}
 if(b.hasAttribute('data-cp-gift')){view='gifts';render();return;}
 if(b.hasAttribute('data-cp-open-book')){S().resetMonth();view='book';render();return;}
 if(b.dataset.cpMonth){S().changeMonth(Number(b.dataset.cpMonth));render();return;}
 if(b.hasAttribute('data-cp-stamp')){S().stamp(s,id);return;}
 if(b.dataset.cpFire){S().protect(s,b.dataset.cpFire,b.dataset.cpSlot);return;}
 if(b.dataset.cpSettings){S().open(b.dataset.cpSettings);return;}
 if(b.dataset.cpAttr){attr=Number(b.dataset.cpAttr);view='attr';render();return;}
 if(b.dataset.cpSkill){A.learn(id,b.dataset.cpSkill);return;}
 if(b.hasAttribute('data-cp-boost')){A.boost(id);return;}
 if(b.dataset.cpGoodsTab){goodsTab=b.dataset.cpGoodsTab;render();return;}
 if(b.dataset.cpBuy){
  const g=A.GIFTS.find(x=>x.id===b.dataset.cpBuy);if(!g||s.resources.coins<g.price)return A.toast('残高が足りません');
  if(g.type!=='food'&&s.gifts[id]?.includes(g.id))return A.toast('贈呈済みです');
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
 });
 render();
}
window.CharacterProfiles={bind,render};
})();