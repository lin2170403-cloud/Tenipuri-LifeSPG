/* Shared image persistence for character-stamp photos, compatible with timeline photo IDs. */
(()=>{'use strict';
const re=/^idb:[a-z0-9_-]+$/i;
const imageData=/^data:image\/(?:png|jpeg|jpg|webp);base64,[a-z0-9+/=]+$/i;
let opener=null;const cache=new Map();
function db(){
 if(opener)return opener;
 opener=new Promise((resolve,reject)=>{
  try{
   const req=indexedDB.open('hime-timeline-photos',1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('photos'))req.result.createObjectStore('photos')};
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Database unavailable'));
  }catch(e){reject(e)}
 }).catch(e=>{opener=null;throw e});
 return opener;
}
async function put(value){
 if(re.test(value))return value;
 if(!imageData.test(value))throw Error('Unsupported image data');
 const database=await db();
 const key='stamp_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);
 await new Promise((resolve,reject)=>{
  const tx=database.transaction('photos','readwrite');
  tx.objectStore('photos').put(value,key);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Photo write failed'));
  tx.onabort=()=>reject(tx.error||Error('Photo write aborted'));
 });
 cache.set('idb:'+key,value);
 return 'idb:'+key;
}
async function get(ref){
 if(!re.test(ref))return ref||'';
 if(cache.has(ref))return cache.get(ref);
 const database=await db();
 const value=await new Promise((resolve,reject)=>{
  const request=database.transaction('photos','readonly').objectStore('photos').get(ref.slice(4));
  request.onsuccess=()=>resolve(request.result||'');
  request.onerror=()=>reject(request.error||Error('Photo read failed'));
 });
 if(typeof value==='string'&&imageData.test(value))cache.set(ref,value);
 return typeof value==='string'&&imageData.test(value)?value:'';
}
async function hydrate(root=document){
 const elements=[...root.querySelectorAll('[data-hime-photo-ref],[data-hime-photo-bg]')];
 await Promise.all(elements.map(async el=>{
  const imageRef=el.dataset.himePhotoRef,backgroundRef=el.dataset.himePhotoBg,ref=imageRef||backgroundRef;
  if(!re.test(ref))return;
  try{
   const data=await get(ref);
   if(!el.isConnected||!data)return;
   if(imageRef){if(el.getAttribute('src')!==data)el.src=data;}
   else el.style.backgroundImage='url("'+data+'")';
  }catch(err){console.warn('スタンプ画像の読み込みに失敗:',err)}
 }));
}
function inline(value){return imageData.test(value)}
function renderImage(value,cls=''){
 if(!value)return '';
 const safeClass=String(cls).replace(/[^a-zA-Z0-9 _-]/g,'');
 if(re.test(value))return '<img class="'+safeClass+'" data-hime-photo-ref="'+value+'" alt="">';
 if(inline(value))return '<img class="'+safeClass+'" src="'+value+'" alt="">';
 return '';
}
function bgAttrs(value){
 if(re.test(value))return 'data-hime-photo-bg="'+value+'"';
 if(inline(value))return 'style="background-image:url(\''+value+'\')"';
 return '';
}
async function exportState(s){
 for(const cfg of Object.values(s.charStamps||{})){
  if(typeof cfg.avatar==='string')cfg.avatar=await get(cfg.avatar);
  for(const book of cfg.books||[]){
   for(const k of ['header','stamp'])if(typeof book[k]==='string')book[k]=await get(book[k]);
  }
 }
 return s;
}
async function importState(s){
 for(const cfg of Object.values(s.charStamps||{})){
  if(inline(cfg.avatar))cfg.avatar=await put(cfg.avatar);
  for(const book of cfg.books||[]){
   for(const k of ['header','stamp'])if(inline(book[k]))book[k]=await put(book[k]);
  }
 }
 return s;
}
async function migrate(s,save){
 let changed=false;
 for(const cfg of Object.values(s.charStamps||{})){
  if(inline(cfg.avatar)){try{cfg.avatar=await put(cfg.avatar);changed=true}catch(e){console.warn('Avatar migration skipped',e)}}
  for(const book of cfg.books||[])for(const k of ['header','stamp']){
   if(inline(book[k]))try{book[k]=await put(book[k]);changed=true}catch(e){console.warn('Stamp migration skipped',e)}
  }
 }
 if(changed)try{save()}catch(e){console.warn('Cannot persist migrated images',e)}
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;hydrate()})}
function observe(){
 hydrate();
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});
else observe();
window.AppPhotos={put,get,hydrate,renderImage,bgAttrs,exportState,importState,migrate};
})();