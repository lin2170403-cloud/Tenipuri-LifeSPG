(()=>{'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString('ja-JP')+'円';
const token=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const types={place:'📍場所',food:'🍰食べ物',gift:'🎁プレゼント',activity:'🎬観賞',other:'✨その他'};
let api,selected=new Set(),photo='';
function migrate(s,chars){if(!s.dateProfiles||typeof s.dateProfiles!=='object')s.dateProfiles={};for(const c of chars){const d=s.dateProfiles[c.id]||{};if(!Array.isArray(d.wishlist))d.wishlist=[];if(!Array.isArray(d.memories))d.memories=[];s.dateProfiles[c.id]=d;}}
function allocated(s){return Object.values(s.dateProfiles||{}).flatMap(x=>x.wishlist||[]).filter(x=>!x.done).reduce((n,x)=>n+(Number(x.funded)||0),0);}
const available=s=>Math.max(0,s.dateLocked-allocated(s));
function render(s,cid){
 migrate(s,api.chars);const d=s.dateProfiles[cid];
 return `<div class="vdate"><div class="vdate-summary"><b>💗 未配分 ${money(available(s))}</b><p>割り当てた資金はほかの項目に移せません。</p></div>
 <button type="button" data-vdate-add>＋ ウィッシュを追加</button>
 ${d.wishlist.map(x=>{
 const ok=!x.done&&x.funded===x.cost,remain=Math.max(0,x.cost-x.funded);
 return `<div class="vdate-row"><label><input type="checkbox" data-vdate-select="${x.id}" ${selected.has(x.id)?'checked':''} ${ok?'':'disabled'}></label>
 <div><b>${types[x.type]||types.other} ${E(x.title)}</b><small>${money(x.funded)} / ${money(x.cost)} ${x.done?'· 実行済み':ok?'· 入金完了':'· 残り'+money(remain)}</small>
 <p>${E(x.note)}</p>${!x.done&&remain>0?`<form data-vdate-fund="${x.id}"><input type="number" min="1" max="${Math.min(remain,available(s))}" inputmode="numeric" placeholder="金額" required><button ${available(s)<1?'disabled':''}>入金</button></form>`:''}</div></div>`;
 }).join('')||'<p>登録されたウィッシュはまだありません。</p>'}
 <button type="button" class="cp-primary" data-vdate-go ${selected.size?'':'disabled'}>💗 デートに行く（${selected.size}件）</button>
 <h3>思い出アルバム</h3>${d.memories.slice().reverse().map(m=>`<details class="vdate-memory"><summary>${E(m.date)} · ${m.items.length}件</summary>${m.image?`<img src="${m.image}" alt="思い出">`:''}<p>${E(m.note)}</p><small>${m.items.map(x=>E(x.title)).join('、')}</small></details>`).join('')||'<p>まだ思い出はありません。</p>'}</div>`;
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
function execute(cid,items){
 photo='';const h=popup(`<h3>💗 デートの思い出</h3><p>${items.map(x=>E(x.title)).join('、')}</p>
 <form id="vdate-execute"><label>日付<input name="date" type="date" required value="${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})}"></label>
 <label>ノート<textarea name="note" maxlength="2500"></textarea></label>
 <label>写真<input name="image" type="file" accept="image/*"></label>
 <button data-vdate-cancel type="button">キャンセル</button><button class="cp-primary">記録する</button></form>`);
 h.querySelector('[name=image]').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;if(f.size>10e6)return api.toast('10MB以下の画像を選んでね');
 const r=new FileReader();r.onload=()=>{const image=new Image();image.onload=()=>{const c=document.createElement('canvas'),s=Math.min(1,800/Math.max(image.width,image.height));c.width=Math.round(image.width*s);c.height=Math.round(image.height*s);c.getContext('2d').drawImage(image,0,0,c.width,c.height);photo=c.toDataURL('image/jpeg',.65)};image.src=r.result};r.readAsDataURL(f)});
 h.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),s=api.state(),cost=items.reduce((n,x)=>n+x.funded,0);
 if(s.dateLocked<cost)return api.toast('残高不足です');
 s.dateLocked-=cost;items.forEach(x=>x.done=true);
 s.dateProfiles[cid].memories.push({id:token(),date:f.get('date'),note:String(f.get('note')||''),image:photo,items:items.map(x=>({id:x.id,title:x.title,cost:x.cost,type:x.type}))});
 api.logDate({id:token(),date:f.get('date'),type:'expense',source:'date',label:'デート資金',amount:cost,note:'デート：'+items.map(x=>x.title).join('・')});
 selected.clear();h.remove();api.save();api.toast('デートの思い出を保存したよ ♡');
 });
}
function bind(ctx){api=ctx;document.addEventListener('change',e=>{
 if(e.target.matches('[data-vdate-select]')){const id=e.target.dataset.vdateSelect;if(e.target.checked)selected.add(id);else selected.delete(id);api.render();}
 });
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const cid=api.current();if(!cid)return;
 if(b.hasAttribute('data-vdate-add'))create(cid);
 if(b.hasAttribute('data-vdate-go')){const items=api.state().dateProfiles[cid].wishlist.filter(x=>selected.has(x.id)&&!x.done&&x.funded===x.cost);if(items.length)execute(cid,items)}
 });
 document.addEventListener('submit',e=>{const form=e.target;if(!form.matches('[data-vdate-fund]'))return;e.preventDefault();
 const s=api.state(),cid=api.current(),item=s.dateProfiles[cid].wishlist.find(x=>x.id===form.dataset.vdateFund),amount=Number(form.querySelector('input').value);
 if(!item||item.done||!Number.isSafeInteger(amount)||amount<1||amount>item.cost-item.funded||amount>available(s))return api.toast('入金額を確認してね');
 if(!window.confirm(item.title+'に'+money(amount)+'を確保しますか？'))return;item.funded+=amount;api.save();
 });
}
window.DateSystem={bind,migrate,render,allocated,available};
})();