(()=>{
'use strict';
let current=null;
function close(){
 if(!current)return;
 const {host,select,previousFocus,onEscape}=current;
 document.removeEventListener('keydown',onEscape,true);
 host.remove();
 current=null;
 if(select?.isConnected){try{select.focus({preventScroll:true})}catch{}}
 else previousFocus?.focus?.();
}
function open(select){
 if(!select||select.disabled||select.multiple)return;
 if(current)close();
 const options=[...select.options].map((o,index)=>({o,index})).filter(({o})=>!o.disabled&&!o.closest('optgroup[disabled]'));
 if(!options.length)return;
 const host=document.createElement('div');host.className='ui-choice-overlay';
 const panel=document.createElement('div');panel.className='ui-choice-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const head=document.createElement('div');head.className='ui-choice-head';
 const heading=document.createElement('strong');heading.textContent=select.closest('.field, label, .basic-field')?.querySelector('label')?.textContent?.trim()||select.getAttribute('aria-label')||'選択してください';
 const dismiss=document.createElement('button');dismiss.textContent='×';dismiss.type='button';dismiss.setAttribute('aria-label','閉じる');
 head.append(heading,dismiss);panel.appendChild(head);
 const list=document.createElement('div');list.className='ui-choice-list';
 let active=null;
 for(const {o,index} of options){
  const row=document.createElement('button');row.type='button';row.className='ui-choice-row'+(index===select.selectedIndex?' chosen':'');
  row.setAttribute('role','option');row.setAttribute('aria-selected',String(index===select.selectedIndex));
  const title=document.createElement('span');title.textContent=o.label||o.textContent;
  const mark=document.createElement('span');mark.textContent=index===select.selectedIndex?'✓':'';mark.setAttribute('aria-hidden','true');
  row.append(title,mark);
  row.addEventListener('click',()=>{
   if(select.selectedIndex!==index){
    select.selectedIndex=index;
    select.dispatchEvent(new Event('input',{bubbles:true}));
    select.dispatchEvent(new Event('change',{bubbles:true}));
   }
   close();
  });
  if(index===select.selectedIndex)active=row;
  list.appendChild(row);
 }
 panel.appendChild(list);host.appendChild(panel);document.body.appendChild(host);
 host.addEventListener('click',e=>{if(e.target===host||e.target===dismiss)close()});
 const onEscape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}};
 current={host,select,previousFocus:document.activeElement,onEscape};
 document.addEventListener('keydown',onEscape,true);
 (active||list.firstElementChild)?.focus({preventScroll:true});
 active?.scrollIntoView({block:'nearest'});
}
document.addEventListener('pointerdown',event=>{
 const select=event.target.closest?.('select');
 if(!select||select.closest('.ui-choice-overlay')||event.button>0)return;
 event.preventDefault();
 open(select);
},true);
document.addEventListener('keydown',event=>{
 if(event.target?.matches('select')&&(event.key==='Enter'||event.key===' ')){
  event.preventDefault();open(event.target);
 }
},true);
window.UIChoice={open,close};
})();