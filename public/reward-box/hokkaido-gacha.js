/* 北海道貯金専用ガチャ。既存のごほうびガチャとは資源・抽選履歴を分離する。 */
(function () {
  'use strict';
  const GOAL = 150000, JEWEL_YEN = 10, PULL_COST = 100;
  const RARITIES = ['MR','UR','SSR','SR','R','N'];
  const PROBS = {MR:0.006, UR:0.034, SSR:0.11, SR:0.25, R:0.30, N:0.30};
  const MEDALS = {MR:120, UR:50, SSR:18, SR:7, R:3, N:1};
  const COSTS = {UR:200, SSR:80, SR:30, R:12, N:5};
  const COLORS = {MR:'#db659f',UR:'#9370d4',SSR:'#d49d40',SR:'#648dc9',R:'#6b9bbb',N:'#9098a6'};
  const MAIN = [
    ['ohtori','鳳長太郎','🕊️'],['niou','仁王雅治','🦊'],
    ['shiraishi','白石蔵ノ介','🍀'],['atobe','跡部景吾','👑'],
    ['akutsu','亜久津仁','🐺'],['tezuka','手塚国光','📘'],
    ['yuushi','忍足侑士','♨️'],['yanagi','柳蓮二','📖'],
    ['oishi','大石秀一郎','☕'],['kikumaru','菊丸英二','🐈'],
    ['sanada','真田弦一郎','⚔️'],['yukimura','幸村精市','🌸']
  ];
  const EXTRA = [
    '柳生比呂士','丸井ブン太','切原赤也','越前リョーマ','海堂薫','河村隆',
    '桃城武','不二周助','乾貞治','宍戸亮','芥川慈郎','日吉若',
    '向日岳人','樺地崇弘','忍足謙也','遠山金太郎','千歳千里','財前光',
    '石田銀','一氏ユウジ','金色小春','甲斐裕次郎','木手永四郎','平古場凛',
    '知念寛','田仁志慧','橘桔平','神尾アキラ','伊武深司','観月はじめ'
  ];
  const SPECIAL = [
    ['hk-mr-ohtori','MR','ohtori','雪の降る夜、あなたと誓う','小樽運河','❄️','運河の灯りが揺れる夜。鳳はお嬢様の手を包み込み、これから先も隣にいたいと約束する。','いつかじゃなくて……これからも、ずっとあなたの隣にいたいんです。'],
    ['hk-ur-niou','UR','niou','白銀のイリュージョン','函館山','🌃','函館の夜景を前に、仁王はいつもの冗談をやめ、まっすぐお嬢様を見つめる。','今夜は変装も嘘もなしじゃ。それでも俺に惚れてくれるかの？'],
    ['hk-ur-shiraishi','UR','shiraishi','青く澄んだ恋の行方','美瑛・青い池','💠','青い池のほとり。写真を撮るはずが、白石はいつまでも姫の表情を追いかけてしまう。','景色も綺麗やけど……俺は姫のほうばっかり見てまうわ。'],
    ['hk-ur-atobe','UR','atobe','氷雪のキングダム','ニセコ','👑','雪山を望む部屋で、跡部が二人だけの贅沢な時間を用意する。','この景色も、この時間も、全部お前のためだ。'],
    ['hk-ssr-akutsu','SSR','akutsu','不器用なぬくもり','雪の帰り道','🧣','寒さに身を縮める姫に、亜久津は無言で自分のマフラーを巻く。','……風邪ひくなよ。'],
    ['hk-ssr-tezuka','SSR','tezuka','静寂を分かち合う','知床','🌲','雪原に残る二人の足跡。手塚は急がずに歩調を合わせてくれる。','この景色を、君と見られてよかった。'],
    ['hk-ssr-yuushi','SSR','yuushi','湯けむりに隠した本音','登別温泉','♨️','温泉街の夜。並んで歩くうち、忍足は茶化すのをやめて素直な気持ちをこぼす。','湯けむりのせいにしたら……この照れくささ、ばれへんかな。'],
    ['hk-ssr-yanagi','SSR','yanagi','計算外の寄り道','札幌','📚','予定表にはなかった古書店へ。柳は姫の好きな一冊を見つけて微笑む。','この寄り道は、予測以上の成果だ。'],
    ['hk-ssr-oishi','SSR','oishi','ふたりの朝ごはん','函館朝市','🦀','朝市の湯気と賑わい。大石は姫が好きそうな朝食を丁寧に選ぶ。','温かいうちに食べよう。今日は一緒にゆっくり回ろうな。'],
    ['hk-ssr-kikumaru','SSR','kikumaru','雪うさぎの大騒動','旭川','🐇','菊丸と雪うさぎを作っていたはずが、いつしか雪合戦に。','姫、こっちこっち！ もっと遊ぼうにゃ！'],
    ['hk-ssr-sanada','SSR','sanada','初めての雪遊び','富良野','⛄','真田が生真面目に雪だるまを作る姿に、姫は思わず笑ってしまう。','む……笑うでない。お前の分も作っているのだ。'],
    ['hk-ssr-yukimura','SSR','yukimura','冬に咲く花','雪の温室','🌸','外は白銀。幸村は温室の花々に囲まれて姫の手を取る。','冬でも花は咲くんだよ。君の笑顔も同じだね。']
  ];
  const SR_PLACES = [
    ['小樽ガラス工房','🫧'],['函館の坂道','🌃'],['美瑛の丘','💙'],
    ['ニセコの雪景色','🏔️'],['札幌雪まつり','⛄'],['知床の流氷','🧊'],
    ['登別温泉街','♨️'],['札幌時計台','🕰️'],['函館朝市','🦀'],
    ['旭山動物園','🐧'],['富良野の雪原','🌨️'],['冬の花畑','🌸']
  ];
  const CARDS = [];
  const byId = Object.fromEntries(MAIN.map(x=>[x[0],x]));
  const add = (id,rarity,cid,name,place,icon,story,line,theme) =>
    CARDS.push({id,rarity,cid,character:byId[cid]?.[1]||cid,name,place,icon,story,line,theme:theme||'北海道'});
  SPECIAL.forEach(([id,r,c,n,p,i,s,l])=>add(id,r,c,n,p,i,s,l));
  MAIN.forEach(([id,name],i)=>{
    const [place,icon]=SR_PLACES[i];
    add('hk-sr-'+id,'SR',id,'ふたりの北海道日記',place,icon,
      name+'と訪れた'+place+'。小さな発見を重ねながら、旅の思い出が増えていく。',
      'この景色、姫と一緒に覚えておきたいな。');
  });
  const DAILY = [['朝のひとこま','☕'],['仕事帰りの寄り道','🌆'],['お屋敷の休日','🛋️']];
  MAIN.forEach(([id,name])=>DAILY.forEach(([scene,icon],i)=>
    add('hk-r-'+id+'-'+(i+1),'R',id,scene,scene,icon,
      name+'と過ごす、何気ない日常の一場面。','今日は少し、ゆっくりしていこう。','日常')));
  MAIN.forEach(([id,name])=>
    add('hk-n-'+id,'N',id,'おはようの挨拶','お屋敷','🌤️',
      name+'がいつものように姫へ朝の挨拶をする。','おはよう、姫。','日常'));
  EXTRA.forEach((name,i)=>[['廊下ですれ違って','👋'],['ちょっとした休憩','🍵']].forEach(([scene,icon],j)=>{
    const key='extra-'+i;
    CARDS.push({id:'hk-n-'+key+'-'+j,rarity:'N',cid:key,character:name,name:scene,place:'日常',icon,story:name+'と'+scene+'のひととき。',line:'また会ったな。',theme:'日常'});
  }));
  if(CARDS.length!==132||new Set(CARDS.map(c=>c.id)).size!==132 ||
      RARITIES.some(r=>CARDS.filter(c=>c.rarity===r).length!==({MR:1,UR:3,SSR:8,SR:12,R:36,N:72}[r])))
    throw new Error('北海道ガチャのカード構成が不正です');
  const CARD_BY_ID=Object.fromEntries(CARDS.map(c=>[c.id,c]));
  const MILESTONES=[
    {at:25000,tier:'SR',name:'SR選択券'},
    {at:50000,tier:'SSR',name:'SSR選択券'},
    {at:75000,tier:'SR',name:'SR選択券'},
    {at:100000,tier:'UR',name:'UR選択券'},
    {at:125000,tier:'SSR',name:'SSR選択券'},
    {at:GOAL,tier:'MR',name:'鳳長太郎 MR'}
  ];
  const defaultHk=()=>({minted:0,draws:0,pitySSR:0,pityUR:0,collection:{},
    medals:0,tickets:{UR:0,SSR:0,SR:0},claimed:[],latest:[]});
  const validInt=(n,fall=0)=>Number.isSafeInteger(n)&&n>=0?n:fall;
  function normalise(state) {
    const old=state.hokkaidoGacha||{},hk=defaultHk();
    hk.minted=validInt(old.minted);
    hk.draws=validInt(old.draws);
    hk.pitySSR=Math.min(9,validInt(old.pitySSR));
    hk.pityUR=Math.min(39,validInt(old.pityUR));
    hk.medals=validInt(old.medals);
    hk.collection=Object.fromEntries(Object.entries(old.collection||{})
      .filter(([id,n])=>CARD_BY_ID[id]&&validInt(n)>0).map(([id,n])=>[id,n]));
    hk.tickets={UR:validInt(old.tickets?.UR),SSR:validInt(old.tickets?.SSR),SR:validInt(old.tickets?.SR)};
    hk.claimed=Array.isArray(old.claimed)?old.claimed.filter(n=>MILESTONES.some(m=>m.at===n)):[];
    hk.latest=Array.isArray(old.latest)?old.latest.filter(r=>CARD_BY_ID[r.id]).slice(0,10):[];
    state.hokkaidoGacha=hk;
    if(!Array.isArray(state.storyHistory))state.storyHistory=[];
    if(!Number.isSafeInteger(state.jewels)||state.jewels<0)state.jewels=0;
    return hk;
  }
  function grant(state,card,source) {
    const hk=state.hokkaidoGacha,prior=hk.collection[card.id]||0;
    hk.collection[card.id]=prior+1;
    const duplicate=prior>0;
    if(duplicate)hk.medals+=MEDALS[card.rarity];
    state.storyHistory.unshift({id:card.id,rarity:card.rarity,name:card.character+'｜'+card.name,
      source,duplicate,at:new Date().toISOString()});
    state.storyHistory.length=Math.min(500,state.storyHistory.length);
    return duplicate;
  }
  function credit(state) {
    if(!state.hokkaidoGacha)normalise(state);
    const hk=state.hokkaidoGacha;
    const entitlement=Math.floor(validInt(state.savings)/JEWEL_YEN);
    if(entitlement>hk.minted){state.jewels+=entitlement-hk.minted;hk.minted=entitlement;}
    // 旧データに貯金額がある場合も差額を遡及付与する
    for(const reward of MILESTONES){
      if(state.savings<reward.at||hk.claimed.includes(reward.at))continue;
      hk.claimed.push(reward.at);
      if(reward.tier==='MR')grant(state,CARD_BY_ID['hk-mr-ohtori'],'15万円達成報酬');
      else hk.tickets[reward.tier]++;
    }
  }
  function reconcile(state){normalise(state);credit(state);}
  function pickRarity(hk){
    if(hk.pityUR>=39)return 'UR';
    if(hk.pitySSR>=9)return 'SSR';
    let v=Math.random();
    for(const rarity of RARITIES){v-=PROBS[rarity];if(v<0)return rarity;}
    return 'N';
  }
  function drawOne(state) {
    const hk=state.hokkaidoGacha,rarity=pickRarity(hk);
    const pool=CARDS.filter(c=>c.rarity===rarity);
    const card=pool[Math.floor(Math.random()*pool.length)];
    hk.draws++;
    hk.pityUR=['MR','UR'].includes(rarity)?0:hk.pityUR+1;
    hk.pitySSR=['MR','UR','SSR'].includes(rarity)?0:hk.pitySSR+1;
    const duplicate=grant(state,card,'北海道ガチャ #'+hk.draws);
    return {id:card.id,duplicate,draw:hk.draws};
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function imageCard(card,owned,extra=''){
    return `<div class="hk-card ${card.rarity} ${owned?'owned':'locked'}" ${extra}>
      <div class="hk-card-sky"><span>${card.icon}</span></div>
      <div class="hk-card-body"><span class="hk-rank">${card.rarity}</span>
      <b>${escapeHtml(owned?card.character:'？？？')}</b>
      <small>${escapeHtml(owned?card.name:'未入手')}</small></div></div>`;
  }
  let api=null,rarityFilter='ALL',exchangeMode='medals',storyCard=null;
  function sortedSelectable(state) {
    const hk=state.hokkaidoGacha;
    const desired=exchangeMode==='medals'?Object.keys(COSTS):[exchangeMode];
    return CARDS.filter(c=>desired.includes(c.rarity)&&!hk.collection[c.id]);
  }
  function render(state) {
    const root=document.getElementById('hkg-root'),exRoot=document.getElementById('hkg-exchange-root');
    if(!root)return;
    const hk=state.hokkaidoGacha;
    const unique=Object.keys(hk.collection).filter(id=>hk.collection[id]>0).length;
    const selected=storyCard&&CARD_BY_ID[storyCard]&&hk.collection[storyCard]?CARD_BY_ID[storyCard]:null;
    root.innerHTML=`
      <div class="heading"><div><h2>✈️ 北海道ロマン</h2><p class="minor">全132種の北海道カード</p></div><span class="badge">貯金連動</span></div>
      <div class="hk-hero"><div class="hk-hero-scene">🏔️ <span>HOKKAIDO</span> ❄️</div>
      <div class="hk-hero-stats"><div><small>北海道ジュエル</small><b>💠 ${state.jewels.toLocaleString('ja-JP')}</b></div>
      <div><small>カード収集</small><b>${unique} / 132</b></div>
      <div><small>累計抽選</small><b>${hk.draws}回</b></div></div></div>
      <div class="hk-actionrow">
      <button class="btn secondary" type="button" data-hk-draw="1" ${state.jewels<100?'disabled':''}>1回 <small>💠100</small></button>
      <button class="btn" type="button" data-hk-draw="10" ${state.jewels<1000?'disabled':''}>10連 <small>💠1,000</small></button></div>
      <div class="gacha-actions"><button type="button" class="ghost-link" data-page="hk-exchange">引換所</button>
      <button type="button" class="ghost-link" data-page="story-history">抽選履歴</button></div>`;
    if(exRoot)exRoot.innerHTML=`
      <div class="hk-exchange-assets"><div class="hk-asset"><small>交換メダル</small><b>🪙 ${hk.medals}</b></div>
      ${['UR','SSR','SR'].map(r=>`<div class="hk-asset"><small>${r}選択券</small><b>🎟️ ${hk.tickets[r]}</b></div>`).join('')}</div>
      <div class="hk-exchange-controls"><label>交換方法<select id="hk-exchange-mode">
       ${[['medals','メダル交換'],['UR','UR選択券'],['SSR','SSR選択券'],['SR','SR選択券']].map(([k,n])=>`<option value="${k}" ${exchangeMode===k?'selected':''}>${n}</option>`).join('')}
      </select></label></div>
      <p class="minor">未所持カードを交換できます。MRは抽選または15万円貯金達成で入手します。</p>
      <div class="hk-section-title"><b>📚 カード図鑑</b><small>${unique}/132 収集</small></div>
      <div class="hk-filter">${['ALL',...RARITIES].map(r=>`<button type="button" class="${rarityFilter===r?'active':''}" data-hk-filter="${r}">${r==='ALL'?'全132種':r} ${r==='ALL'?'':hkCount(state,r)+'/'}${r==='ALL'?'':CARDS.filter(c=>c.rarity===r).length}</button>`).join('')}</div>
      <div class="hk-catalog">${CARDS.filter(c=>rarityFilter==='ALL'||c.rarity===rarityFilter).map(c=>{
        const owned=Boolean(hk.collection[c.id]),cost=exchangeMode==='medals'?COSTS[c.rarity]:c.rarity===exchangeMode?1:null;
        const balance=exchangeMode==='medals'?hk.medals:hk.tickets[exchangeMode];
        const allowed=!owned&&cost!==undefined&&cost!==null&&balance>=cost;
        return `<div class="hk-catalog-item">
          <button type="button" class="hk-card-button" data-hk-story="${c.id}" ${owned?'':'disabled'}>${imageCard(c,owned)}
          <small>所持 ${hk.collection[c.id]||0}枚 · ${owned?'取得済':'未所持'}</small></button>
          ${!owned&&cost!==undefined&&cost!==null?`<button type="button" class="btn secondary hk-redeem-button" data-hk-exchange="${c.id}" ${allowed?'':'disabled'}>交換 ${exchangeMode==='medals'?'🪙'+cost:'🎟️1枚'}</button>`:`<small class="hk-unavailable">${owned?'取得済み':'交換不可'}</small>`}
        </div>`;
      }).join('')}</div>
      ${selected?`<div class="hk-story" role="region" aria-label="カードストーリー"><button type="button" data-hk-close aria-label="閉じる">×</button>
        <span class="hk-rank" style="color:${COLORS[selected.rarity]}">${selected.rarity} · ${escapeHtml(selected.place)}</span>
        <h3>${escapeHtml(selected.character)}｜${escapeHtml(selected.name)}</h3><p>${escapeHtml(selected.story)}</p>
        <blockquote>「${escapeHtml(selected.line)}」</blockquote></div>`:''}
      <div class="hk-section-title"><b>🎟️ 貯金達成報酬</b><small>${hk.claimed.length}/6 達成</small></div>
      <div class="hk-milestones">${MILESTONES.map(r=>`<div class="hk-milestone ${hk.claimed.includes(r.at)?'done':''}">
        <span>${r.at.toLocaleString('ja-JP')}円</span><b>${r.name}</b>
        <small>${hk.claimed.includes(r.at)?'✓ 受取済':'あと '+Math.max(0,r.at-state.savings).toLocaleString('ja-JP')+'円'}</small></div>`).join('')}</div>`;
    const list=document.getElementById('story-history-list');
    if(list)list.innerHTML=state.storyHistory.length?state.storyHistory.slice(0,200).map(h=>
      `<div class="listitem"><div class="name">${escapeHtml(h.name||h.id||'カード')}</div>
        <div class="tiny dim">${escapeHtml(h.source||'獲得')}${h.duplicate?' · 重複':''} · ${escapeHtml(h.at||'')}</div></div>`).join(''):'<p class="minor">まだ抽選履歴はありません。</p>';
  }  function hkCount(state,r){return CARDS.filter(c=>c.rarity===r&&state.hokkaidoGacha.collection[c.id]).length;}
  // Commit the draw and the card inventory before playing any animation.
  // A skipped animation, page reload, or interrupted network cannot re-roll the result.
  function performDraw(count,askConfirmation=true){
    if(count!==1&&count!==10)return;
    const s=api.getState(),hk=s.hokkaidoGacha,cost=count*PULL_COST;
    if(s.jewels<cost)return api.toast('北海道ジュエルが足りません');
    if(askConfirmation&&!window.confirm('北海道ガチャを'+count+'回引きますか？（💠'+cost+'）'))return;
    s.jewels-=cost;
    const results=Array.from({length:count},()=>drawOne(s));
    hk.latest=results.slice().reverse().slice(0,10);
    api.log('hokkaido','北海道ガチャ '+count+'回','💠 −'+cost);
    api.persist();
    api.render();
    const opening=results.map(r=>({ ...CARD_BY_ID[r.id],duplicate:r.duplicate,draw:r.draw }));
    if(window.HokkaidoReveal&&typeof window.HokkaidoReveal.play==='function'){
      window.HokkaidoReveal.play(opening,{repeat:(nextCount)=>performDraw(nextCount,false)});
    }else{
      api.toast('北海道の思い出が '+count+'枚増えたよ ✈️');
    }
  }
  function bind(context){
    api=context;
    const root=document.getElementById('hkg-root'),exRoot=document.getElementById('hkg-exchange-root');
    if(!root)return;
    if(exRoot)exRoot.addEventListener('change',event=>{
      if(event.target.id==='hk-exchange-mode'){exchangeMode=event.target.value;render(api.getState());}
    });
    const click=event=>{
      const b=event.target.closest('button');if(!b)return;
      const s=api.getState(),hk=s.hokkaidoGacha;
      if(b.dataset.hkFilter){rarityFilter=b.dataset.hkFilter;render(s);return;}
      if(b.dataset.hkClose!==undefined){storyCard=null;render(s);return;}
      if(b.dataset.hkStory){
        if(!hk.collection[b.dataset.hkStory])return;
        storyCard=b.dataset.hkStory;render(s);
        exRoot?.querySelector('.hk-story')?.scrollIntoView({behavior:'smooth',block:'nearest'});return;
      }
      if(b.dataset.hkDraw){performDraw(Number(b.dataset.hkDraw));return;}
      if(b.dataset.hkExchange!==undefined){
        const card=CARD_BY_ID[b.dataset.hkExchange];
        if(!card||hk.collection[card.id])return api.toast('未所持カードを選んでね');
        if(exchangeMode==='medals'){
          const cost=COSTS[card.rarity];
          if(!cost||hk.medals<cost)return api.toast('交換メダルが足りません');
          if(!window.confirm(card.character+'｜'+card.name+'をメダル'+cost+'枚で交換しますか？'))return;
          hk.medals-=cost;
        }else{
          if(card.rarity!==exchangeMode||!hk.tickets[exchangeMode])return api.toast('選択券が足りません');
          if(!window.confirm(card.character+'｜'+card.name+'と交換しますか？'))return;
          hk.tickets[exchangeMode]--;
        }
        grant(s,card,'北海道交換所');
        storyCard=card.id;api.log('hokkaido','北海道カード交換',card.character+'｜'+card.name);
        api.persist();api.render();api.toast('カードを迎えました ♡');
      }
    };
    root.addEventListener('click',click);
    if(exRoot)exRoot.addEventListener('click',click);
  }  window.HokkaidoGacha={reconcile,credit,render,bind,CARDS,PROBS};
})();