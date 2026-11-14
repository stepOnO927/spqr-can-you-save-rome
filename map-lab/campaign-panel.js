import {HANDOFF_KEY,stageHandoff} from '../view-handoff.js?v=succession-ui-recovery-1';

export function createCampaignPanel({getState,pause,getLanguage,onError}) {
  const dialog=document.querySelector('#campaign-panel');
  const frame=document.querySelector('#campaign-panel-frame');
  const close=document.querySelector('#campaign-panel-close');
  const title=document.querySelector('#campaign-panel-title');
  const allowed=new Set(['government','focus','legions','plans','mail']);
  let ready=false;

  const report=message=>onError(message);
  const refreshLanguage=()=>{
    const zh=getLanguage()==='zh';
    title.textContent=zh?'战役事务':'CAMPAIGN AFFAIRS';
    close.textContent=zh?'返回地图':'RETURN TO MAP';
    close.setAttribute('aria-label',close.textContent);
  };

  function open(section='') {
    if(!allowed.has(section))return;
    try {
      pause();
      stageHandoff(sessionStorage,getState(),'campaign');
      ready=false;
      refreshLanguage();
      close.disabled=true;
      dialog.hidden=false;
      frame.src='../?embedded=1#'+encodeURIComponent(section);
    } catch {
      report(getLanguage()==='zh'?'无法打开战役事务；请检查浏览器存储权限。':'Could not open campaign affairs; check browser storage permissions.');
    }
  }

  function requestClose() {
    if(!ready) {
      frame.src='about:blank';
      dialog.hidden=true;
      return;
    }
    close.disabled=true;
    frame.contentWindow?.postMessage({type:'spqr:close-panel-request'},location.origin);
  }

  close.addEventListener('click',requestClose);
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
    if(event.data?.type==='spqr:panel-ready'){
      ready=true;
      close.disabled=false;
      close.focus();
    }else if(event.data?.type==='spqr:panel-return'){
      try {
        const transfer=JSON.parse(sessionStorage.getItem(HANDOFF_KEY)||'null');
        if(transfer?.target!=='atlas')throw Error('Missing campaign transfer');
        location.reload();
      }catch{
        close.disabled=false;
        report(getLanguage()==='zh'?'战役状态未能返回地图，请在事务面板保存后重试。':'Campaign state did not return to the map. Save in the panel and retry.');
      }
    }else if(event.data?.type==='spqr:panel-error'){
      close.disabled=false;
      report(getLanguage()==='zh'?'战役状态未能返回地图，请在事务面板保存后重试。':'Campaign state did not return to the map. Save in the panel and retry.');
    }
  });
  return {open,refreshLanguage};
}
