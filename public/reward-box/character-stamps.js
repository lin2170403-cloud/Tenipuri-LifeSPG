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
let uploadKind='avatar';
function crop(kind,imgObj){
 const host=document.createElement('div');host.className='cp-crop-overlay';
 host.innerHTML=`<div class="cp-crop-modal"><h3>画像を切り抜く</h3><p>${kind==='stamp'?'スタンプは円形に切り抜きます':kind==='header'?'ヘッダーは横長です':'头像は正方形です'}</p>
 <canvas width="${kind==='header'?640:300}" height="${kind==='header'?270:300}"></canvas>
 <label>拡大<input type="range" data-cp-crop="zoom" min="1" max="3" step=".05" value="1"></label>
 <label>左右<input type="range" data-cp-crop="x" min="-100" max="100" value="0"></label>
 <label>上下<input type="range" data-cp-crop="y" min="-100" max="100" value="0"></label>
 <div class="cp-controls"><button data-cp-crop-save class="cp-primary">保存</button><button data-cp-crop-cancel>キャンセル</button></div></div>`;
 document.body.appendChild(host);
 const q={zoom:1,x:0,y:0},canvas=host.querySelector('canvas'),c=canvas.getContext('2d');
 const paint=()=>{const w=canvas.width,h=canvas.height,z=Math.max(w/imgObj.width,h/imgObj.height)*q.zoom,iw=imgObj.width*z,ih=imgObj.height*z;
 c.clearRect(0,0,w,h);c.save();if(kind==='stamp'){c.beginPath();c.arc(w/2,h/2,w/2,0,Math.PI*2);c.clip();}
 c.drawImage(imgObj,(w-iw)/2+q.x*(iw-w)/200,(h-ih)/2+q.y*(ih-h)/200,iw,ih);c.restore();};
 host.querySelectorAll('[data-cp-crop]').forEach(el=>el.oninput=()=>{q[el.dataset.cpCrop]=Number(el.value);paint();});
 host.querySelector('[data-cp-crop-cancel]').onclick=()=>host.remove();
 host.querySelector('[data-cp-crop-save]').onclick=async()=>{
 const button=host.querySelector('[data-cp-crop-save]');button.disabled=true;
 try{
  const encoded=canvas.toDataURL(kind==='stamp'?'image/png':'image/jpeg',0.7);
  const value=await window.AppPhotos.put(encoded);
  if(kind==='avatar'){
   const person=conf(api.getState(),chosen),previous=person.avatar;
   person.avatar=value;
   try{api.save()}catch(e){person.avatar=previous;throw e}
  }else if(draft)draft[kind]=value;
  host.remove();renderSettings(api.getState());api.toast('写真を追加しました');
 }catch(error){console.error('スタンプ画像保存失敗:',error);api.toast('画像の保存に失敗しました。空き容量と画像形式を確認してください');button.disabled=false;}
};paint();
}
function fileChosen(kind,f){
 if(!f)return;
 if(!f.type.startsWith('image/')&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name||''))return api.toast('画像ファイルを選んでください');
 if(f.size>20*1024*1024)return api.toast('20MB以下の画像を選んでください');
 let url;
 try{url=URL.createObjectURL(f)}catch(e){return api.toast('画像ファイルを開けませんでした')}
 const image=new Image();let completed=false;
 const fail=()=>{if(completed)return;completed=true;URL.revokeObjectURL(url);api.toast('画像を読み込めません。JPEGかPNGで試してください')};
 image.onload=()=>{if(completed)return;completed=true;try{crop(kind,image)}catch(error){console.error(error);api.toast('画像を開けませんでした')}finally{URL.revokeObjectURL(url)}};
 image.onerror=fail;image.src=url;
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