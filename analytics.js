import {SessionMeter,releaseChannel,classifySession} from './analytics-core.js';
import {analyticsSettings} from './analytics-settings.js';

const allowed=new Set(['page_view','game_loaded','game_start','campaign_selected','country_selected','difficulty_selected','tutorial_started','tutorial_completed','tutorial_skipped','turn_advanced','army_order_issued','battle_completed','diplomatic_action','official_appointed','trade_completed','game_saved','campaign_victory','campaign_defeat','game_session_summary']);
const humanActions=new Set(['game_start','turn_advanced','army_order_issued','diplomatic_action','official_appointed','trade_completed','game_saved']);
const allowedContext=new Set(['campaign','civilization','difficulty','tutorial_state']);
const clampText=value=>String(value??'').replace(/[^a-zA-Z0-9_.:-]/g,'').slice(0,40);
const validGa=id=>/^G-[A-Z0-9]{5,20}$/.test(id||'');
const browser=typeof window!=='undefined'&&typeof document!=='undefined';
const noop={track(){},setContext(){},setGameRunning(){},snapshot(){return null},openPrivacy(){}};

function createBrowserAnalytics(){
 const poki=!!window.PokiSDK||/(^|\.)poki\.(com|net)$/i.test(location.hostname);
 const channel=releaseChannel(location.hostname,location.pathname,poki,analyticsSettings.hostnames);
 const testMode=!!window.__SPQR_TEST_MODE||channel==='local_preview';
 const measurementId=analyticsSettings.ga4?.[channel]||'';
 const endpoint=typeof analyticsSettings.sessionEndpoint==='string'&&/^https:\/\//.test(analyticsSettings.sessionEndpoint)?analyticsSettings.sessionEndpoint:'';
 const collectable=!testMode&&!poki&&['production','staging'].includes(channel);
 const hasSink=collectable&&(validGa(measurementId)||!!endpoint);
 const meter=new SessionMeter({visible:!document.hidden,focused:document.hasFocus()});
 const id=globalThis.crypto?.randomUUID?.()||null;
 const context={campaign:'',civilization:'',difficulty:'',tutorial_state:''};
 let releaseVersion='unversioned',consent='unset',baseline={pageMs:0,foregroundMs:0,activeMs:0,actions:0};
 let pageViewSent=false,gaReady=false,sequence=0,events=[],lastCheckpointAt=0,lastCheckpointActions=0,lastCheckpointActive=0;
 let gameStarted=false,tutorialCompleted=false,turns=0,ended=false,lastGaEvent=new Map(),privacyDialog=null;
 const gpc=!!navigator.globalPrivacyControl||navigator.doNotTrack==='1';
 try{const stored=localStorage.getItem(analyticsSettings.consentStorageKey);if(stored==='yes'||stored==='no')consent=stored}catch{}
 if(gpc)consent='no';

 function relativeRelease(){return /\/(?:map-lab|han)\/(?:index\.html)?$/.test(location.pathname)?'../release.json':'./release.json'}
 fetch(new URL(relativeRelease(),location.href),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(data&&typeof data==='object')releaseVersion=clampText(data.version||data.gameVersion)||releaseVersion}).catch(()=>{});
 function outbound(){const snap=meter.snapshot();return {pageMs:Math.max(0,snap.pageMs-baseline.pageMs),foregroundMs:Math.max(0,snap.foregroundMs-baseline.foregroundMs),activeMs:Math.max(0,snap.activeMs-baseline.activeMs),actions:Math.max(0,snap.actions-baseline.actions)}}
 function gaEvent(name,params={}){
  if(!gaReady||consent!=='yes')return;
  const now=performance.now(),last=lastGaEvent.get(name)||-Infinity;
  if(name==='turn_advanced'&&now-last<5000)return;
  lastGaEvent.set(name,now);
  try{window.gtag('event',name,{build_channel:channel,release_version:releaseVersion,...params})}catch{}
 }
 function activateGa(){
  if(gaReady||!collectable||!validGa(measurementId)||consent!=='yes')return;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  window.gtag('consent','update',{analytics_storage:'granted'});
  window.gtag('js',new Date());
  window.gtag('config',measurementId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
  const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(measurementId);document.head.append(script);
  gaReady=true;
 }
 function pageView(){if(pageViewSent||consent!=='yes')return;pageViewSent=true;gaEvent('page_view',{page_path:location.pathname});events.push({name:'page_view',params:{}})}
 function checkpoint(force=false,beacon=false){
  if(!endpoint||consent!=='yes'||!collectable||!id)return;
  const totals=outbound(),now=performance.now();
  if(!force&&(totals.actions-lastCheckpointActions<5&&totals.activeMs-lastCheckpointActive<30000))return;
  if(!force&&now-lastCheckpointAt<15000)return;
  const body=JSON.stringify({sessionId:id,sequence:++sequence,channel,releaseVersion,context,totals,gameStarted,tutorialCompleted,turns,events:events.splice(0,16),clientSignals:navigator.webdriver?['webdriver']:[],ended:!!beacon});
  lastCheckpointAt=now;lastCheckpointActions=totals.actions;lastCheckpointActive=totals.activeMs;
  if(beacon&&navigator.sendBeacon){try{if(navigator.sendBeacon(endpoint,new Blob([body],{type:'application/json'})))return}catch{}}
  try{fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',keepalive:beacon,headers:{'Content-Type':'application/json'},body}).catch(()=>{})}catch{}
 }
 function track(name,params={},options={}){
  if(!allowed.has(name)||ended)return;
  const human=options.humanAction??humanActions.has(name);
  if(human)meter.activity();
  if(name==='game_start')gameStarted=true;
  if(name==='tutorial_completed')tutorialCompleted=true;
  if(name==='turn_advanced')turns++;
  const safe={};for(const [key,value] of Object.entries(params||{}))if(allowedContext.has(key))safe[key]=clampText(value);
  if(consent==='yes'&&collectable){
   gaEvent(name,safe);
   if(name!=='page_view'&&name!=='game_session_summary')events.push({name,params:safe});
   if(events.length>16)events=events.slice(-16);
   checkpoint(name==='game_start'||name==='campaign_victory'||name==='campaign_defeat');
  }
 }
 function setContext(patch){for(const [key,value] of Object.entries(patch||{}))if(allowedContext.has(key))context[key]=clampText(value)}
 function setGameRunning(value){meter.setRunning(value)}
 function consentChoice(value){
  if(gpc&&value==='yes')return;
  consent=value;
  try{localStorage.setItem(analyticsSettings.consentStorageKey,value)}catch{}
  if(value==='yes'){baseline=meter.snapshot();events=[];lastCheckpointActions=0;lastCheckpointActive=0;activateGa();pageView();checkpoint(true)}
  else{events=[];if(gaReady){window.gtag?.('consent','update',{analytics_storage:'denied'});window['ga-disable-'+measurementId]=true}}
  privacyDialog?.close();renderPrivacyButton();
 }
 function openPrivacy(){
  if(!privacyDialog){privacyDialog=document.createElement('dialog');privacyDialog.className='spqr-analytics-privacy';document.body.append(privacyDialog)}
  privacyDialog.replaceChildren();
  const zh=document.documentElement.lang.toLowerCase().startsWith('zh');
  const h=document.createElement('h2');h.textContent=zh?'匿名游戏统计':'Anonymous game analytics';
  const p=document.createElement('p');p.textContent=hasSink?(zh?'仅统计游戏操作与三种时长；不发送姓名、存档或信件内容。可随时关闭。':'Only game actions and three time measures are sent. Names, saves and letter contents are excluded. You can opt out anytime.'):(zh?'分析服务尚未配置；本页只在浏览器内计时，不发送行为统计。':'Analytics is not configured; timing stays in this browser and gameplay events are not sent.');
  const state=document.createElement('p');state.textContent=zh?'当前选择：'+(consent==='yes'?'允许':'不允许'):'Current choice: '+(consent==='yes'?'allowed':'not allowed');
  const allow=document.createElement('button');allow.type='button';allow.textContent=zh?'允许匿名统计':'Allow anonymous analytics';allow.disabled=!hasSink||gpc;allow.onclick=()=>consentChoice('yes');
  const deny=document.createElement('button');deny.type='button';deny.textContent=zh?'关闭统计':'Turn off analytics';deny.onclick=()=>consentChoice('no');
  const close=document.createElement('button');close.type='button';close.textContent=zh?'关闭':'Close';close.onclick=()=>privacyDialog.close();
  privacyDialog.append(h,p,state,allow,deny,close);privacyDialog.showModal();
 }
 let privacyButton;
 function renderPrivacyButton(){if(!hasSink||consent!=='unset'||gpc){privacyButton?.remove();return}if(privacyButton)return;privacyButton=document.createElement('button');privacyButton.type='button';privacyButton.className='spqr-analytics-prompt';privacyButton.textContent=document.documentElement.lang.toLowerCase().startsWith('zh')?'是否允许匿名游戏统计？ 选择':'Allow anonymous gameplay analytics? Choose';privacyButton.onclick=()=>{privacyButton.remove();openPrivacy()};document.body.append(privacyButton)}
 const css=document.createElement('style');css.textContent='.spqr-analytics-prompt{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9500;max-width:calc(100vw - 24px);border:1px solid #a68e60;background:#1b2525;color:#ecdcb7;padding:8px 12px;font:13px Georgia,serif;cursor:pointer;box-shadow:0 3px 16px #0008}.spqr-analytics-privacy{max-width:min(480px,calc(100vw - 28px));border:1px solid #a68e60;background:#192322;color:#efe2c6;padding:20px;font:15px/1.5 Georgia,serif}.spqr-analytics-privacy::backdrop{background:#080d0dc9}.spqr-analytics-privacy button{margin:6px 6px 0 0;border:1px solid #a68e60;background:#2b3734;color:#efe2c6;padding:6px 9px;cursor:pointer}.spqr-analytics-privacy button:disabled{opacity:.5;cursor:not-allowed}';document.head.append(css);
 window.addEventListener('spqr:privacy',openPrivacy);
 window.addEventListener('focus',()=>meter.setForeground(!document.hidden,true));
 window.addEventListener('blur',()=>meter.setForeground(!document.hidden,false));
 document.addEventListener('visibilitychange',()=>{meter.setForeground(!document.hidden,document.hasFocus());if(document.hidden)checkpoint(true)});
 for(const kind of ['pointerdown','keydown','touchstart'])document.addEventListener(kind,e=>{if(e.isTrusted&&meter.running&&e.target?.closest?.('#app,#map,#inspector,.selection,.brief'))meter.touch()},{passive:true});
 window.addEventListener('pagehide',()=>{if(ended)return;const totals=outbound();gaEvent('game_session_summary',{page_lifetime_seconds:Math.round(totals.pageMs/1000),foreground_seconds:Math.round(totals.foregroundMs/1000),active_gameplay_seconds:Math.round(totals.activeMs/1000),game_actions:totals.actions});checkpoint(true,true);ended=true});
 setInterval(()=>{meter.flush();checkpoint()},5000);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderPrivacyButton,{once:true});else renderPrivacyButton();
 return {track,setContext,setGameRunning,openPrivacy,snapshot:()=>({channel,version:releaseVersion,consent,totals:outbound(),gameStarted,tutorialCompleted,turns,classification:classifySession({knownTest:!!window.__SPQR_TEST_MODE,activeMs:meter.snapshot().activeMs,actions:meter.actions,signals:navigator.webdriver?['webdriver']:[]})})};
}

export const analytics=browser?createBrowserAnalytics():noop;

