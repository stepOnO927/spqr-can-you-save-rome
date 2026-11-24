import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),errors=[];
const cases=[
 {type:'defensive',provider:'egypt',recipient:'parthia',joined:true},
 {type:'offensive',provider:'egypt',recipient:'parthia',joined:false},
 {type:'guarantee',provider:'parthia',recipient:'egypt',joined:true},
 {type:'guarantee',provider:'egypt',recipient:'parthia',joined:false},
 {type:'offensive',provider:'caesar',recipient:'armenia',support:true}
];
try{
 for(const scenario of cases){
  const page=await browser.newPage({viewport:{width:1600,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.evaluate(async({type,provider,recipient})=>{
   const {newGame}=await import('/engine.js?v=dossier-archive-1');
   const {proposeAgreement}=await import('/agreements.js?v=dossier-archive-1');
   const s=newGame('caesar');s.wars=[];s.alliances=[];
   s.relations[[provider,recipient].sort().join(':')]=60;
   assertTreaty(proposeAgreement(s,provider,recipient,type,{secret:provider!=='caesar'}));
   function assertTreaty(result){if(!result.ok)throw Error(`Fixture treaty failed: ${result.reason}`)}
   sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
  },scenario);
  await page.reload();await page.locator('[data-tab="government"]').click();
  await page.locator('[data-dip="egypt"][data-act="war"]').click();
  await page.locator('#new').click();await page.locator('[data-slot="save"]').click();
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  const war=(a,b)=>s.wars.some(w=>w.includes(a)&&w.includes(b));
  assert.ok(war('caesar','egypt'));
  if(scenario.support)assert.ok(war('armenia','egypt'));
  else assert.equal(war('caesar','parthia'),scenario.joined);
  await page.locator('[data-tab="chronicle"]').click();
  const text=await page.locator('#chronicle-root').innerText();
  if(scenario.joined)assert.match(text,/条约义务使本方与.*进入战争/);
  else assert.doesNotMatch(text,/条约义务使本方与.*进入战争/);
  await page.locator('#new').click();await page.locator('[data-slot="load"]').click();
  await page.locator('#new').click();await page.locator('[data-slot="save"]').click();
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  assert.deepEqual(restored.wars,s.wars);
  assert.equal(restored.agreements.find(t=>t.type===scenario.type).terms?.recipient,scenario.type==='guarantee'?scenario.recipient:undefined);
  console.log(`TREATY_WAR_EFFECT ${scenario.type} ${scenario.provider}->${scenario.recipient}: player declaration, obligations, chronicle and save/load verified`);
  await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close()}
