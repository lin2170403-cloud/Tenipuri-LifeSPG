/* Versioned, auditable resource journal. No view logic.
   Old pointHistory is left intact for read-only legacy history. */
(()=>{'use strict';
 const KEYS=['physical','mental','technical','base','wisdom','ingenuity','coins'];
 const copy=o=>Object.fromEntries(KEYS.map(k=>[k,Number(o?.[k])||0]));
 const valid=v=>Number.isSafeInteger(v)&&v>=0;
 const equal=(a,b)=>KEYS.every(k=>a[k]===b[k]);
 function ensure(state){
  if(!state.resourceJournal||state.resourceJournal.version!==1){
   state.resourceJournal={version:1,opening:copy(state.resources),entries:[],seq:0};
  }else{
   const j=state.resourceJournal;
   if(!Array.isArray(j.entries))j.entries=[];
   if(!Number.isSafeInteger(j.seq)||j.seq<0)j.seq=j.entries.length;
   if(!j.opening||typeof j.opening!=='object')throw Error('育成資源台帳の初期値が見つかりません');
  }
  return state.resourceJournal;
 }
 function calculated(state){
  const j=ensure(state),result=copy(j.opening);
  for(const entry of j.entries){
   for(const [k,n] of Object.entries(entry.changes||{})){
    if(!KEYS.includes(k)||!Number.isSafeInteger(n))throw Error('育成履歴の金額が不正です');
    result[k]+=n;
    if(!valid(result[k]))throw Error('使用済みポイントとの整合性が取れません');
   }
  }
  return result;
 }
 function record(state,before,meta={}){
  const j=ensure(state),next=copy(state.resources),previous=copy(before);
  for(const k of KEYS)if(!valid(next[k]))throw Error('育成ポイントの残高が不正です');
  const current=calculated(state);
  if(!equal(current,previous))throw Error('育成ポイント台帳と保存残高が一致しません');
  const changes={};
  for(const k of KEYS)if(next[k]!==previous[k])changes[k]=next[k]-previous[k];
  if(!Object.keys(changes).length)return null;
  const source=String(meta.source||'record');
  const isCorrection=meta.correction===true||(source==='training'&&Object.values(changes).some(x=>x<0));
  const kind=isCorrection?'adjustment':Object.values(changes).some(x=>x<0)?'spent':'earned';
  const now=new Date().toISOString();
  const entry={id:'pt-'+(++j.seq)+'-'+now,at:now,source,kind,
    title:String(meta.title||'育成ポイント変動'),note:String(meta.note||''),reference:String(meta.reference||''),changes};
  j.entries.push(entry);
  // No duplication: an entry is persisted once, and cannot be edited into a second award.
  return entry;
 }
 function revert(state,entry){
  if(!entry)return;
  const j=ensure(state),last=j.entries[j.entries.length-1];
  if(last?.id===entry.id)j.entries.pop();
 }
 function entries(state,type='all'){
  const j=ensure(state);
  return j.entries.filter(e=>type==='all'||(type==='earned'?Object.values(e.changes||{}).some(v=>v>0):
    type==='spent'?Object.values(e.changes||{}).some(v=>v<0):e.kind===type)).slice().reverse();
 }
 window.PointLedger={KEYS,copy,ensure,calculated,record,revert,entries};
})();