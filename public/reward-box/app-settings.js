(()=>{'use strict';
const COLORS={
 lavender:['#7256aa','#f2edfa','#d36a9d'],sakura:['#c35d91','#faedf4','#dd7ea4'],
 mint:['#268678','#e3f5ef','#d88fa9'],sky:['#417eba','#e9f3ff','#9f77ce'],
 neutral:['#786951','#f2eee7','#b87d84']
};
const TERMS={
 'お財布':['钱包','Wallet'],'キャラ':['角色','Characters'],'ガチャ':['抽卡','Gacha'],
 '持ち物':['物品','Inventory'],'使い方・説明書':['使用说明','Manual'],
 'キャラとスタンプ帳設定':['角色与打卡簿设置','Characters & Stamps'],
 'データバックアップ':['数据备份','Backup'],'ショップ':['商店','Shop'],
 'ポイント投入':['分配点数','Allocate Points'],'デート':['约会','Date'],
 'スキル':['技能','Skills'],'レーダー':['雷达图','Radar'],
 '引換所':['兑换所','Exchange'],'抽選履歴':['抽卡历史','Draw History'],
 '朝の運試し':['早晨试运气','Morning Luck'],'姫猫ご褒美':['姬猫奖励','Princess Cat Rewards'],
 '北海道ロマン':['北海道浪漫','Hokkaido Romance'],
 '北海道貯金':['北海道储蓄','Hokkaido Savings'],
 'デート資金':['约会基金','Date Fund']
};
let api=null;
const sane=(s)=>{
 if(!s.appSettings||typeof s.appSettings!=='object')s.appSettings={};
 const x=s.appSettings;
 if(!COLORS[x.theme])x.theme='lavender';
 if(!Number.isInteger(x.dayStartHour)||x.dayStartHour<0||x.dayStartHour>23)x.dayStartHour=5;
 if(!['JP','CN','EN'].includes(x.language))x.language='JP';
 return x;
};
function dayKey(date=new Date(),config){
 const h=Number.isInteger(config?.dayStartHour)?config.dayStartHour:5;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
 const v=new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)-(Number(parts.hour)<h?1:0)));
 return v.toISOString().slice(0,10);
}
function apply(s){
 const x=sane(s),root=document.documentElement;
 for(const [k,val] of Object.entries(Object.fromEntries(['--violet','--pale','--pink'].map((key,i)=>[key,COLORS[x.theme][i]]))))root.style.setProperty(k,val);
 root.dataset.theme=x.theme;
 root.lang=x.language==='CN'?'zh-Hans':x.language==='EN'?'en':'ja';
 const index=x.language==='CN'?0:x.language==='EN'?1:-1;
 for(const el of document.querySelectorAll('[data-i18n-text]')){
  const key=el.dataset.i18nText,translated=TERMS[key]?.[index];
  el.textContent=translated||key;
 }
 for(const [selector,key] of [
  ['.bottom-tabs [data-tab="wallet"] span:last-child','お財布'],
  ['.bottom-tabs [data-tab="chars"] span:last-child','キャラ'],
  ['.bottom-tabs [data-tab="gacha"] span:last-child','ガチャ'],
  ['[data-page="inventory"].menu-row','持ち物'],
  ['[data-page="manual"].menu-row','使い方・説明書'],
  ['[data-page="settings"].menu-row','キャラとスタンプ帳設定'],
  ['[data-page="backup"].menu-row','データバックアップ'],
  ['[data-gacha-tab="morning"]','朝の運試し'],
  ['[data-gacha-tab="reward"]','姫猫ご褒美'],
  ['[data-gacha-tab="hokkaido"]','北海道ロマン']
 ]){
   const el=document.querySelector(selector);if(!el)continue;
   if(el.classList.contains('menu-row')){const ic=el.querySelector('span')?.textContent||'⚙';el.innerHTML='<span>'+ic+'</span> '+(TERMS[key]?.[index]||key)+' <b>›</b>';}
   else el.textContent=TERMS[key]?.[index]||key;
 }
}
function render(s){
 const target=document.getElementById('app-basic-settings');if(!target)return;
 const x=sane(s);
 target.innerHTML='<h3>⚙ 基礎設定 / Basic settings</h3>'+
 '<label>テーマカラー / Theme<select id="vnext-theme">'+Object.keys(COLORS).map(k=>'<option value="'+k+'" '+(k===x.theme?'selected':'')+'>'+({lavender:'ラベンダー',sakura:'桜ピンク',mint:'ミント',sky:'スカイブルー',neutral:'クラシック'}[k])+'</option>').join('')+'</select></label>'+
 '<label>一日の始まり / Day starts<select id="vnext-daystart">'+Array.from({length:24},(_,i)=>'<option value="'+i+'" '+(i===x.dayStartHour?'selected':'')+'>'+String(i).padStart(2,'0')+':00</option>').join('')+'</select></label>'+
 '<label>言語 / Language<select id="vnext-language">'+['JP','CN','EN'].map(k=>'<option value="'+k+'" '+(k===x.language?'selected':'')+'>'+k+'</option>').join('')+'</select></label>'+
 '<p class="minor">日次の集計日は設定した時刻に切り替わります。言語は主要ナビゲーションから適用します。キャラ台詞は原文のままです。</p>';
 apply(s);
}
function bind(context){
 api=context;const target=document.getElementById('app-basic-settings');if(!target)return;
 target.addEventListener('change',e=>{
  const x=sane(api.state());
  if(e.target.id==='vnext-theme')x.theme=e.target.value;
  else if(e.target.id==='vnext-daystart')x.dayStartHour=Number(e.target.value);
  else if(e.target.id==='vnext-language')x.language=e.target.value;
  else return;
  api.save();render(api.state());
 });
 render(api.state());
}
window.AppSettings={sane,dayKey,apply,render,bind,TERMS};
})();