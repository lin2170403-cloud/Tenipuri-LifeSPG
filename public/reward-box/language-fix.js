/* Lightweight DOM localization for controls; preserves user-authored diary/story text. */
(()=>{'use strict';
const dict={"基礎設定":["基础设置","Basic settings"],"テーマカラー":["主题颜色","Theme color"],"一日の始まり":["每日开始时间","Start of day"],"言語":["语言","Language"],"カレンダー":["日历","Calendar"],"お財布":["钱包","Wallet"],"キャラ":["角色","Characters"],"ガチャ":["抽卡","Gacha"],"持ち物":["物品","Inventory"],"ショップ":["商店","Shop"],"12人の王子たち":["12位王子","12 princes"],"好感度":["好感度","Affection"],"プレゼントを贈る":["赠送礼物","Give a gift"],"打刻帳を開く":["打开打卡簿","Open stamp book"],"フィジカル":["体能","Physical"],"メンタル":["心理","Mental"],"テクニック":["技术","Technique"],"悟性":["悟性","Insight"],"工夫":["创意","Ingenuity"],"ニャンコイン":["猫猫币","Cat Coins"],"デート":["约会","Date"],"スキル":["技能","Skills"],"レーダー":["雷达图","Radar"],"段階":["阶段","Stage"],"デート不可":["尚未解锁约会","Date locked"],"北海道ロマン":["北海道浪漫","Hokkaido Romance"],"北海道貯金":["北海道储蓄","Hokkaido savings"],"北海道ジュエル":["北海道宝石","Hokkaido jewels"],"交換メダル":["兑换奖章","Exchange medals"],"交換方法":["兑换方式","Exchange method"],"カード図鑑":["卡片图鉴","Card collection"],"貯金達成報酬":["储蓄达成奖励","Savings milestones"],"引換所":["兑换所","Exchange"],"交換所":["兑换所","Exchange"],"抽選履歴":["抽卡记录","Draw history"],"全132種":["全部132种","All 132"],"収集":["已收集","Collected"],"1回":["单抽","Single draw"],"10連":["十连抽","Ten draws"],"抽選":["抽卡","Draw"],"姫猫ご褒美":["姬猫奖励","Princess Cat Rewards"],"朝の運試し":["早晨试运气","Morning fortune"],"タイムライン":["时间线","Timeline"],"投稿する":["发布","New post"],"編集":["编辑","Edit"],"削除":["删除","Delete"],"保存":["保存","Save"],"公開":["已发布","Published"],"予約投稿":["定时发布","Scheduled"],"週表示":["周视图","Week view"],"月表示":["月视图","Month view"],"前の週":["前一周","Previous week"],"次の週":["后一周","Next week"],"前の月":["上个月","Previous month"],"次の月":["下个月","Next month"],"今日の入荷":["今日领取","Daily intake"],"育成資源":["培养资源","Training resources"],"今日のジェム":["今日宝石","Daily gems"],"全12人共通":["12人共用","Shared by all 12"],"所持":["持有","Owned"],"残高":["余额","Balance"],"ファンド":["资金","Funds"],"未分類":["未分类","Unallocated"],"エンタメ":["娱乐","Entertainment"],"ファッション":["服饰","Fashion"],"ライフ":["生活","Lifestyle"],"グルメ":["美食","Food"],"スイーツ":["甜点","Desserts"],"スピード":["速度","Speed"],"パワー":["力量","Power"],"スタミナ":["耐力","Stamina"],"敏捷":["敏捷","Agility"],"安定":["稳定","Stability"],"精神":["精神","Spirit"],"戦略":["战略","Strategy"],"球感":["球感","Ball sense"],"進化":["进化","Evolution"],"協調":["协调","Coordination"],"サーブ":["发球","Serve"],"ストローク":["击球","Stroke"],"ボレー":["截击","Volley"],"スライス":["切削","Slice"],"スピン":["旋转","Spin"],"ショップへ":["前往商店","Go to shop"]};
const terms=Object.entries(dict).sort((a,b)=>b[0].length-a[0].length);
const cache=new WeakMap();
let queued=false,working=false;
const index=()=>document.documentElement.lang==='en'?1:document.documentElement.lang.startsWith('zh')?0:-1;
function restore(text){
 let out=text;
 for(const [jp,versions] of terms)
  for(const t of versions)if(t&&t!==jp)out=out.split(t).join(jp);
 return out;
}
function translate(text,lang){
 const base=restore(text);
 if(lang<0)return base;
 let out=base;
 for(const [jp,versions] of terms)out=out.split(jp).join(versions[lang]);
 return out;
}
function localize(){
 if(working||!document.body)return;
 working=true;
 try{
  const lang=index();
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
   const p=node.parentElement;
   if(!p||!node.nodeValue.trim()||p.closest('script,style,textarea,[contenteditable],.tl-post-body,.hk-story,.vdate-memory,[data-user-content]'))continue;
   let entry=cache.get(node);
   if(!entry||node.nodeValue!==entry.last)entry={base:restore(node.nodeValue),last:node.nodeValue};
   const output=translate(entry.base,lang);
   if(node.nodeValue!==output)node.nodeValue=output;
   entry.last=output;cache.set(node,entry);
  }
  for(const el of document.querySelectorAll('[title],[aria-label]')){
   if(el.closest('.tl-post-body,.hk-story,[data-user-content]'))continue;
   for(const attr of ['title','aria-label']){
    const val=el.getAttribute(attr);
    if(val===null)continue;
    const result=translate(val,lang);
    if(result!==val)el.setAttribute(attr,result);
   }
  }
 }finally{working=false}
}
function schedule(){
 if(queued)return;
 queued=true;
 queueMicrotask(()=>{queued=false;localize();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{localize();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});});
else{localize();new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-basic-language]'))queueMicrotask(schedule)},true);
window.HimeLocalization={apply:localize};
})();
