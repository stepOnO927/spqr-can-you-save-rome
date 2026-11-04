// Capture a best-effort image even if an external map tile never settles.
export function waitForMapIdle(map,timeoutMs=8000){
 return new Promise(resolve=>{
  let finished=false;
  function finish(ready){if(finished)return;finished=true;clearTimeout(timer);map.off('idle',onIdle);resolve(ready)}
  function onIdle(){finish(true)}
  const timer=setTimeout(()=>finish(false),timeoutMs);
  map.once('idle',onIdle);map.triggerRepaint();
 });
}

