import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.locator('.setup-advanced').evaluate(el=>el.open=true);
 await page.locator('#campaign-guide').uncheck();
 await page.locator('#start-campaign').click();
 await page.locator('#new').click();
 await page.locator('[data-slot="save"]').click();
 const lost=await page.evaluate(()=>{
  const key='spqr-save-1',s=JSON.parse(localStorage.getItem(key));
  const theater=s.regions.find(r=>r.owner===s.player&&r.id!=='roma');
  theater.owner='senate';
  s.chronicle.entries.unshift({id:s.chronicle.nextId++,kind:'territory',faction:s.player,region:theater.id,place:theater.name,previous:s.player,current:'senate',year:s.year,month:s.month});
  s.chronicle.entries.unshift({id:s.chronicle.nextId++,kind:'intelligence',region:'egypt',place:['Secret foreign control','秘密外国控制'],year:s.year,month:s.month});
  localStorage.setItem(key,JSON.stringify(s));
  return theater.name[0];
 });
 await page.locator('#new').click();
 await page.locator('[data-slot="load"]').click();
 assert.match(await page.locator('.territory-loss-alert').innerText(),/TERRITORY LOST/);
 assert.match(await page.locator('.territory-loss-alert').innerText(),new RegExp(lost));
 assert.doesNotMatch(await page.locator('.territory-loss-alert').innerText(),/Secret foreign control/);
 await page.locator('#lang').click();
 assert.match(await page.locator('.territory-loss-alert').innerText(),/失地警报/);
 await page.locator('#lang').click();
 await page.locator('[data-loss-region]').click();
 assert.match(await page.locator('.region-title').innerText(),new RegExp(lost));
 await page.locator('#open-atlas').click();
 await page.waitForURL('**/map-lab/');
 assert.match(await page.locator('#territory-alerts').innerText(),/TERRITORY LOST/);
 assert.match(await page.locator('#territory-alerts').innerText(),new RegExp(lost));
 await page.locator('#territory-alerts [data-loss-region]').click();
 assert.match(await page.locator('#selection-title').innerText(),new RegExp(lost));
 assert.deepEqual(errors,[]);
 console.log('Recent confirmed territory loss persists in both Roman views, stays bilingual, and opens its theater.');
}finally{await browser.close()}
