import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,...(process.env.SPQR_BROWSER_EXECUTABLE?{executablePath:process.env.SPQR_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}/`,{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const engine=await import('/engine.js?v=archived-exchange-1');
  const {formCoalition,advanceCoalitionDefenseCalls}=await import('/coalitions.js?v=archived-exchange-1');
  const {syncCoalitionDefenseLetters}=await import('/epistulae.js?v=archived-exchange-1');
  const s=engine.newGame('caesar');
  s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
  if(!formCoalition(s,'caesar',['egypt','numidia'],'senate',engine.estimatedStrength).ok)throw Error('coalition not formed');
  s.wars=[];
  if(!engine.diplomacy(s,'senate','egypt','war'))throw Error('defense request not sent');
  if(engine.isWar(s,'caesar','senate'))throw Error('player was drawn into war before answering');
  s.month+=2;advanceCoalitionDefenseCalls(s);syncCoalitionDefenseLetters(s);
  if(!s.world.coalitionDefenseCalls.some(c=>c.member==='caesar'&&c.status==='awaiting_player'))throw Error('defense request did not arrive');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.reload();
 await page.locator('#mail-open').click();
 assert.match(await page.locator('body').innerText(),/Coalition defense request/);
 await page.locator('#mail-close').click();
 await page.locator('[data-tab="government"]').click();
 const join=page.locator('[data-coalition-defense][data-decision="accept"]');
 assert.equal(await join.count(),1);
 await join.click();assert.match(await join.innerText(),/CONFIRM JOINING WAR/);
 await join.click();
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.ok(saved.wars.some(w=>w.includes('caesar')&&w.includes('senate')));
 assert.equal(saved.world.coalitionDefenseCalls.find(c=>c.member==='caesar').status,'accepted');
 assert.equal(saved.regions.find(r=>r.id==='egypt').owner,'egypt');
 assert.deepEqual(errors,[]);
 console.log('Built campaign delivered a coalition defense letter, required an explicit player decision, and preserved sovereign ownership in the save.');
}finally{await browser.close()}
