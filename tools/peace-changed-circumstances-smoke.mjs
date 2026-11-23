import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const e=await import('/engine.js?v=dossier-archive-1'),s=e.newGame('caesar');if(!e.sendInquiry(s,'caesar','senate','peace').ok)throw Error('Cannot send peace inquiry');
  s.inquiries[0].remaining=1;s.inquiries[0].sealed={status:'answered',year:s.year,month:s.month,claim:['Peace accepted; the war has ended.','议和获接受；战争结束。']};s.wars=[];
  let seed=null;for(let i=1;i<100;i++){const trial=e.upgradeSave(JSON.parse(JSON.stringify(s)));trial.seed=i*100000+17;e.tick(trial);if(trial.inquiries.find(x=>x.actor==='caesar'&&x.target==='senate'&&x.subject==='peace')?.status==='answered'){seed=i*100000+17;break}}if(seed===null)throw Error('No reproducible delivered reply');
  s.seed=seed;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.reload();await page.locator('#step').click();await page.locator('#mail-open').click();await page.locator('[data-mail-select]').filter({hasText:'议和回信已送达'}).click();
 const text=await page.locator('.mail-letter').innerText();assert.match(text,/接受议和提议/);assert.match(text,/回信已送达.*未能生效/);assert.doesNotMatch(text,/战争结束/);
 await page.locator('#mail-close').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1'))),inquiry=saved.inquiries.find(x=>x.actor==='caesar'&&x.target==='senate'&&x.subject==='peace');assert.equal(inquiry.status,'answered');assert.equal(inquiry.peaceSettlement,'not_concluded');assert.deepEqual(errors,[]);
 console.log('A delivered peace acceptance and a failed settlement are shown separately and saved.');
}finally{await browser.close()}
