// Run before the game modules: some browsers deny storage at property access.
// Volatile storage keeps the current page playable, never pretending that a
// cross-page campaign handoff can survive a reload.
(()=>{
 const unavailable=[];
 function memoryStorage(session,original){
  const values=new Map(),removed=new Set();let cleared=false;
  const oldKeys=()=>{if(!original||cleared)return [];try{return Array.from({length:original.length},(_,i)=>original.key(i)).filter(x=>x!==null)}catch{return []}};
  const keys=()=>[...new Set([...oldKeys(),...values.keys()])].filter(key=>!removed.has(key));return {
   get length(){return keys().length},key(index){return keys()[index]??null},
   getItem(key){key=String(key);if(session&&key==='spqr-view-handoff-v1')return null;if(removed.has(key))return null;if(values.has(key))return values.get(key);if(cleared||!original)return null;try{return original.getItem(key)}catch{return null}},
   setItem(key,value){key=String(key);if(session&&key==='spqr-view-handoff-v1')throw new DOMException('Campaign transfer requires session storage','SecurityError');removed.delete(key);values.set(key,String(value))},
   removeItem(key){key=String(key);values.delete(key);removed.add(key)},clear(){values.clear();removed.clear();cleared=true}
  };
 }
 for(const key of ['localStorage','sessionStorage']){
  let original=null;try{original=window[key];const probe='__spqr_probe_'+Math.random().toString(36).slice(2);original.setItem(probe,'1');original.removeItem(probe)}
  catch{try{Object.defineProperty(window,key,{configurable:true,value:memoryStorage(key==='sessionStorage',original)});unavailable.push(key)}catch{unavailable.push(key+':unavailable')}}
 }
 if(!unavailable.length)return;
 window.spqrVolatileStorage=Object.freeze([...unavailable]);
 const show=()=>{
  const notice=document.createElement('section');notice.id='storage-warning';notice.setAttribute('role','status');
  notice.innerHTML='<p></p><button type="button">OK / 知道了</button>';
  const local=unavailable.some(x=>x.startsWith('localStorage')),session=unavailable.some(x=>x.startsWith('sessionStorage'));
  notice.querySelector('p').textContent=(local?'浏览器禁止保存：本页进度仅在关闭或刷新前保留，请用“迁移存档”导出文件。 / Browser storage is unavailable: progress lasts only until this page closes or reloads; export with “Transfer saves”. ':'')+(session?'会话存储不可用，不能安全切换地图。 / Session storage is unavailable; switching maps is disabled.':'');
  Object.assign(notice.style,{position:'fixed',zIndex:'2147483646',left:'50%',top:'50%',transform:'translate(-50%,-50%)',width:'min(430px,90vw)',padding:'16px',background:'#24312d',color:'#fff3d6',border:'2px solid #c8aa68',boxShadow:'0 8px 40px #000b',font:'14px/1.5 "SPQR CJK",sans-serif'});
  notice.querySelector('button').onclick=()=>notice.remove();document.body.append(notice);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
})();
