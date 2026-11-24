import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=dossier-archive-1'),{proposeAgreement}=await import('/agreements.js?v=dossier-archive-1'),s=newGame('caesar');s.wars=[];s.relations['caesar:egypt']=60;s.factions.caesar.treasury=300;s.regions.find(r=>r.id==='syria').owner='caesar';s.armies=s.armies.filter(a=>a.region!=='syria'||a.id==='xiii');const a=s.armies.find(a=>a.id==='xiii');a.region='syria';a.move=null;a.siege=null;s.controlKnowledge.caesar.egypt={owner:'egypt',year:s.year,month:s.month};if(!proposeAgreement(s,'caesar','egypt','military_access').ok)throw Error('No access treaty');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-army="xiii"]').first().dispatchEvent('click');
 const option=page.locator('#lab-orders option[value="egypt"]');assert.equal(await option.isEnabled(),true);assert.match(await option.innerText(),/获准通行/);
 await page.locator('#lab-orders select').selectOption('egypt');await page.locator('#lab-orders button:not([data-order])').click();
 let s;
 for(let i=0;i<18;i++){
  await page.locator('#advance').click();await page.locator('#save').click();
  s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  if(s.armies.find(a=>a.id==='xiii').region==='egypt')break;
 }
 assert.equal(s.armies.find(a=>a.id==='xiii').region,'egypt');assert.equal(s.regions.find(r=>r.id==='egypt').owner,'egypt');assert.ok(!(s.battles||[]).some(b=>b.attacker.id==='xiii'));
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('spqr-save-1')),a=s.armies.find(a=>a.id==='xiii');a.region='syria';a.move=null;a.siege=null;s.agreements.find(t=>t.type==='military_access').status='breached';sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});await page.reload();await page.locator('[data-army="xiii"]').first().dispatchEvent('click');await page.locator('#lab-orders select').selectOption('egypt');assert.equal(await page.locator('#lab-orders button:not([data-order])').isDisabled(),true);assert.equal(await page.locator('#lab-orders [data-order="unauthorized_entry"]').isVisible(),true);assert.deepEqual(errors,[]);console.log('Military access permits a real march without capture; breach requires an explicit unauthorized crossing.');
}finally{await browser.close()}

