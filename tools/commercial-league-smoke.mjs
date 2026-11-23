import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=office-intel-privacy-1'),s=newGame('caesar');
  for(const [a,b] of [['caesar','egypt'],['caesar','numidia'],['egypt','numidia']])s.relations[[a,b].sort().join(':')]=40;
  s.world.diplomaticKnowledge.caesar={egypt:{id:'egypt',kind:'agreement',status:'active',parties:['caesar','egypt'],year:s.year,month:s.month},numidia:{id:'numidia',kind:'agreement',status:'active',parties:['caesar','numidia'],year:s.year,month:s.month}};
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.reload();await page.locator('[data-tab="government"]').click();
 await page.locator('#commercial-first').selectOption('egypt');await page.locator('#commercial-second').selectOption('numidia');
 await page.locator('#commercial-name').fill('League of Three Ports');await page.locator('#commercial-propose').click();
 assert.match(await page.locator('#commercial-propose').locator('..').innerText(),/League of Three Ports.*等待回信/);
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.world.commercialLeagueOffers[0].status,'pending');assert.equal(saved.world.commercialLeagues.length,0);
 await page.locator('#new').click();await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="government"]').click();
 assert.match(await page.locator('#commercial-propose').locator('..').innerText(),/等待回信/);
 await page.evaluate(async()=>{
  const {advanceCommercialLeagueOffers}=await import('/commercial-leagues.js?v=office-intel-privacy-1');
  const s=JSON.parse(localStorage.getItem('spqr-save-1'));
  for(let i=0;i<4;i++){s.month++;advanceCommercialLeagueOffers(s,()=>.5)}
  if(!s.world.commercialLeagues.length)throw Error('League failed to form in browser setup');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof document.querySelector('#map-mode')?.onchange==='function');
 await page.locator('#map-mode').selectOption('organization');
 assert.match(await page.locator('#map-mode-details').innerText(),/League of Three Ports/);
 assert.match(await page.locator('#map-mode-details').innerText(),/公库/);
 const dissolution=page.locator('#map-mode-details [data-commercial-motion][data-motion-kind="dissolution"]');
 await dissolution.click();assert.match(await dissolution.innerText(),/确认提出解散表决/);await dissolution.click();
 assert.match(await page.locator('#map-mode-details').innerText(),/待表决/);
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=office-intel-privacy-1'),league=await import('/commercial-leagues.js?v=office-intel-privacy-1');
  const s=newGame('caesar');
  for(const [a,b] of [['caesar','egypt'],['caesar','numidia'],['egypt','numidia']])s.relations[[a,b].sort().join(':')]=40;
  s.world.diplomaticKnowledge.caesar={egypt:{kind:'agreement',status:'active',parties:['caesar','egypt']},numidia:{kind:'agreement',status:'active',parties:['caesar','numidia']}};
  if(!league.proposeCommercialLeague(s,'caesar',['egypt','numidia']).ok)throw Error('Cannot set up campaign council');
  for(let i=0;i<4;i++){s.month++;league.advanceCommercialLeagueOffers(s,()=>.5)}
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-tab="government"]').click();
 assert.match(await page.locator('[data-commercial-motion][data-motion-kind="dissolution"]').locator('..').innerText(),/成员议事/);
 const campaignDissolution=page.locator('[data-commercial-motion][data-motion-kind="dissolution"]');await campaignDissolution.click();await campaignDissolution.click();
 assert.match(await page.locator('.rule-block').filter({hasText:'成员议事'}).last().innerText(),/待表决/);
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=office-intel-privacy-1');
  const league=await import('/commercial-leagues.js?v=office-intel-privacy-1');
  const {syncCommercialLeagueLetters}=await import('/epistulae.js?v=office-intel-privacy-1');
  const s=newGame('caesar');
  for(const [a,b] of [['caesar','egypt'],['caesar','numidia'],['egypt','numidia']])s.relations[[a,b].sort().join(':')]=40;
  s.world.diplomaticKnowledge.egypt={caesar:{id:'caesar',kind:'agreement',status:'active',parties:['egypt','caesar'],year:s.year,month:s.month},numidia:{id:'numidia',kind:'agreement',status:'active',parties:['egypt','numidia'],year:s.year,month:s.month}};
  if(!league.proposeCommercialLeague(s,'egypt',['caesar','numidia']).ok)throw Error('AI league invitation failed');
  for(let i=0;i<2;i++){s.month++;league.advanceCommercialLeagueOffers(s,()=>.5)}
  syncCommercialLeagueLetters(s);
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.locator('#mail-open').click();
 const accept=page.locator('[data-mail-reply="accept_commercial_league"]');
 assert.match(await page.locator('.mail-letter').innerText(),/商业同盟邀请/);
 await accept.click();assert.match(await accept.innerText(),/确认接受/);await accept.click();
 await page.locator('#mail-close').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();
 const answered=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(answered.world.commercialLeagueOffers[0].playerDecision,'accepted');
 assert.equal(answered.world.commercialLeagues.length,0);
 assert.deepEqual(errors,[]);
 console.log('Commercial league proposal, save/load, organization map and incoming reply work in the browser.');
}finally{await browser.close()}
