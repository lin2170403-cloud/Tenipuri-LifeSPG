(()=>{'use strict';
const LOTS=window.GuanyinLotsData||[];
const LEVELS={'上上':{label:'上上籤',tone:'excellent',note:'吉兆を見いだす籤。今ある機会を大切に。'},'上吉':{label:'上吉籤',tone:'good',note:'前向きな兆しの籤。焦らず良い流れを育てよう。'},'中平':{label:'中平籤',tone:'steady',note:'変化を急がず、日々の積み重ねを見直す籤。'},'下下':{label:'下下籤',tone:'caution',note:'無理せず方針を点検するための籤。未来が決まるわけではない。'}};
const CHECK=LOTS.length===100&&LOTS.every((x,i)=>x.n===i+1&&x.verse&&x.story);
if(!CHECK)console.warn('Guanyin hundred-lot corpus is incomplete');
const escape=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const pad=x=>String(x).padStart(2,'0');
const datePart=(date=new Date())=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));
const clock=(date=new Date())=>{const p=datePart(date);return {date:p.year+'-'+p.month+'-'+p.day,hour:Number(p.hour),time:pad(p.hour)+':'+pad(p.minute)}};
const record=(state,date)=>[...(state.morningHistory||[])].find(x=>x?.kind==='guanyin100'&&x.date===date);
const allRecords=state=>(state.morningHistory||[]).filter(x=>x?.kind==='guanyin100'&&Number.isInteger(x.number)&&x.number>=1&&x.number<=100);
const lot=n=>LOTS.find(x=>x.n===Number(n))||null;
const randomNo=()=>{if(window.crypto?.getRandomValues){const buf=new Uint32Array(1),limit=Math.floor(4294967296/100)*100;let value;do{crypto.getRandomValues(buf);value=buf[0]}while(value>=limit);return (value%100)+1;}return Math.floor(Math.random()*100)+1;};
const stampDate=r=>r?.date?escape(r.date)+(r.at?' '+escape(r.at):''):'';
let api=null,activeNumber=null,query='',filter='all',busy=false;
function valueMark(item){const level=LEVELS[item.grade]||LEVELS['中平'];return '<span class="gyn-level '+level.tone+'">'+escape(level.label)+'</span>';}
function detail(item,compact=false){
 if(!item)return '';
 const text=LEVELS[item.grade]||LEVELS['中平'];
 return '<article class="gyn-lot '+(compact?'compact':'')+'"><div class="gyn-lot-heading"><div class="gyn-lot-number">第'+pad(item.n)+'籤</div>'+valueMark(item)+'</div>'+
 '<h3>'+escape(item.story)+'</h3><div class="gyn-verse">'+escape(item.verse.replace(/([。？！])/g,'$1\n'))+'</div>'+
 '<section class="gyn-reading"><b>解曰（伝統的な読み）</b><p>'+escape(item.reading)+'</p></section>'+
 '<p class="gyn-reflection">'+escape(text.note)+'</p>'+
 (!compact?'<small class="gyn-disclaimer">観音霊籤は文化的な占いです。現実の選択や未来を決定するものではありません。</small>':'')+
 '</article>';
}
function saveAndRender(){api.persist();api.render();}
function status(state){
 const {date,hour}=clock(),today=record(state,date);
 if(today)return {ready:false,label:'本日の籤は拝受済み',today};
 if(hour>=9)return {ready:false,label:'明日の朝9:00より前にどうぞ',today:null};
 return {ready:true,label:'朝9:00まで · 1日1回',today:null};
}
function draw(){
 if(busy)return;
 const state=api.state(),now=clock(),s=status(state);
 if(!s.ready){api.toast(s.label);render(state);return;}
 if(!CHECK){api.toast('籤文データを確認できません');return;}
 const number=randomNo();
 const entry={kind:'guanyin100',id:'gyn-'+now.date,date:now.date,at:now.time,number};
 state.morningHistory=Array.isArray(state.morningHistory)?state.morningHistory:[];
 state.morningHistory.unshift(entry);
 try{api.persist();}catch(e){state.morningHistory.shift();api.toast('保存できません。バックアップを確認してください');return;}
 activeNumber=number;busy=true;
 const card=document.querySelector('#morning-oracle-root .gyn-ritual');
 card?.classList.add('shaking');
 const button=document.querySelector('#morning-oracle-root [data-gyn-draw]');
 if(button)button.disabled=true;
 window.setTimeout(()=>{busy=false;render(api.state());api.toast('第'+number+'籤を拝受しました');},900);
}
function render(state){
 const root=document.getElementById('morning-oracle-root');if(!root)return;
 const s=status(state),picked=activeNumber?lot(activeNumber):s.today?lot(s.today.number):null;
 root.innerHTML='<div class="gyn-main"><div class="gyn-title"><div><span class="gyn-kicker">GUANYIN · 100 LOTS</span><h2>🌅 朝の運試し</h2></div><span class="gyn-status">'+escape(s.label)+'</span></div>'+
 '<div class="gyn-ritual" aria-hidden="true"><div class="gyn-tube"><span class="gyn-sticks">╲│╱│╲</span><span class="gyn-emblem">観音</span></div><p>一念を整え、今日の籤を引く</p></div>'+
 '<button type="button" class="gyn-draw" data-gyn-draw '+(!s.ready||busy?'disabled':'')+'>'+(s.today?'本日の籤を確認':s.ready?'籤筒を振る':'本日の受付終了')+'</button>'+
 (picked?'<div class="gyn-today-label">📜 '+escape(s.today?s.today.date:clock().date)+' の御籤</div>'+detail(picked):'<div class="gyn-empty">全100籤から、一様な確率で1籤を選びます。</div>')+
 '<nav class="gyn-actions"><button type="button" data-gyn-open="morning-exchange">百籤図鑑</button><button type="button" data-gyn-open="morning-history">抽籤履歴</button></nav></div>';
 const b=root.querySelector('[data-gyn-draw]');
 if(b&&s.today)b.addEventListener('click',()=>{activeNumber=s.today.number;render(state);});
 renderCatalogue(state);renderHistory(state);
}
function visibleLots(){
 const q=query.trim().toLowerCase();
 return LOTS.filter(x=>(filter==='all'||x.grade===filter)&&(!q||String(x.n).includes(q)||x.story.toLowerCase().includes(q)||x.verse.toLowerCase().includes(q)||x.reading.toLowerCase().includes(q)));
}
function renderCatalogue(state){
 const root=document.getElementById('gyn-catalogue-root');if(!root)return;
 const rows=visibleLots(),active=lot(activeNumber);
 root.innerHTML='<div class="gyn-catalogue-tools"><label>検索<input id="gyn-search" type="search" placeholder="籤号・故事・籤詩" value="'+escape(query)+'"></label>'+
 '<label>籤級<select id="gyn-grade"><option value="all">すべての籤級</option>'+Object.keys(LEVELS).map(k=>'<option value="'+escape(k)+'" '+(k===filter?'selected':'')+'>'+escape(LEVELS[k].label)+'</option>').join('')+'</select></label></div>'+
 '<p class="gyn-count">全100籤 · 表示 '+rows.length+'籤</p>'+
 '<div class="gyn-list">'+rows.map(x=>'<button type="button" class="gyn-list-item '+(activeNumber===x.n?'chosen':'')+'" data-gyn-number="'+x.n+'"><span>第'+pad(x.n)+'籤</span><b>'+escape(x.story)+'</b>'+valueMark(x)+'</button>').join('')+'</div>'+
 '<div id="gyn-selected-detail">'+(active?detail(active,true):'<p class="gyn-empty">籤を選ぶと籤詩・典故・解曰が表示されます。</p>')+'</div>'+
 '<p class="gyn-license">資料：<a href="https://github.com/zouzuo1994321/QinTianJian" target="_blank" rel="noopener noreferrer">欽天監（肆月Aperture）</a> · 非商用利用のみ · <a href="./THIRD_PARTY_GUANYIN_LICENSE.txt" target="_blank" rel="noopener noreferrer">出典・ライセンス全文</a></p>';
}
function renderHistory(state){
 const root=document.getElementById('morning-history-list');if(!root)return;
 const rows=allRecords(state).slice().sort((a,b)=>b.date.localeCompare(a.date));
 root.innerHTML=rows.length?'<div class="gyn-history">'+rows.map(row=>{
  const entry=lot(row.number);
  return '<details class="gyn-history-item"><summary><span>'+stampDate(row)+'</span><b>第'+pad(row.number)+'籤 '+escape(entry?.story||'')+'</b> '+(entry?valueMark(entry):'')+'</summary>'+detail(entry,true)+'</details>';
 }).join('')+'</div>':'<p class="gyn-empty">まだ籤を引いていません。</p>';
}
function bind(context){
 api=context;document.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(!b)return;
  if(b.hasAttribute('data-gyn-draw')){draw();return;}
  if(b.dataset.gynOpen){api.openPage(b.dataset.gynOpen);return;}
  if(b.dataset.gynNumber){activeNumber=Number(b.dataset.gynNumber);renderCatalogue(api.state());}
 });
 document.addEventListener('input',e=>{
  if(e.target?.id==='gyn-search'){
   const pos=e.target.selectionStart;query=e.target.value;renderCatalogue(api.state());
   const input=document.getElementById('gyn-search');if(input){input.focus();input.setSelectionRange(pos,pos);}
  }
 });
 document.addEventListener('change',e=>{if(e.target?.id==='gyn-grade'){filter=e.target.value;renderCatalogue(api.state());}});
 window.setInterval(()=>{if(!busy&&document.getElementById('page-gacha')?.classList.contains('active'))render(api.state());},60000);
 render(api.state());
}
window.GuanyinMorning={bind,render,renderHistory,renderCatalogue,draw,status,lot,LOTS,LEVELS,clock,allRecords};
})();