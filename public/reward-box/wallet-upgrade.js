/* Wallet and point-history interface. No external services; data remains in app state. */
(()=>{'use strict';
let a=null,currentFund='',editingTx=null,view='earned',modal=null,ledgerEdit=null;
const $$=id=>document.getElementById(id);
const yen=n=>(Number(n)||0).toLocaleString('ja-JP')+'円';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const fundNames={unallocated:'未分類',entertainment:'エンタメ',fashion:'ファッション',life:'ライフ',gourmet:'グルメ',sweets:'スイーツ',date:'デート資金',savings:'北海道貯金',debt:'借金返済'};
const icons={unallocated:'🌕',entertainment:'🎬',fashion:'🎀',life:'🕯️',gourmet:'🍽️',sweets:'🍰',date:'💗',savings:'✈️',debt:'💸'};
const locked=new Set(['date','savings']);
const normal=Object.keys(fundNames).filter(k=>!locked.has(k)&&k!=='debt');
const balance=(s,key)=>key==='date'?s.dateLocked:key==='savings'?s.savings:key==='debt'?s.debt:s.funds[key];
const putBalance=(s,key,value)=>{
 if(!Number.isSafeInteger(value)||value<0)throw Error('残高を確認してください');
 if(key==='date')s.dateLocked=value;else if(key==='savings')s.savings=value;
 else if(key==='debt')s.debt=value;else s.funds[key]=value;
};
const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
function labelText(k){return icons[k]+' '+fundNames[k]}
function option(key,chosen=''){return '<option value="'+key+'" '+(key===chosen?'selected':'')+'>'+esc(labelText(key))+'</option>'}
function showModal(html){close();modal=document.createElement('div');modal.className='wallet-up-modal';
 modal.innerHTML='<div class="wallet-up-dialog" role="dialog" aria-modal="true"><button type="button" class="wallet-up-close" aria-label="閉じる" data-wallet-close>×</button>'+html+'</div>';
 document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-wallet-close]'))close()});
 modal.querySelector('input,select')?.focus({preventScroll:true});
}
function close(){modal?.remove();modal=null;editingTx=null;ledgerEdit=null;}
function creditAdd(s,to,amount,txid,when){
 if(normal.includes(to))s.fundCredits.push({key:to,amount,date:when,txid});
 if(to==='date')s.dateCredits.push({amount,date:when,txid});
}
function creditRemove(s,txid){
 s.fundCredits=s.fundCredits.filter(x=>x.txid!==txid);
 s.dateCredits=s.dateCredits.filter(x=>x.txid!==txid);
}
function applyTx(s,tx,reverse=false){
 const sign=reverse?-1:1,amt=tx.amount;
 if(tx.from==='outside'&&s.debt>0&&tx.to!=='debt'&&!reverse)throw Error('借金がある間は新規入金できません');
 if(normal.includes(tx.from)){
  if(!reverse&&balance(s,tx.from)-s.fundCredits.filter(x=>x.key===tx.from&&x.date>=a.today()).reduce((n,x)=>n+(x.amount||0),0)<amt)throw Error('移動元の使用可能残高が不足しています');
  putBalance(s,tx.from,balance(s,tx.from)-sign*amt);
 }
 if(tx.to==='debt'){
  if(!reverse&&s.debt<amt)throw Error('借金残高を超えて返済できません');
  putBalance(s,'debt',balance(s,'debt')-sign*amt);
 }else{
  if(reverse&&tx.to==='savings')throw Error('北海道貯金の返金はガチャ報酬と関連するため変更できません');
  putBalance(s,tx.to,balance(s,tx.to)+sign*amt);
 }
 if(reverse)creditRemove(s,tx.id);
 else creditAdd(s,tx.to,amt,tx.id,tx.date);
}
function fundModal(key,entry=null){
 if(!a)return;
 const s=a.state();currentFund=key;editingTx=entry;
 if(key==='debt'&&s.debt<=0&&!entry){a.toast('借金はありません');return}
 const source=entry?.from||'outside';
 const target=key;
 const title=entry?'資金記録を修正':labelText(key);
 const fromOptions=(key==='debt'?[...normal,'outside']:[...normal.filter(k=>k!==key),'outside']).map(k=>k==='outside'?'<option value="outside" '+(source==='outside'?'selected':'')+'>🌱 外部から入金</option>':option(k,source)).join('');
 showModal('<h3>'+esc(title)+'</h3><p class="wallet-up-sub">借金がある場合、新規入金はできません。既存ファンド間の振替は可能です。</p><form id="wallet-up-form"><label>移動元<select name="from" required>'+fromOptions+'</select></label><label>移動先<input readonly value="'+esc(labelText(key))+'"></label><label>金額（円）<input name="amount" type="number" inputmode="numeric" min="1" step="1" required value="'+(entry?.amount||'')+'"></label><label>備考<textarea name="note" rows="2" maxlength="250">'+esc(entry?.note||'')+'</textarea></label><button class="wallet-up-submit" type="submit">'+(entry?'記録を更新':'確定する')+'</button></form>');
 const form=modal.querySelector('#wallet-up-form');
 function update(){
  const from=form.elements.from,button=form.querySelector('[type=submit]');
  const forbidden=s.debt>0&&from.value==='outside'&&key!=='debt';
  button.disabled=forbidden;button.textContent=forbidden?'借金返済後に入金可能':(entry?'記録を更新':'確定する');
 }
 form.elements.from.addEventListener('change',update);update();
 form.addEventListener('submit',e=>{
  e.preventDefault();
  const from=form.elements.from.value,amt=Number(form.elements.amount.value),note=form.elements.note.value.trim();
  if(!Number.isSafeInteger(amt)||amt<1)return a.toast('金額を入力してください');
  if(!normal.includes(from)&&from!=='outside'||from===key)return a.toast('移動元を確認してください');
  // A saved transfer is undone on a working clone before the revised one is applied.
  const copy={...s,funds:{...s.funds},fundCredits:[...s.fundCredits],dateCredits:[...s.dateCredits]};
  try{
   if(entry&&entry.amount===amt&&entry.from===from){
    entry.note=note;
    a.log('fund','資金記録の備考を訂正',note);a.persist();close();a.render();a.toast('記録を更新しました');return;
   }
   if(entry){
    if(entry.to==='savings'&&(entry.amount!==amt||entry.from!==from))throw Error('ガチャ報酬を保護するため北海道貯金の金額・移動元は変更できません');
    applyTx(copy,entry,true);
   }
   const next={id:entry?.id||uid(),date:entry?.date||a.today(),from,to:key,amount:amt,note,at:entry?.at||new Date().toISOString()};
   applyTx(copy,next,false);
   s.funds=copy.funds;s.dateLocked=copy.dateLocked;s.savings=copy.savings;s.debt=copy.debt;
   s.fundCredits=copy.fundCredits;s.dateCredits=copy.dateCredits;
   if(entry){Object.assign(entry,next)}else s.walletTransactions.unshift(next);
   if(key==='savings')window.HokkaidoGacha.credit(s);
   a.log('fund',entry?'資金記録を修正':'ファンド資金移動',labelText(from==='outside'?'unallocated':from)+' → '+labelText(key)+' '+yen(amt)+(note?'｜'+note:''));
   a.persist();close();a.render();a.toast('資金記録を保存しました');
  }catch(err){a.toast(err.message||'記録できませんでした')}
 });
}
function editTx(entry){fundModal(entry.to,entry)}
function editLedger(i){
 const s=a.state(),x=s.ledger[i];if(!x)return;
 ledgerEdit=i;
 showModal('<h3>帳簿の記録を修正</h3><form id="wallet-ledger-edit"><label>日付<input type="date" name="date" required value="'+esc(x.date)+'"></label><label>金額（円）<input type="number" name="amount" min="1" step="1" required value="'+x.amount+'"></label><label>備考<textarea rows="2" name="note">'+esc(x.note||'')+'</textarea></label><p class="wallet-up-sub">支出元は元の記録を維持します。残高を超える修正はできません。</p><button class="wallet-up-submit">変更を保存</button></form>');
 modal.querySelector('form').addEventListener('submit',e=>{
  e.preventDefault();
  const val=Number(e.target.elements.amount.value),date=e.target.elements.date.value,note=e.target.elements.note.value.trim();
  if(!Number.isSafeInteger(val)||val<1||!/^\d{4}-\d{2}-\d{2}$/.test(date))return a.toast('日付・金額を確認してください');
  const prev=x.amount,diff=val-prev,origin=x.source||'',beforeDebt=s.debt;
  if(origin==='living'){
   const current=s.ledger.filter(z=>z.source==='living'&&z.type==='expense'&&z.date===x.date).reduce((n,z)=>n+z.amount,0);
   const revised=s.ledger.filter(z=>z!==x&&z.source==='living'&&z.type==='expense'&&z.date===date).reduce((n,z)=>n+z.amount,0)+val;
   const oldExcess=Math.max(0,current-3000),newExcess=Math.max(0,revised-3000);
   const targetDateChange=date===x.date?newExcess-oldExcess:newExcess-Math.max(0,revised-val-3000)-oldExcess+Math.max(0,current-prev-3000);
   if(s.debt+targetDateChange<0)return a.toast('返済済み借金との整合が取れません');s.debt+=targetDateChange;
   x.debtAdded=Math.max(0,newExcess-Math.max(0,revised-val-3000));
  }else if(origin.startsWith('fund:')){
   const key=origin.slice(5);
   if(diff>0&&a.availableFund(key)<diff)return a.toast('ファンド残高が不足しています');
   if(s.funds[key]-diff<0)return a.toast('残高が不足しています');
   s.funds[key]-=diff;
  }else if(origin==='date'){
   if(diff>0&&a.availableDate()<diff)return a.toast('デート資金が不足しています');
   if(s.dateLocked-diff<0)return a.toast('残高が不足しています');s.dateLocked-=diff;
  }else if(origin.startsWith('ticket:')&&val!==prev)return a.toast('ガチャチケットの使用額は残高保護のため変更できません');
  x.amount=val;x.date=date;x.note=note;
  try{a.persist();close();a.render();a.toast('帳簿を修正しました')}catch(err){
   x.amount=prev;s.debt=beforeDebt;a.toast('保存できませんでした')
  }
 });
}
function render(){
 if(!a)return;const s=a.state(),grid=$$('fund-grid');
 if(grid){
  grid.innerHTML=Object.keys(fundNames).map(key=>{
   const bal=balance(s,key),danger=key==='debt'&&bal>0;
   const hint=key==='debt'?(bal>0?'返済する':'借金なし'):normal.includes(key)?'使用可能 '+yen(a.availableFund(key)):key==='date'?'入金専用': '目標 150,000円';
   return '<button type="button" class="fund wallet-fund '+(danger?'wallet-debt-alert':'')+'" data-wallet-fund="'+key+'"><div class="emoji">'+icons[key]+'</div><strong>'+fundNames[key]+(locked.has(key)?' 🔒':'')+'</strong><span class="yen">'+yen(bal)+'</span><div class="tiny dim">'+hint+'</div></button>';
  }).join('');
 }
 const history=$$('fund-operation-history');
 if(history){
  history.innerHTML=s.walletTransactions.length?s.walletTransactions.slice(0,150).map(t=>'<div class="wallet-history-row"><div><strong>'+esc(labelText(t.from==='outside'?'unallocated':t.from))+' → '+esc(labelText(t.to))+'</strong><small>'+esc(t.date)+' · '+esc(t.note||'備考なし')+'</small></div><b>'+yen(t.amount)+'</b><button type="button" data-wallet-edit="'+esc(t.id)+'">編集</button></div>').join(''):'<p class="minor">まだ振替・入金の記録がありません。</p>';
 }
 const list=$$('ledger-list');
 if(list){
  list.innerHTML=s.ledger.length?s.ledger.slice(0,150).map((x,i)=>'<div class="ledger-entry wallet-ledger-entry"><div><b>'+esc(x.note||x.label||'記録')+'</b><small>'+esc(x.date)+' · '+esc(x.label||'帳簿')+'</small></div><div class="sum '+(x.type==='income'?'income':'')+'">'+(x.type==='income'?'+':'−')+yen(x.amount)+'</div><button type="button" data-wallet-ledger="'+i+'">編集</button></div>').join(''):'<p class="minor">まだ記録がありません。</p>';
 }
 renderPoints();
}
function editTraining(date){
 const s=a.state(),record=s.trainingDaily[date]||{};
 const keys=['physical','mental','technical','wisdom','ingenuity','coins'];
 showModal('<h3>取得ポイントを修正｜'+esc(date)+'</h3><p class="wallet-up-sub">消費済みのポイントは戻りません。未使用残高を下回る減額は受け付けません。</p><form id="wallet-training-edit">'+keys.map(k=>'<label>'+esc(k)+'<input name="'+k+'" type="number" min="0" step="1" value="'+(Number(record[k])||0)+'" required></label>').join('')+'<label>備考<textarea name="note" rows="2">'+esc(record.note||'')+'</textarea></label><button class="wallet-up-submit">記録を更新</button></form>');
 modal.querySelector('form').addEventListener('submit',e=>{
  e.preventDefault();const newRecord={},delta={};
  for(const k of keys){
   const n=Number(e.target.elements[k].value),old=Number(record[k])||0;
   if(!Number.isSafeInteger(n)||n<0||(['physical','mental','technical'].includes(k)&&n>25))return a.toast('一日あたりの上限と数字を確認してください');
   delta[k]=n-old;
   if(s.resources[k]+delta[k]<0)return a.toast('使用済みの'+k+'ポイントは再利用・取り消しできません');
   newRecord[k]=n;
  }
  newRecord.note=e.target.elements.note.value.trim();
  const oldRow=s.trainingDaily[date];const oldBalance={...s.resources};
  for(const k of keys)s.resources[k]+=delta[k];
  s.trainingDaily[date]=newRecord;
  a.log('training','取得記録を訂正 '+date,'ポイント差分 '+Object.entries(delta).map(([k,n])=>k+':'+n).join(' / '));
  try{a.persist();close();a.render();a.toast('ポイント取得記録を修正しました')}
  catch(error){s.trainingDaily[date]=oldRow;Object.assign(s.resources,oldBalance);a.toast('保存できませんでした')}
 });
}
function editAudit(id){
 const entry=a.state().pointHistory.find(p=>p.id===id);if(!entry)return;
 showModal('<h3>履歴のメモを修正</h3><p class="wallet-up-sub">消費したポイント量はキャラ育成・スキルと連動するため、履歴から直接増減できません。</p><form id="point-audit-edit"><label>説明<textarea name="title" rows="3" maxlength="160">'+esc(entry.title||'')+'</textarea></label><button class="wallet-up-submit">説明を保存</button></form>');
 modal.querySelector('form').addEventListener('submit',e=>{
  e.preventDefault();entry.title=e.target.elements.title.value.trim();
  a.persist();close();a.render();a.toast('説明を修正しました');
 });
}
function renderPoints(){
 const s=a.state(),root=$$('point-history-list');if(!root)return;
 const events=Array.isArray(s.pointHistory)?s.pointHistory:[];
 const rows=events.filter(item=>view==='earned'?['earned','adjustment'].includes(item.kind):item.kind==='spent').slice(0,150);
 const daily=view==='earned'?Object.entries(s.trainingDaily).sort((x,y)=>y[0].localeCompare(x[0])).slice(0,60).map(([date,item])=>
 '<div class="wallet-history-row"><div><strong>取得記録｜'+esc(date)+'</strong><small>基礎 '+(['physical','mental','technical'].reduce((n,k)=>n+(Number(item[k])||0),0))+' / 悟性 '+(item.wisdom||0)+' / 工夫 '+(item.ingenuity||0)+' / 🐱 '+(item.coins||0)+'</small></div><button type="button" data-point-training="'+esc(date)+'">編集</button></div>').join(''):'';
 const journal=rows.map(item=>'<div class="wallet-history-row"><div><strong>'+esc(item.title||'ポイント変動')+'</strong><small>'+esc(item.at||'')+'</small></div><b>'+Object.entries(item.delta||{}).map(([k,n])=>esc(k)+' '+(n>0?'+':'')+n).join(' · ')+'</b><button type="button" data-point-audit="'+esc(item.id)+'">編集</button></div>').join('');
 root.innerHTML=daily+journal||'<p class="minor">この記録方式の導入後は、'+(view==='earned'?'取得':'使用')+'履歴がここに表示されます。過去分は下の従来履歴で確認できます。</p>';
 const legacy=$$('point-old-history');
 if(legacy)legacy.innerHTML=s.events.filter(e=>view==='earned'?['training','daily','gacha'].includes(e.kind):['allocation','skill','gift','gacha'].includes(e.kind)).slice(0,80).map(e=>'<div class="wallet-history-row"><div><strong>'+esc(e.title||e.kind)+'</strong><small>'+esc(e.note||'')+' · '+esc(e.at||'')+'</small></div></div>').join('')||'';
 document.querySelectorAll('[data-point-view]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.pointView===view);btn.setAttribute('aria-pressed',String(btn.dataset.pointView===view))});
}
function bind(context){
 a=context;const grid=$$('fund-grid');
 grid?.addEventListener('click',e=>{const button=e.target.closest('[data-wallet-fund]');if(button)fundModal(button.dataset.walletFund)});
 $$('fund-operation-history')?.addEventListener('click',e=>{const b=e.target.closest('[data-wallet-edit]');if(!b)return;const tx=a.state().walletTransactions.find(x=>x.id===b.dataset.walletEdit);if(tx)editTx(tx)});
 $$('ledger-list')?.addEventListener('click',e=>{const b=e.target.closest('[data-wallet-ledger]');if(b)editLedger(Number(b.dataset.walletLedger))});
 document.querySelectorAll('[data-point-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.pointView;renderPoints()}));
 $('point-history-list')?.addEventListener('click',e=>{
  const training=e.target.closest('[data-point-training]'),audit=e.target.closest('[data-point-audit]');
  if(training)editTraining(training.dataset.pointTraining);else if(audit)editAudit(audit.dataset.pointAudit);
 });
 render();
}
window.WalletUpgrade={bind,render,renderPoints};
})();