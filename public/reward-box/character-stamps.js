(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const day=(d=new Date())=>{if(window.AppSettings)return window.AppSettings.dayKey(d,api?.getState()?.appSettings);const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;};
const shift=(date,n)=>{const d=new Date(date+'T12:00:00+09:00');d.setUTCDate(d.getUTCDate()+n);return day(d);};
const id=()=>`book_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
let api,chosen=null,edit=null,draft=null,month=day().slice(0,7),selectedDay=day(),feedback='';
const img=(value,cl='')=>window.AppPhotos?.renderImage(value,cl)||'';
const bg=value=>window.AppPhotos?.bgAttrs(value)||'';
const conf=(s,c)=>s.charStamps[c],book=(s,c)=>conf(s,c)?.books.find(b=>b.id===conf(s,c).active)||null;
function migrate(s,characters) {
 if(!s.charStamps||typeof s.charStamps!=='object')s.charStamps={};
 for(const c of characters) {
  const x=s.charStamps[c.id]||{avatar:'',books:[],active:null};
  if(typeof x.avatar!=='string')x.avatar='';
  if(!Array.isArray(x.books))x.books=[];
  x.books=x.books.filter(b=>b&&typeof b.id==='string').map(b=>({...b,name:String(b.name||'無題'),note:String(b.note||''),
   header:String(b.header||''),stamp:String(b.stamp||''),
   days:b.days&&typeof b.days==='object'?b.days:{},
   messages:Array.isArray(b.messages)?b.messages.map(m=>({text:String(m.text||''),chance:Number(m.chance)||0})) :[]}));
  if(!x.books.some(b=>b.id===x.active))x.active=x.books[0]?.id||null;
  s.charStamps[c.id]=x;
 }
 if(!s.itemStock||typeof s.itemStock!=='object')s.itemStock={};
 if(!Number.isSafeInteger(s.protectionDays)||s.protectionDays<0)s.protectionDays=0;
}
function stamps(s,c) {const dates={};for(const b of conf(s,c).books)for(const d of Object.keys(b.days||{}))dates[d]=true;return dates;}
function ticketLedger(s){if(!s.stampTickets||typeof s.stampTickets!=='object')s.stampTickets={};return s.stampTickets;}
function cycles(b){const dates=Object.keys(b.days||{}).filter(k=>b.days[k]&&!b.days[k].protected).sort();let run=0,last='',rewards=[];for(const d of dates){run=last&&d===shift(last,1)?run+1:1;last=d;if(run===7){rewards.push(d);run=0;last='';}}return rewards;}
function reconcileTickets(s,c){const ledger=ticketLedger(s);if(!ledger[c])ledger[c]={earned:{},spent:0};const entry=ledger[c],all=new Set();for(const b of conf(s,c).books)for(const end of cycles(b))all.add(b.id+':'+end);entry.earned=Object.fromEntries([...all].map(x=>[x,true]));return Math.max(0,all.size-entry.spent);}
function flames(s,c) {
 const dates=stamps(s,c),t=day(),anchor=dates[t]?t:shift(t,-1);
 let value=0;for(let i=0;i<3;i++){if(dates[shift(anchor,-i)])value++;else break;}
 return value;
}
function flameHTML(s,c) {
 const n=flames(s,c);
 return `<div class="cp-flame"><b>連続打刻</b><span>${[0,1,2].map(i=>`<button type="button" data-cp-fire="${c}" data-cp-slot="${i}" class="${i<n?'on':'off'}" title="火の保護チケットを使用">${i<n?'🔥':'♨'}</button>`).join('')}</span><small>${n}/3 ${n?'':'デート不可'}</small></div>`;
}
function calendar(s,c) {
 const b=book(s,c),t=day();
 if(!b)return `<div class="cp-notice">有効なスタンプ帳がありません。設定から追加してください。</div><button class="cp-action" data-cp-settings="${c}">設定へ</button>`;
 const [y,m]=month.split('-').map(Number),first=new Date(Date.UTC(y,m-1,1)).getUTCDay(),count=new Date(Date.UTC(y,m,0)).getUTCDate();
 return `<section class="cp-calendar"><div class="cp-header" ${bg(b.header)}><h2>${esc(b.name)}</h2><p>${esc(b.note)}</p></div>
  <div class="cp-month"><button data-cp-month="-1">‹</button><b>${y}年 ${m}月</b><button data-cp-month="1">›</button></div>
  <div class="cp-week">${['SUN','MON','TUE','WED','THU','FRI','SAT'].map(x=>`<b>${x}</b>`).join('')}</div>
  <div class="cp-days">${Array(first).fill('<div></div>').join('')}${Array.from({length:count},(_,i)=>{
   const date=month+'-'+pad(i+1),marked=!!b.days[date];
   return `<button type="button" data-cp-date="${date}" class="cp-day ${date===t?'today':''} ${date===selectedDay?'selected':''}"><small>${i+1}</small>${marked?`<span class="cp-mark">${b.stamp?img(b.stamp,'cp-stamp-img'):'✓'}</span>`:''}</button>`;
  }).join('')}</div>
  <button data-cp-stamp type="button" class="cp-big-stamp">${b.days[selectedDay]?'打刻記録を取り消す':'選択日 '+selectedDay+' にハンコを押す'}</button><p class="cp-help">7日連続でこのキャラ専用の一回休み券 · 所持 ${reconcileTickets(s,c)}枚</p>
  <p class="cp-feedback">${esc(feedback||'今日の頑張りを残そう。')}</p>
  <button class="cp-action" data-cp-settings="${c}">⚙️ スタンプ帳を編集</button></section>`;
}
function stamp(s,c) {
 const b=book(s,c),d=selectedDay;if(!b)return api.toast('スタンプ帳を作成してください');
 if(d>day())return api.toast('未来の日付は打刻できません');
 if(b.days[d]){if(!window.confirm('打刻記録をキャンセルしますか？'))return;delete b.days[d];feedback='打刻を取り消しました';}
 else {b.days[d]={time:new Date().toISOString()};const r=Math.random()*100;let sum=0;feedback='今日もよく頑張ったね ♡';for(const m of b.messages){sum+=m.chance;if(r<sum){feedback=m.text;break;}}}
 const n=reconcileTickets(s,c);api.log('stamp',api.chars.find(x=>x.id===c).name+'｜'+b.name,d+' · 休み券 '+n+'枚');api.save();api.toast(feedback);
}
function protect(s,c,slot=null) {
 const b=book(s,c);if(!b)return api.toast('スタンプ帳を作成してください');
 const n=flames(s,c);if(n>=3||(slot!==null&&Number(slot)<n))return api.toast('その炎は灯っています');
 const d=day(),all=stamps(s,c),anchor=all[d]?d:shift(d,-1),target=shift(anchor,-n);
 const dedicated=reconcileTickets(s,c)>0;
 const global=(s.pending||[]).findIndex(p=>p.kind==='ticket'&&String(p.detail||'').includes('チェックイン救済'));
 if(!dedicated&&!Number(s.protectionDays||0)&&global<0)return api.toast('使える一回休み券・炎保護券がありません');
 const kind=dedicated?'キャラ専用の一回休み券':'ガチャの炎保護券';
 if(!window.confirm(target+' の炎を '+kind+' で守りますか？'))return;
 if(dedicated)ticketLedger(s)[c].spent++;
 else {
  if(!s.protectionDays){s.pending.splice(global,1);s.protectionDays=3;}
  s.protectionDays--;
 }
 b.days[target]={protected:true,time:new Date().toISOString()};
 api.log('stamp',kind+'を使用',c+' '+target);api.save();api.toast('炎を守りました 🔥');
}
function renderSettings(s){
 const root=document.getElementById('cp-settings');if(!root)return;
 if(!chosen){root.innerHTML=`<h3>12人のキャラとスタンプ帳</h3><p class="cp-help">写真とスタンプ帳を設定。1人につき複数冊登録でき、同時に使えるのは1冊だけ。</p>
 <div class="cp-set-grid">${api.chars.map(c=>`<button data-cp-person="${c.id}"><div>${img(conf(s,c.id).avatar)||esc(c.name)}</div><small>${esc(c.name)}</small><em>${conf(s,c.id).books.length}冊</em></button>`).join('')}</div>`;return;}
 const c=api.chars.find(x=>x.id===chosen),x=conf(s,chosen);
 root.innerHTML=`<button data-cp-go-back class="cp-back">‹ 12人の設定へ</button><div class="cp-avatar-editor">
 <div class="cp-avatar-circle">${img(x.avatar)||esc(c.name)}</div><div><h3>${esc(c.name)}</h3><label class="cp-file-picker cp-action">📷 写真をアップロード<input type="file" data-cp-file="avatar" accept="image/*,.heic,.heif"></label></div></div>
 <div class="cp-between"><h3>打刻帳 ${x.books.length}冊</h3><button data-cp-add class="cp-action">＋ 新規作成</button></div>
 ${x.books.map(b=>`<div class="cp-book-row"><div><b>${esc(b.name)}</b><small>${x.active===b.id?'● 使用中':'○ 停止中'} · ${Object.keys(b.days).length}日</small></div>
 <button data-cp-activate="${b.id}" ${x.active===b.id?'disabled':''}>使用</button><button data-cp-edit="${b.id}">編集</button><button data-cp-delete="${b.id}">削除</button></div>`).join('')||'<p class="cp-notice">まだ打刻帳がありません。</p>'}
 ${edit!==null?`<form id="cp-editor"><h3>${edit==='new'?'新しい打刻帳':'打刻帳を編集'}</h3>
 <label>目標（必須）<input name="name" maxlength="80" required value="${esc(draft.name)}" placeholder="早起き"></label>
 <label>備考<textarea name="note" rows="2" maxlength="300">${esc(draft.note)}</textarea></label>
 <div class="cp-uploads"><div><b>Header 画像</b><div class="cp-preview-header" ${bg(draft.header)}></div><label class="cp-file-picker">画像選択<input type="file" data-cp-file="header" accept="image/*,.heic,.heif"></label></div>
 <div><b>Stamp（円形に切抜き）</b><div class="cp-preview-stamp">${img(draft.stamp,'cp-stamp-img')||'◯'}</div><label class="cp-file-picker">画像選択<input type="file" data-cp-file="stamp" accept="image/*,.heic,.heif"></label></div></div>
 <div class="cp-between"><b>押印時のセリフと出現確率</b><button data-cp-addmsg type="button">＋ 追加</button></div>
 <p class="cp-help">合計100%以下。余りは通常の応援セリフになります。</p>
 ${draft.messages.map((m,i)=>`<div class="cp-msg"><textarea data-cp-msg="${i}" rows="2">${esc(m.text)}</textarea><label><input type="number" data-cp-prob="${i}" min="0" max="100" step="1" value="${m.chance}">%</label><button data-cp-delmsg="${i}" type="button">×</button></div>`).join('')}
 <p class="cp-help">現在の合計 ${draft.messages.reduce((n,m)=>n+m.chance,0)}%</p>
 <div class="cp-controls"><button class="cp-primary" type="submit">保存</button><button data-cp-cancel type="button">取消</button></div></form>`:''}`;
}
function beginEdit(s,key){
 const b=key==='new'?{name:'',note:'',header:'',stamp:'',messages:[{text:'今日もよく頑張ったね。',chance:100}]}:conf(s,chosen).books.find(b=>b.id===key);
 if(!b)return;edit=key;draft={name:b.name,note:b.note,header:b.header,stamp:b.stamp,messages:b.messages.map(m=>({...m}))};renderSettings(s);
}
function saveEdit(s,form){
 const x=conf(s,chosen),messages=draft.messages.filter(m=>m.text.trim()&&m.chance>0);
 if(messages.some(m=>!Number.isInteger(m.chance)||m.chance>100)||messages.reduce((n,m)=>n+m.chance,0)>100)return api.toast('確率の合計は100%以下にしてください');
 const data={name:form.elements.name.value.trim(),note:form.elements.note.value.trim(),header:draft.header,stamp:draft.stamp,messages};
 if(!data.name)return api.toast('目標を入力してね');
 if(edit==='new'){const b={...data,id:id(),days:{}};x.books.push(b);if(!x.active)x.active=b.id;}
 else Object.assign(x.books.find(b=>b.id===edit),data);
 edit=null;api.save();api.toast('打刻帳を保存しました');
}
/* Interactive cropper: drag image under the visible mask, pinch to zoom.
   The exported crop matches the on-screen fixed crop frame. */
function crop(kind,imgObj,releaseSource){
 const subject=chosen;
 const isHeader=kind==='header',isStamp=kind==='stamp';
 const title=isHeader?'ヘッダー':isStamp?'スタンプ':'キャラのアイコン';
 const host=document.createElement('div');host.className='cp-crop-overlay cp-crop-v2';
 host.innerHTML='<div class="cp-crop-modal cp-crop-dialog" role="dialog" aria-modal="true" aria-label="画像を切り抜く">'
  +'<h3>'+title+'の切り抜き</h3>'
  +'<p class="cp-crop-help">写真を指で動かして位置を調整。2本指で拡大・縮小できます。</p>'
  +'<div class="cp-crop-stage" aria-label="ドラッグして画像の位置を調整">'
  +'<img class="cp-crop-photo" alt="切り抜く写真" draggable="false">'
  +'<div class="cp-crop-frame'+(isStamp?' is-round':'')+'" aria-hidden="true"></div></div>'
  +'<div class="cp-crop-actions"><button type="button" data-cp-zoom-out aria-label="縮小">−</button><span>拡大・縮小</span><button type="button" data-cp-zoom-in aria-label="拡大">＋</button></div>'
  +'<div class="cp-controls"><button type="button" data-cp-crop-cancel>キャンセル</button>'
  +'<button type="button" data-cp-crop-save class="cp-primary">この範囲を保存</button></div></div>';
 document.body.appendChild(host);
 const stage=host.querySelector('.cp-crop-stage'),photo=host.querySelector('.cp-crop-photo'),frame=host.querySelector('.cp-crop-frame');
 const saveButton=host.querySelector('[data-cp-crop-save]');
 let released=false,finished=false;
 const cleanup=()=>{if(finished)return;finished=true;host.remove();if(!released){released=true;try{releaseSource?.()}catch(_){}}};
 const stageW=stage.getBoundingClientRect().width||Math.min(window.innerWidth-48,340);
 const cropW=stageW*(isHeader?.92:.82);
 const cropH=isHeader?cropW*270/640:cropW;
 frame.style.width=cropW+'px';frame.style.height=cropH+'px';
 const imgW=imgObj.naturalWidth||imgObj.width,imgH=imgObj.naturalHeight||imgObj.height;
 if(!imgW||!imgH){cleanup();api.toast('画像を読み込めませんでした');return;}
 const fit=Math.max(cropW/imgW,cropH/imgH);
 const baseW=imgW*fit,baseH=imgH*fit;
 photo.style.width=baseW+'px';photo.style.height=baseH+'px';
 photo.src=imgObj.src;
 const pointers=new Map();
 let zoom=1,ox=0,oy=0,pinch=null;
 const between=(n,min,max)=>Math.min(max,Math.max(min,n));
 function draw(){
  const maxX=Math.max(0,(baseW*zoom-cropW)/2);
  const maxY=Math.max(0,(baseH*zoom-cropH)/2);
  ox=between(ox,-maxX,maxX);oy=between(oy,-maxY,maxY);
  photo.style.transform='translate(-50%, -50%) translate('+ox+'px,'+oy+'px) scale('+zoom+')';
 }
 function pointDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
 function midPoint(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
 function capturePinch(){
  if(pointers.size<2){pinch=null;return;}
  const pair=[...pointers.values()].slice(0,2);
  pinch={distance:Math.max(1,pointDistance(pair[0],pair[1])),zoom,ox,oy,mid:midPoint(pair[0],pair[1])};
 }
 stage.addEventListener('pointerdown',e=>{
  if(finished)return;e.preventDefault();
  try{stage.setPointerCapture(e.pointerId)}catch(_){}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size>=2)capturePinch();
 });
 stage.addEventListener('pointermove',e=>{
  if(finished||!pointers.has(e.pointerId))return;
  e.preventDefault();
  const previous=pointers.get(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size>=2){
   if(!pinch)capturePinch();
   const pts=[...pointers.values()].slice(0,2),mid=midPoint(pts[0],pts[1]);
   zoom=between(pinch.zoom*pointDistance(pts[0],pts[1])/pinch.distance,1,5);
   ox=pinch.ox+mid.x-pinch.mid.x;oy=pinch.oy+mid.y-pinch.mid.y;
  }else{
   ox+=e.clientX-previous.x;oy+=e.clientY-previous.y;
  }
  draw();
 });
 const releasePointer=e=>{pointers.delete(e.pointerId);capturePinch()};
 stage.addEventListener('pointerup',releasePointer);
 stage.addEventListener('pointercancel',releasePointer);
 stage.addEventListener('lostpointercapture',releasePointer);
 const zoomBy=multiple=>{zoom=between(zoom*multiple,1,5);draw()};
 host.querySelector('[data-cp-zoom-in]').onclick=()=>zoomBy(1.2);
 host.querySelector('[data-cp-zoom-out]').onclick=()=>zoomBy(1/1.2);
 host.querySelector('[data-cp-crop-cancel]').onclick=cleanup;
 stage.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY<0?1.07:1/1.07)},{passive:false});
 saveButton.onclick=async()=>{
  if(finished)return;
  saveButton.disabled=true;saveButton.textContent='保存中…';
  let previous,changed=false;
  try{
   const canvas=document.createElement('canvas');
   canvas.width=isHeader?640:360;canvas.height=isHeader?270:360;
   const context=canvas.getContext('2d');
   if(!context)throw Error('画像を描画できません');
   const ratioX=canvas.width/cropW,ratioY=canvas.height/cropH;
   const renderedW=baseW*zoom*ratioX,renderedH=baseH*zoom*ratioY;
   if(isStamp){
    context.beginPath();context.arc(canvas.width/2,canvas.height/2,canvas.width/2,0,Math.PI*2);context.clip();
   }
   context.drawImage(imgObj,(canvas.width-renderedW)/2+ox*ratioX,(canvas.height-renderedH)/2+oy*ratioY,renderedW,renderedH);
   const encoded=canvas.toDataURL(isStamp?'image/png':'image/jpeg',isStamp?undefined:.77);
   if(!encoded.startsWith('data:image/'))throw Error('画像変換に失敗しました');
   const value=await window.AppPhotos.put(encoded);
   const confirmed=await window.AppPhotos.get(value);
   if(confirmed!==encoded)throw Error('写真が正しく保存されたか確認できません');
   if(kind==='avatar'){
    const person=conf(api.getState(),subject);
    if(!person)throw Error('キャラを選び直してください');
    previous=person.avatar;person.avatar=value;changed=true;
    try{api.save()}catch(error){
     let saved=false;
     try{const stored=JSON.parse(localStorage.getItem('hime-reward-v2'));saved=stored?.charStamps?.[subject]?.avatar===value}catch(_){}
     if(!saved){person.avatar=previous;changed=false;throw error}
     console.warn('保存後の画面再描画に失敗',error);
    }
    cleanup();
    try{renderSettings(api.getState());window.AppPhotos.hydrate(document.getElementById('cp-settings'))}catch(error){console.warn('画像の画面更新に失敗',error)}
    api.toast('キャラのアイコンを保存しました');
   }else{
    if(!draft)throw Error('スタンプ帳の編集画面を開き直してください');
    draft[kind]=value;
    cleanup();renderSettings(api.getState());
    api.toast('切り抜き完了。最後にスタンプ帳の「保存」を押してください');
   }
  }catch(error){
   if(changed){const person=conf(api.getState(),subject);if(person)person.avatar=previous}
   console.error('写真の切り抜き／保存に失敗:',error);
   api.toast('保存できませんでした：'+(error?.message||'画像の保存を確認してください'));
   saveButton.disabled=false;saveButton.textContent='この範囲を保存';
  }
 };
 draw();
}
function fileChosen(kind,file){
 if(!file)return;
 if(!file.type.startsWith('image/')&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name||''))return api.toast('画像ファイルを選んでください');
 if(file.size>20*1024*1024)return api.toast('20MB以下の画像を選んでください');
 let url;try{url=URL.createObjectURL(file)}catch(e){api.toast('写真を開けませんでした');return}
 const imgObj=new Image();
 let loaded=false;
 const revoke=()=>{if(url){URL.revokeObjectURL(url);url=null}};
 imgObj.onload=()=>{
  if(loaded)return;loaded=true;
  try{crop(kind,imgObj,revoke)}catch(error){console.error('画像編集を開けません',error);revoke();api.toast('画像を編集できませんでした');}
 };
 imgObj.onerror=()=>{if(loaded)return;loaded=true;revoke();api.toast('画像を読み込めません。JPEG・PNGで試してください');};
 imgObj.src=url;
}
function bind(context) {
 api=context;migrate(api.getState(),api.chars);
 const root=document.getElementById('cp-settings');
 root.addEventListener('change',ev=>{
  const input=ev.target.closest('input[data-cp-file]');
  if(!input)return;
  const kind=input.dataset.cpFile,chosenFile=input.files?.[0];input.value='';
  if(chosenFile)fileChosen(kind,chosenFile);
 });
 root.addEventListener('input',ev=>{
 const t=ev.target;if(t.name==='name'&&draft)draft.name=t.value;
 if(t.name==='note'&&draft)draft.note=t.value;
 if(t.dataset.cpMsg!==undefined)draft.messages[Number(t.dataset.cpMsg)].text=t.value;
 if(t.dataset.cpProb!==undefined)draft.messages[Number(t.dataset.cpProb)].chance=Number(t.value);
 });
 root.addEventListener('submit',ev=>{if(ev.target.id!=='cp-editor')return;ev.preventDefault();saveEdit(api.getState(),ev.target);});
 root.addEventListener('click',ev=>{
 const b=ev.target.closest('button');if(!b)return;const s=api.getState();
 if(b.dataset.cpPerson){chosen=b.dataset.cpPerson;edit=null;renderSettings(s);return;}
 if(b.hasAttribute('data-cp-go-back')){chosen=null;edit=null;renderSettings(s);return;}
 if(b.hasAttribute('data-cp-add')){if(conf(s,chosen).books.length>=100)return api.toast('一人100冊まで');beginEdit(s,'new');return;}
 if(b.dataset.cpEdit){beginEdit(s,b.dataset.cpEdit);return;}
 if(b.hasAttribute('data-cp-cancel')){edit=null;renderSettings(s);return;}
 if(b.hasAttribute('data-cp-addmsg')){draft.messages.push({text:'',chance:0});renderSettings(s);return;}
 if(b.dataset.cpDelmsg!==undefined){draft.messages.splice(Number(b.dataset.cpDelmsg),1);renderSettings(s);return;}
 
 if(b.dataset.cpActivate){conf(s,chosen).active=b.dataset.cpActivate;api.save();return;}
 if(b.dataset.cpDelete){const x=conf(s,chosen),item=x.books.find(v=>v.id===b.dataset.cpDelete);
 if(!item||!window.confirm('「'+item.name+'」を打刻履歴ごと削除しますか？'))return;
 x.books=x.books.filter(v=>v.id!==item.id);if(x.active===item.id)x.active=x.books[0]?.id||null;edit=null;api.save();}
 });
 renderSettings(api.getState());
 window.AppPhotos?.migrate(api.getState(),api.save).catch(error=>console.warn('既存画像の移行をスキップ:',error));
}
function open(c) {chosen=c;edit=null;api.openSettings();renderSettings(api.getState());}
function chooseDay(value){if(/^\d{4}-\d{2}-\d{2}$/.test(value))selectedDay=value;}
function changeMonth(n){const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+Number(n),1));month=d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1);}
function resetMonth(){month=day().slice(0,7);selectedDay=day();feedback='';}
window.CharacterStamps={bind,migrate,renderSettings,calendar,flameHTML,flames,stamp,protect,open,img,book,resetMonth,changeMonth,chooseDay,reconcileTickets};
})();