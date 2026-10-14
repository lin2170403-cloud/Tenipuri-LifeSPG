(()=>{'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const nowJST=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).replace(/[, ]+/,'T');
const parts=(d)=>{const [y,m]=d.split('-').map(Number);return {first:new Date(Date.UTC(y,m-1,1)).getUTCDay(),days:new Date(Date.UTC(y,m,0)).getUTCDate()};};
const nextMonth=(m,delta)=>{const [y,mon]=m.split('-').map(Number),v=new Date(Date.UTC(y,mon-1+delta,1));return v.toISOString().slice(0,7)};
function migrate(s){if(!Array.isArray(s.timelinePosts))s.timelinePosts=[];s.timelinePosts=s.timelinePosts.filter(p=>p&&typeof p.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date));}
let api=null,chosen=nowJST().slice(0,10),month=chosen.slice(0,7),modal=null,activeImages=[],editing=null,pendingImages=0,lastRange=null;
function clean(html){
 const input=document.createElement('template');input.innerHTML=String(html||'').slice(0,100000);
 const allowed=new Set(['B','STRONG','I','EM','U','S','STRIKE','DEL','SPAN','DIV','P','BR']);
 const out=document.createElement('div');
 function walk(node,parent){
  if(node.nodeType===3){parent.appendChild(document.createTextNode(node.nodeValue));return;}
  if(node.nodeType!==1)return;
  const tag=node.tagName;
  if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','FORM','IMG','VIDEO','AUDIO'].includes(tag))return;
  let dest=parent;
  if(allowed.has(tag)){
   dest=document.createElement(tag);
   if(tag==='SPAN'){
    const color=node.style.color;
    if(color&&(/^(#[0-9a-f]{3,8}|rgb(a)?\([\d.,%\s]+\)|[a-z]{3,18})$/i.test(color)))dest.style.color=color;
   }
   parent.appendChild(dest);
  }
  [...node.childNodes].forEach(n=>walk(n,dest));
 }
 [...input.content.childNodes].forEach(n=>walk(n,out));
 return out.innerHTML;
}
function posts(s,day){return s.timelinePosts.filter(p=>p.date===day).sort((a,b)=>(a.time||'').localeCompare(b.time||'')||(a.created||'').localeCompare(b.created||''));}
function visible(p){return /^\d{4}-\d{2}-\d{2}$/.test(p.date)&&/^\d{2}:\d{2}$/.test(p.time)&&(p.date+'T'+p.time)<=nowJST().slice(0,16);}
function render(s){
 const root=document.getElementById('timeline-root');if(!root)return;
 migrate(s);
 const {first,days}=parts(month);
 const marked=new Set(s.timelinePosts.map(p=>p.date));
 const grid=Array(first).fill('<div></div>').join('')+Array.from({length:days},(_,i)=>{
  const d=month+'-'+String(i+1).padStart(2,'0');
  return '<button type="button" class="tl-day '+(d===chosen?'selected ':'')+(d===nowJST().slice(0,10)?'today':'')+'" data-tl-day="'+d+'" aria-pressed="'+(d===chosen?'true':'false')+'"><b>'+(i+1)+'</b>'+(marked.has(d)?'<i aria-label="投稿あり">●</i>':'')+'</button>';
 }).join('');
 root.innerHTML='<div class="tl-wrap"><div class="tl-calendar"><div class="tl-month"><button data-tl-month="-1" type="button" aria-label="前の月">‹</button><strong>'+month.replace('-','年')+'月</strong><button data-tl-month="1" type="button" aria-label="次の月">›</button></div><div class="tl-week">'+['日','月','火','水','木','金','土'].map(d=>'<span>'+d+'</span>').join('')+'</div><div class="tl-days">'+grid+'</div></div>'+
 '<div class="tl-timeline"><div class="tl-timeline-head"><div><small>MY TIMELINE</small><h3>'+E(chosen)+' のタイムライン</h3></div><button type="button" class="tl-compose" data-tl-new>＋ 投稿する</button></div>'+
 (posts(s,chosen).map(p=>{
 const isReady=visible(p),safeImages=(p.images||[]).filter(x=>typeof x==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x));
 return '<article class="tl-post '+(!isReady?'scheduled':'')+'"><div class="tl-post-head"><span>'+(isReady?'公開':'予約投稿')+' · '+E(p.time)+'</span><button type="button" data-tl-edit="'+E(p.id)+'">編集</button></div>'+
 (isReady?'<div class="tl-post-body">'+clean(p.html)+'</div>':'<p class="tl-waiting">設定した公開時刻になると内容が表示されます。編集からプレビューできます。</p>')+
 (isReady&&safeImages.length?'<div class="tl-images">'+safeImages.map(src=>'<img alt="投稿画像" loading="lazy" src="'+src+'">').join('')+'</div>':'')+'</article>';
 }).join('')||'<p class="tl-empty">まだ投稿がありません。カレンダーの「投稿する」から書いてみよう。</p>')+'</div></div>';
}
function openEditor(post){
 if(modal)modal.remove();
 editing=post?.id||null;pendingImages=0;lastRange=null;
 activeImages=[...(post?.images||[])].filter(x=>typeof x==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x));
 modal=document.createElement('div');modal.className='tl-modal';modal.innerHTML='<div class="tl-editor" role="dialog" aria-modal="true" aria-label="タイムライン投稿の編集"><header><strong>'+(post?'投稿を編集':'新しい投稿')+'</strong><button type="button" data-tl-close aria-label="閉じる">×</button></header><form id="tl-post-form"><div class="tl-editor-meta"><label>投稿日<input name="date" type="date" required value="'+E(post?.date||chosen)+'"></label><label>公開予定時刻<input name="time" type="time" required value="'+E(post?.time||nowJST().slice(11,16))+'"></label></div>'+
 '<div class="tl-toolbar" role="toolbar" aria-label="文字装飾"><button type="button" data-tl-command="bold" title="太字"><b>B</b></button><button type="button" data-tl-command="italic" title="斜体"><i>I</i></button><button type="button" data-tl-command="underline" title="下線"><u>U</u></button><button type="button" data-tl-command="strikeThrough" title="取消線"><s>S</s></button><label title="文字色">文字色<input type="color" id="tl-color" value="#7955a6"></label><button type="button" data-tl-now title="現在時刻を本文に挿入">🕒 今の時間</button></div>'+
 '<div id="tl-content" contenteditable="true" role="textbox" aria-label="本文" aria-multiline="true" data-placeholder="今日の出来事や予定を書こう"></div>'+
 '<label class="tl-upload">🖼️ 画像を追加（最大4枚）<input type="file" id="tl-upload" accept="image/*" multiple></label><div id="tl-image-preview"></div>'+
 '<p class="tl-tip">設定時刻になるとタイムラインに公開されます。投稿内容は後から修正できます。</p>'+
 '<footer><button type="button" data-tl-close>キャンセル</button>'+(post?'<button type="button" data-tl-remove class="tl-danger">削除</button>':'')+'<button type="submit" class="tl-save">'+(post?'変更を保存':'投稿を予約・公開')+'</button></footer></form></div>';
 document.body.appendChild(modal);
 const area=modal.querySelector('#tl-content');
 area.innerHTML=clean(post?.html||'');
 area.addEventListener('keyup',()=>recordSelection(area));
 area.addEventListener('mouseup',()=>recordSelection(area));
 area.addEventListener('touchend',()=>recordSelection(area));
 function recordSelection(node){
  const sel=window.getSelection();if(!sel?.rangeCount)return;
  const range=sel.getRangeAt(0);if(node.contains(range.commonAncestorContainer))lastRange=range.cloneRange();
 }
 function restore(){
  area.focus();
  if(lastRange){const sel=window.getSelection();sel.removeAllRanges();sel.addRange(lastRange);}
 }
 preview();
 modal.querySelectorAll('[data-tl-command]').forEach(b=>b.addEventListener('mousedown',e=>e.preventDefault()));
 modal.querySelectorAll('[data-tl-command]').forEach(b=>b.addEventListener('click',()=>{
  restore();document.execCommand(b.dataset.tlCommand,false,null);recordSelection(area);
 }));
 modal.querySelector('#tl-color').addEventListener('input',e=>{
  restore();document.execCommand('foreColor',false,e.target.value);recordSelection(area);
 });
 modal.querySelector('[data-tl-now]').addEventListener('click',()=>{
  restore();
  const text=document.createTextNode('['+nowJST().slice(11,16)+'] ');
  const selection=window.getSelection();
  if(selection?.rangeCount&&area.contains(selection.getRangeAt(0).commonAncestorContainer)){
   const range=selection.getRangeAt(0);range.deleteContents();range.insertNode(text);
   range.setStartAfter(text);range.collapse(true);selection.removeAllRanges();selection.addRange(range);lastRange=range.cloneRange();
  }else{area.appendChild(text);lastRange=null;}
  area.dispatchEvent(new Event('input',{bubbles:true}));
 });
 modal.querySelector('#tl-upload').addEventListener('change',e=>loadFiles([...e.target.files]));
 modal.addEventListener('click',e=>{
  if(e.target===modal||e.target.closest('[data-tl-close]')){modal.remove();modal=null;return;}
  const remove=e.target.closest('[data-tl-image-remove]');
  if(remove){activeImages.splice(Number(remove.dataset.tlImageRemove),1);preview();return;}
  if(e.target.closest('[data-tl-remove]')&&editing){
   if(!window.confirm('この投稿を削除しますか？'))return;
   const s=api.state(),before=s.timelinePosts;s.timelinePosts=s.timelinePosts.filter(p=>p.id!==editing);saveAndClose(()=>{s.timelinePosts=before});
  }
 });
 modal.querySelector('#tl-post-form').addEventListener('submit',e=>{
  e.preventDefault();
  if(pendingImages)return api.toast('画像の読み込みが終わるまでお待ちください');
  const s=api.state(),date=e.target.elements.date.value,time=e.target.elements.time.value,html=clean(modal.querySelector('#tl-content').innerHTML);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return api.toast('日時を確認してください');
  if(!html.replace(/<[^>]+>/g,'').trim()&&!activeImages.length)return api.toast('本文か画像を追加してください');
  const prev=s.timelinePosts.find(x=>x.id===editing),backup=prev?{...prev,images:[...(prev.images||[])]}:null,p={id:editing||id(),date,time,html,images:[...activeImages],created:prev?.created||new Date().toISOString(),updated:new Date().toISOString()};
  if(prev)Object.assign(prev,p);else s.timelinePosts.push(p);
  chosen=date;month=date.slice(0,7);
  saveAndClose(()=>{if(backup)Object.assign(prev,backup);else s.timelinePosts=s.timelinePosts.filter(x=>x.id!==p.id)});
 });
}
function saveAndClose(revert){
 try{api.save();modal?.remove();modal=null;editing=null;activeImages=[];api.toast('タイムラインを保存しました')}catch(e){revert?.();api.toast('保存できません。画像数や容量を減らして再試行してください')}
}
function preview(){
 const target=modal.querySelector('#tl-image-preview');
 target.innerHTML=activeImages.map((src,i)=>'<div><img src="'+src+'" alt="アップロード画像"><button type="button" data-tl-image-remove="'+i+'">×</button></div>').join('');
}
function loadFiles(files){
 const valid=files.filter(f=>f.type.startsWith('image/')).slice(0,Math.max(0,4-activeImages.length));
 for(const f of valid){
  if(f.size>10*1024*1024){api.toast('10MB以下の画像を選んでください');continue}
  pendingImages++;
  const reader=new FileReader();
  reader.onload=()=>{
   const image=new Image();image.onload=()=>{
    const scale=Math.min(1,850/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    if(activeImages.length<4){activeImages.push(canvas.toDataURL('image/jpeg',0.67));preview();}pendingImages--;
   };image.onerror=()=>{pendingImages--;api.toast('画像を読み込めません')};image.src=reader.result;
  };reader.onerror=()=>{pendingImages--;api.toast('画像を読み込めません')};reader.readAsDataURL(f);
 }
}
function openImageLightbox(src){
 if(typeof src!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src))return;
 const existing=document.getElementById('tl-lightbox');if(existing)existing.remove();
 const lightbox=document.createElement('div');lightbox.id='tl-lightbox';lightbox.className='tl-lightbox';
 const image=document.createElement('img');image.src=src;image.alt='拡大した写真';
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','画像を閉じる');
 lightbox.append(image,close);document.body.appendChild(lightbox);
 const dismiss=()=>{lightbox.remove();document.removeEventListener('keydown',onKey);};
 const onKey=e=>{if(e.key==='Escape')dismiss();};
 lightbox.addEventListener('click',e=>{if(e.target!==image)dismiss()});
 document.addEventListener('keydown',onKey);
 close.focus();
}
function bind(context){
 api=context;const root=document.getElementById('timeline-root');if(!root)return;
 document.addEventListener('click',e=>{
  const img=e.target.closest?.('.tl-images img, #tl-image-preview img, .vdate-memory img');
  if(img)openImageLightbox(img.src);
 });
 migrate(api.state());
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.tlMonth){month=nextMonth(month,Number(b.dataset.tlMonth));render(api.state());return}
  if(b.dataset.tlDay){chosen=b.dataset.tlDay;render(api.state());return}
  if(b.hasAttribute('data-tl-new')){openEditor(null);return}
  if(b.dataset.tlEdit){openEditor(api.state().timelinePosts.find(p=>p.id===b.dataset.tlEdit));}
 });
 setInterval(()=>{if(document.getElementById('page-timeline')?.classList.contains('active')&&!modal)render(api.state());},60000);
 render(api.state());
}
window.DailyTimeline={bind,render,migrate,clean,posts,visible,openImageLightbox};
})();