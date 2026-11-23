import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 for(const discovered of [false,true]){
  await page.evaluate(async discovered=>{const {newGame}=await import('/engine.js?v=faces-name-disagreement-1'),s=newGame('caesar');s.factions.egypt_claimant={...s.factions.egypt};s.regions.find(r=>r.id==='egyptUpper').owner='egypt_claimant';s.world.leadership.egypt_claimant=['arsinoe'];s.world.characters.arsinoe.faction='egypt_claimant';if(discovered){s.knowledge.caesar.egypt_claimant={reportedLeaders:['arsinoe'],reports:[],sightings:{}};s.meetings.push({actor:'caesar',targetFaction:'egypt_claimant',person:'antony',target:'arsinoe',status:'met',year:s.year,month:s.month,contactCredit:3})}sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))},discovered);
  await page.reload();await page.locator('[data-tab="government"]').click();assert.equal(await page.locator('#agreement-target option[value="egypt_claimant"]').count(),discovered?1:0);assert.equal(await page.locator('[data-dip="egypt_claimant"]').count()>0,discovered);
  if(discovered){await page.locator('#political-contact').selectOption('egypt_claimant|arsinoe|antony');await page.locator('#political-contact-send').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(s.world.politicalContacts[0].target,'egypt_claimant');assert.equal(s.world.politicalContacts[0].remaining,4)}
 }
 assert.deepEqual(errors,[]);console.log('Only discovered rival governments enter campaign diplomacy and accept a delayed contact proposal.');
}finally{await browser.close()}
