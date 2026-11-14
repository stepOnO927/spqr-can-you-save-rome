import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=coalition-courier-1'),s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;s.world.diplomaticKnowledge.caesar={egypt:{id:'egypt',kind:'agreement',status:'active',parties:['caesar','egypt'],year:s.year,month:s.month},numidia:{id:'numidia',kind:'agreement',status:'active',parties:['caesar','numidia'],year:s.year,month:s.month}};sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))});
 await page.reload();await page.locator('[data-tab="government"]').click();await page.locator('#coalition-first').selectOption('egypt');await page.locator('#coalition-second').selectOption('numidia');await page.locator('#coalition-threat').selectOption('senate');
 assert.match(await page.locator('#coalition-propose').locator('..').innerText(),/花费3国库.*4个月/);
 await page.locator('#coalition-propose').click();assert.match(await page.locator('#coalition-propose').locator('..').innerText(),/等待回信/);
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.world.coalitionInvitations[0].status,'pending');assert.equal((saved.coalitions||[]).length,0);
 await page.locator('#new').click();await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="government"]').click();assert.match(await page.locator('#coalition-propose').locator('..').innerText(),/等待回信/);assert.deepEqual(errors,[]);
 console.log('Coalition invitations show travel and cost, and pending requests survive saving.');
}finally{await browser.close()}
