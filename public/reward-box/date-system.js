(()=>{'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString('ja-JP')+'円';
const token=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const types={place:'📍場所',food:'🍰食べ物',gift:'🎁プレゼント',activity:'🎬観賞',other:'✨その他'};
let api,selected=new Set(),photo='',selectionChar=null,photoLoading=false;
function migrate(s,chars){if(!s.dateProfiles||typeof s.dateProfiles!=='object')s.dateProfiles={};for(const c of chars){const d=s.dateProfiles[c.id]||{};if(!Array.isArray(d.wishlist))d.wishlist=[];if(!Array.isArray(d.memories))d.memories=[];s.dateProfiles[c.id]=d;}}
function allocated(s){return Object.values(s.dateProfiles||{}).flatMap(x=>x.wishlist||[]).filter(x=>!x.done).reduce((n,x)=>n+(Number(x.funded)||0),0);}
const available=s=>Math.max(0,s.dateLocked-allocated(s));
function tickets(s){
 const assigned=new Set(Object.values(s.dateProfiles||{}).flatMap(v=>v.wishlist||[]).filter(x=>!x.done&&x.voucherUid).map(x=>x.voucherUid));
 return (s.vouchers||[]).filter(v=>v.uid&&Number(v.amount)>0&&!Number(v.used||0)&&!assigned.has(v.uid));
}
function usableVoucher(s,x){return x.voucherUid&&(s.vouchers||[]).some(v=>v.uid===x.voucherUid&&Number(v.amount)>0&&!Number(v.used||0));}
function ready(s,x){return !x.done&&(x.voucherUid?usableVoucher(s,x):x.funded===x.cost);}

function render(s,cid,canDate=true){
 migrate(s,api.chars);if(selectionChar!==cid){selected.clear();selectionChar=cid;}const d=s.dateProfiles[cid];
 return `<div class="vdate"><div class="vdate-summary"><b>💗 未配分 ${money(available(s))}</b><p>割り当てた資金はほかの項目に移せません。</p></div>
 <div class="vdate-create-buttons"><button type="button" data-vdate-add>＋ ウィッシュを追加</button>
 <button type="button" data-vdate-ticket-add ${tickets(s).length?'':'disabled'}>🎟️ 出費権利を引用（${tickets(s).length}枚）</button></div>
 ${d.wishlist.map(x=>{
 const ok=ready(s,x),remain=Math.max(0,x.cost-x.funded);
 return `<div class="vdate-row"><label><input type="checkbox" data-vdate-select="${x.id}" ${selected.has(x.id)?'checked':''} ${ok?'':'disabled'}></label>
 <div><b>${types[x.type]||types.other} ${E(x.title)}</b><small>${x.voucherUid?'🎟️ 出費権利 '+money(x.cost):money(x.funded)+' / '+money(x.cost)} ${x.done?'· 実行済み':ok?'· 準備完了':'· 残り'+money(remain)}</small>
 <p>${E(x.note)}</p>${!x.done&&x.voucherUid?`<button type="button" class="vdate-release" data-vdate-release="${x.id}">券の引用を解除</button>`:''}${!x.done&&!x.voucherUid&&remain>0?`<form data-vdate-fund="${x.id}"><input type="number" min="1" max="${Math.min(remain,available(s))}" inputmode="numeric" placeholder="金額" required><button ${available(s)<1?'disabled':''}>入金</button></form>`:''}</div></div>`;
 }).join('')||'<p>登録されたウィッシュはまだありません。</p>'}
 ${!canDate?'<p class="cp-notice">炎がすべて消えているため、デート実行はできません。ウィッシュリストの編集・入金は可能です。</p>':''}<button type="button" class="cp-primary" data-vdate-go ${selected.size&&canDate?'':'disabled'}>💗 デートに行く（${selected.size}件）</button>
 <h3>思い出アルバム</h3>${d.memories.slice().reverse().map(m=>`<details class="vdate-memory"><summary>${E(m.date)} · ${m.items.length}件</summary>${typeof m.image==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(m.image)?`<img src="${m.image}" alt="思い出">`:''}<p>${E(m.note)}</p><small>${m.items.map(x=>E(x.title)).join('、')}</small></details>`).join('')||'<p>まだ思い出はありません。</p>'}</div>`;
}
function popup(markup){
 const host=document.createElement('div');host.className='vdate-overlay';host.innerHTML='<section class="vdate-dialog">'+markup+'</section>';document.body.appendChild(host);
 host.addEventListener('click',e=>{if(e.target===host||e.target.closest('[data-vdate-cancel]'))host.remove()});return host;
}
function create(cid){
 const h=popup(`<h3>新しいウィッシュ</h3><form id="vdate-create">
 <label>種類<select name="type">${Object.entries(types).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
 <label>名前<input name="title" maxlength="100" required></label><label>必要経費<input type="number" name="cost" min="0" required></label>
 <label>備考<textarea name="note" maxlength="500"></textarea></label>
 <button type="button" data-vdate-cancel>キャンセル</button><button class="cp-primary">登録</button></form>`);
 h.addEventListener('submit',e=>{e.preventDefault();const form=new FormData(e.target),cost=Number(form.get('cost'));
 if(!Number.isSafeInteger(cost)||cost<0)return api.toast('金額を確認してください');
 const title=String(form.get('title')).trim();if(!title)return;
 api.state().dateProfiles[cid].wishlist.push({id:token(),type:form.get('type'),title,cost,funded:0,note:String(form.get('note')||''),done:false});
 h.remove();api.save();
 });
}
function createFromTicket(cid){
 const s=api.state(),list=tickets(s);
 if(!list.length)return api.toast('使用可能な出費権利がありません');
 const h=popup(`<h3>🎟️ 出費権利をウィッシュに引用</h3>
 <form id="vdate-ticket-create"><label>未使用の出費権利
 <select name="voucher">${list.map(v=>`<option value="${E(v.uid)}">${E(v.name)} · ${money(v.amount)}</option>`).join('')}</select></label>
 <label>カテゴリー<select name="type">${Object.entries(types).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
 <label>備考<textarea name="note" maxlength="500"></textarea></label>
 <p class="minor">券をこのウィッシュに予約します。現金のデート資金は減りません。デート実行時に券を1度だけ使用します。</p>
 <button type="button" data-vdate-cancel>キャンセル</button><button class="cp-primary">引用する</button></form>`);
 h.addEventListener('submit',e=>{
  e.preventDefault();
  const form=new FormData(e.target),uid=String(form.get('voucher')),v=tickets(api.state()).find(v=>v.uid===uid);
  if(!v)return api.toast('すでに引用・使用済みの券です');
  api.state().dateProfiles[cid].wishlist.push({id:token(),type:form.get('type'),title:v.name,cost:v.amount,funded:0,voucherUid:v.uid,note:String(form.get('note')||''),done:false});
  h.remove();api.save();api.toast('出費権利をデートに確保したよ 🎟️');
 });
}function execute(cid,items){
 photo='';photoLoading=false;const h=popup(`<h3>💗 デートの思い出</h3><p>${items.map(x=>E(x.title)).join('、')}</p>
 <form id="vdate-execute"><label>日付<input name="date" type="date" required value="${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})}"></label>
 <label>ノート<textarea name="note" maxlength="2500"></textarea></label>
 <label>写真<input name="image" type="file" accept="image/*"></label>
 <button data-vdate-cancel type="button">キャンセル</button><button class="cp-primary">記録する</button></form>`);
 h.querySelector('[name=image]').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;if(f.size>10e6)return api.toast('10MB以下の画像を選んでね');
 photoLoading=true;const r=new FileReader();r.onload=()=>{const image=new Image();image.onload=()=>{const c=document.createElement('canvas'),scale=Math.min(1,800/Math.max(image.width,image.height));c.width=Math.round(image.width*scale);c.height=Math.round(image.height*scale);c.getContext('2d').drawImage(image,0,0,c.width,c.height);photo=c.toDataURL('image/jpeg',.65);photoLoading=false};image.onerror=()=>{photoLoading=false;api.toast('写真が読み込めません')};image.src=r.result};r.onerror=()=>{photoLoading=false;api.toast('写真が読み込めません')};r.readAsDataURL(f)});
 h.addEventListener('submit',e=>{e.preventDefault();if(photoLoading)return api.toast('写真を読み込み中です');const f=new FormData(e.target),s=api.state(),cash=items.filter(x=>!x.voucherUid).reduce((n,x)=>n+x.funded,0);
  if(!items.every(x=>ready(s,x)))return api.toast('すでに使われた券、または未入金の項目があります');
  const ids=items.filter(x=>x.voucherUid).map(x=>x.voucherUid);
  if(new Set(ids).size!==ids.length)return api.toast('同じ券は二度使えません');
 if(s.dateLocked<cash)return api.toast('デート資金が不足しています');
  const snapshot={locked:s.dateLocked,memories:s.dateProfiles[cid].memories.length,ledger:s.ledger.length,events:s.events.length,
    vouchers:items.filter(x=>x.voucherUid).map(x=>{const v=s.vouchers.find(v=>v.uid===x.voucherUid);return {v,used:v.used,usedAt:v.usedAt}})};
  s.dateLocked-=cash;
  items.forEach(x=>{x.done=true;if(x.voucherUid){const v=s.vouchers.find(v=>v.uid===x.voucherUid);v.used=v.amount;v.usedAt=new Date().toISOString();}});

 s.dateProfiles[cid].memories.push({id:token(),date:f.get('date'),note:String(f.get('note')||''),image:photo,items:items.map(x=>({id:x.id,title:x.title,cost:x.cost,type:x.type}))});
 if(cash>0)api.logDate({id:token(),date:f.get('date'),type:'expense',source:'date',label:'デート資金',amount:cash,note:'デート：'+items.filter(x=>!x.voucherUid).map(x=>x.title).join('・')});
  for(const item of items.filter(x=>x.voucherUid))api.logDate({id:token(),date:f.get('date'),type:'expense',source:'ticket:'+item.voucherUid,label:'出費権利：'+item.title,amount:item.cost,note:'デートで利用'});
 try{
   api.save();selected.clear();h.remove();api.toast('デートの思い出を保存したよ ♡');
  }catch(err){
   s.dateLocked=snapshot.locked;
   items.forEach(x=>x.done=false);
   snapshot.vouchers.forEach(({v,used,usedAt})=>{v.used=used;if(usedAt===undefined)delete v.usedAt;else v.usedAt=usedAt});
   s.dateProfiles[cid].memories.length=snapshot.memories;
   s.ledger.splice(0,s.ledger.length-snapshot.ledger);
   s.events.splice(0,s.events.length-snapshot.events);
   api.toast('保存できません。写真を小さくするかバックアップを確保してください');
  }
 });
}
function bind(ctx){api=ctx;document.addEventListener('change',e=>{
 if(e.target.matches('[data-vdate-select]')){const id=e.target.dataset.vdateSelect;if(e.target.checked)selected.add(id);else selected.delete(id);api.render();}
 });
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const cid=api.current();if(!cid)return;
 if(b.hasAttribute('data-vdate-add'))create(cid);
 if(b.hasAttribute('data-vdate-ticket-add'))createFromTicket(cid);
 if(b.dataset.vdateRelease){
  const d=api.state().dateProfiles[cid],item=d.wishlist.find(x=>x.id===b.dataset.vdateRelease);
  if(!item||item.done||!item.voucherUid)return;
  if(!window.confirm('出費チケットの引用を解除し、未使用の状態に戻しますか？'))return;
  d.wishlist=d.wishlist.filter(x=>x.id!==item.id);selected.delete(item.id);api.save();api.toast('券の引用を解除しました');return;
 }
 if(b.hasAttribute('data-vdate-go')){if(!api.canDate(cid))return api.toast('炎が消えているためデート実行できません');const items=api.state().dateProfiles[cid].wishlist.filter(x=>selected.has(x.id)&&ready(api.state(),x));if(items.length)execute(cid,items)}
 });
 document.addEventListener('submit',e=>{const form=e.target;if(!form.matches('[data-vdate-fund]'))return;e.preventDefault();
 const s=api.state(),cid=api.current(),item=s.dateProfiles[cid].wishlist.find(x=>x.id===form.dataset.vdateFund),amount=Number(form.querySelector('input').value);
 if(!item||item.done||!Number.isSafeInteger(amount)||amount<1||amount>item.cost-item.funded||amount>available(s))return api.toast('入金額を確認してね');
 if(!window.confirm(item.title+'に'+money(amount)+'を確保しますか？'))return;item.funded+=amount;api.save();
 });
}
window.DateSystem={bind,migrate,render,allocated,available,tickets,ready};
})();