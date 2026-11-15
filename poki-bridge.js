// Poki-only entry script. Public GitHub Pages does not load this module.
const sdk=globalThis.PokiSDK;
if(sdk){
  let active=false,everStarted=false,busy=false,ended=false,loadingSent=false;
  const ready=Promise.resolve().then(()=>sdk.init()).catch(()=>{});
  const safe=name=>{try{sdk[name]?.()}catch(error){console.warn('Poki event failed',name,error)}};
  const loaded=()=>{if(loadingSent||!(document.querySelector('#app')?.children.length||document.querySelector('#map')))return;loadingSent=true;ready.then(()=>safe('gameLoadingFinished'))};
  new MutationObserver(()=>{loaded();const now=!!document.querySelector('.victory-progress.defeat,.victory');if(now&&!ended){ended=true;stop()}else if(!now)ended=false}).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loaded,{once:true});else loaded();
  function stop(){if(!active)return;active=false;ready.then(()=>safe('gameplayStop'))}
  async function resume(){
    if(active||busy)return;
    busy=true;
    await ready;
    if(everStarted){
      try{await sdk.commercialBreak?.()}catch(error){console.warn('Poki break failed',error)}
    }
    active=true;everStarted=true;busy=false;safe('gameplayStart');
  }
  document.addEventListener('click',event=>{
    if(busy){event.preventDefault();event.stopImmediatePropagation();return}
    const target=event.target.closest('button,a,[data-army],[data-region],[data-tab]');
    if(!target)return;
    if(target.closest('#new')){stop();return}
    if(target.closest('#start-campaign,#close-setup,#start-game,#start-free,#begin')){void resume();return}
    if(target.closest('#play,#play-time')){
      const label=target.textContent.trim().toLowerCase();
      if(/pause|暂停/.test(label)){stop();return}
      if(!document.querySelector('.setup-backdrop,#start-overlay:not([hidden])'))void resume();
      return;
    }
    if(target instanceof HTMLAnchorElement&&/^https?:/.test(target.href)){
      event.preventDefault();sdk.openExternalLink?.(target.href);return;
    }
    if(!document.querySelector('.setup-backdrop,#start-overlay:not([hidden])'))void resume();
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  for(const type of ['pointerdown','keydown','touchstart'])document.addEventListener(type,event=>{if(busy){event.preventDefault();event.stopImmediatePropagation()}},true);
  document.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp',' '].includes(event.key))event.preventDefault()});
  document.addEventListener('wheel',event=>event.preventDefault(),{passive:false});
}
