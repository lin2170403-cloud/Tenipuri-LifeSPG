import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL('../public/reward-box/'+name,import.meta.url),'utf8');
function moduleValue(name,key,extras={}){
 const context={window:{},console,queueMicrotask,Date,...extras};
 vm.runInNewContext(read(name),context,{filename:name});
 return context.window[key];
}
const resources=()=>Object.fromEntries(['physical','mental','technical','base','wisdom','ingenuity','coins'].map(k=>[k,0]));
test('resource ledger preserves opening balance and records only real changes',()=>{
 const L=moduleValue('resource-ledger.js','PointLedger');
 const state={resources:{...resources(),physical:12}};
 L.ensure(state);
 let before={...state.resources};state.resources.physical=17;
 L.record(state,before,{source:'training',title:'earned'});
 before={...state.resources};state.resources.physical=7;
 L.record(state,before,{source:'allocation',title:'spent'});
 before={...state.resources};state.resources.physical=0;
 L.record(state,before,{source:'training',title:'corrected'});
 assert.equal(L.calculated(state).physical,0);
 assert.equal(L.entries(state).length,3);
 assert.equal(L.entries(state,'earned').length,1);
 assert.equal(L.entries(state,'spent').length,2);
 assert.equal(L.record(state,{...state.resources}),null);
 assert.equal(L.entries(state).length,3,'saving without balance changes cannot duplicate a reward');
});
test('resource ledger rejects already-spent resource corrections',()=>{
 const L=moduleValue('resource-ledger.js','PointLedger');
 const state={resources:{...resources(),mental:8}};
 L.ensure(state);
 const before={...state.resources};state.resources.mental=2;
 L.record(state,before,{source:'allocation'});
 const now={...state.resources};state.resources.mental=-1;
 assert.throws(()=>L.record(state,now,{source:'training'}),/残高が不正/);
 state.resources.mental=2;
 assert.equal(L.calculated(state).mental,2);
});
test('journal and balance stay compatible with serialized backup',()=>{
 const L=moduleValue('resource-ledger.js','PointLedger');
 const state={resources:{...resources(),coins:10}};
 L.ensure(state);
 const before={...state.resources};state.resources.coins=4;
 L.record(state,before,{source:'shop',title:'gift'});
 const imported=JSON.parse(JSON.stringify(state));
 assert.equal(L.calculated(imported).coins,4);
 assert.equal(L.entries(imported,'spent').length,1);
});
test('image editor frame directly maps from visible image to source pixels',()=>{
 const C=moduleValue('image-editor.js','HimeImageEditor').geometry;
 const displayed=C.fit(1600,900,340,340);
 assert.equal(displayed.width,340);
 const frame=C.initial(displayed,1);
 const cropped=C.source(frame,displayed,1600,900);
 assert.ok(cropped.sw>0&&cropped.sh>0);
 assert.ok(Math.abs(cropped.sw-cropped.sh)<=2);
 assert.ok(cropped.sx>=0&&cropped.sy>=0);
 assert.ok(cropped.sx+cropped.sw<=1600&&cropped.sy+cropped.sh<=900);
 const moved=C.move(frame,9999,9999,displayed);
 assert.ok(moved.x+moved.width<=displayed.x+displayed.width+.01);
 const bigger=C.resize(frame,999,999,displayed,1);
 assert.ok(bigger.x+bigger.width<=displayed.x+displayed.width+.01);
});
test('photo store persists and verifies, with a safe fallback if IndexedDB unavailable',async()=>{
 const records=new Map(),run=fn=>queueMicrotask(fn);
 const fakeDb={objectStoreNames:{contains(){return true;}},transaction(){
  const tx={oncomplete:null,objectStore(){return{
   put(v,k){records.set(k,v);run(()=>tx.oncomplete?.());},
   get(k){const request={};run(()=>{request.result=records.get(k);request.onsuccess?.();});return request;}
  }}};return tx;
 }};
 const make=indexedDB=>moduleValue('app-photos.js','AppPhotos',{
  document:{readyState:'loading',addEventListener(){}},
  MutationObserver:class {},indexedDB,
 });
 const working=make({open(){const request={result:fakeDb};run(()=>request.onsuccess?.());return request;}});
 const input='data:image/png;base64,QUJDRA==';
 const ref=await working.put(input);
 assert.ok(ref.startsWith('idb:'));
 assert.equal(await working.get(ref),input);
 const fallback=make({open(){throw Error('Storage disabled')}});
 assert.equal(await fallback.put(input),input);
});
test('canonical characters screen owns the only visible point history panel',()=>{
 const h=read('index.html');
 assert.equal((h.match(/id="point-history-list"/g)||[]).length,1);
 assert.ok(h.indexOf('id="cp-home"')<h.indexOf('id="point-history-list"'));
 assert.ok(h.indexOf('id="point-history-list"')<h.indexOf('class="segment-switch chars-route"'));
 assert.ok(h.includes('resource-ledger.js')&&h.includes('image-editor.js'));
 for(const match of h.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g)){
  if(match[1].trim())new vm.Script(match[1],{filename:'reward-box/index.html'});
 }
});
test('wallet transfer logic preserves debt lock and prevents immediate re-spend',()=>{
 let script=read('wallet-upgrade.js');
 const original='window.WalletUpgrade={bind,render,renderPoints};';
 assert.ok(script.includes(original));
 script=script.replace(original,'window.WalletUpgrade={bind,render,renderPoints,testOnly:{applyTx}};');
 const win={},doc={
  getElementById(){return {innerHTML:'',addEventListener(){}};},
  querySelectorAll(){return [];}
 };
 vm.runInNewContext(script,{window:win,document:doc,console,Date});
 const W=win.WalletUpgrade,day='2026-10-16';
 const state={funds:{unallocated:4000,entertainment:0,fashion:0,life:0,gourmet:0,sweets:0},
  debt:500,dateLocked:0,savings:0,fundCredits:[],dateCredits:[],
  walletTransactions:[],pointHistory:[],trainingDaily:{},events:[],ledger:[]};
 W.bind({state:()=>state,availableFund:()=>4000,availableDate:()=>0,
  today:()=>day,toast(){},persist(){},render(){},log(){}});
 assert.throws(()=>W.testOnly.applyTx(state,{id:'a',from:'outside',to:'fashion',amount:50,date:day}),/借金/);
 W.testOnly.applyTx(state,{id:'b',from:'unallocated',to:'fashion',amount:100,date:day});
 assert.equal(state.funds.unallocated,3900);
 assert.equal(state.funds.fashion,100);
 assert.throws(()=>W.testOnly.applyTx(state,{id:'c',from:'fashion',to:'gourmet',amount:100,date:day}),/不足/);
 W.testOnly.applyTx(state,{id:'d',from:'unallocated',to:'debt',amount:500,date:day});
 assert.equal(state.debt,0);
});
