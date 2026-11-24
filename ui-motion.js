// IMPERIUM VISUAL — entrance motion. The campaign view is rebuilt on every state change, so a
// plain CSS animation would replay each month. This marks a surface with `iv-enter` only on
// the render in which it first appears. Presentation only: it reads the DOM, never game state.
let shown=new Set();
const SURFACES=[['setup','.setup-panel'],['mail','.mailbox'],['focus','.imp-focus-screen'],['drawer','.imp-drawer'],['guide','.experience-dialog']];
export function playEntrances({panelKey='',toastKey=''}={}){
 if(typeof document==='undefined')return;
 const present=new Set();
 const mark=(key,selector)=>{const el=document.querySelector(selector);if(!el)return;present.add(key);if(!shown.has(key))el.classList.add('iv-enter')};
 for(const [key,selector] of SURFACES)mark(key,selector);
 if(panelKey)mark('panel:'+panelKey,'.inspector:not(.closed)');
 if(toastKey)mark('toast:'+toastKey,'.toast');
 shown=present;
}
