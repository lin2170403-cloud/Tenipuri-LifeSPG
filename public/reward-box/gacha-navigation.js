/* Fail-safe gacha tab navigation. Independent of reward/fortune modules. */
(()=>{
 'use strict';
 const KNOWN=new Set(['morning','reward','hokkaido']);
 function select(name){
  if(!KNOWN.has(name))return false;
  const section=document.getElementById('page-gacha');
  if(!section)return false;
  for(const button of section.querySelectorAll('[data-gacha-tab]')){
   const selected=button.dataset.gachaTab===name;
   button.classList.toggle('active',selected);
   button.setAttribute('aria-selected',String(selected));
   button.tabIndex=selected?0:-1;
  }
  for(const pane of section.querySelectorAll('[data-gacha-pane]')){
   const selected=pane.dataset.gachaPane===name;
   pane.classList.toggle('active',selected);
   pane.setAttribute('aria-hidden',String(!selected));
  }
  return true;
 }
 function initialize(){
  const section=document.getElementById('page-gacha');
  if(!section||section.dataset.hkNavReady)return;
  section.dataset.hkNavReady='true';
  // Hokkaido must remain reachable even if the morning-fortune bundle fails.
  section.addEventListener('click',event=>{
   const tab=event.target.closest?.('[data-gacha-tab]');
   if(tab&&section.contains(tab))select(tab.dataset.gachaTab);
  },true);
  select('hokkaido');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
 window.GachaNavigation={select};
})();