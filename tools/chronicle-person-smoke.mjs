import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto(process.env.SPQR_TEST_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=gathering-delegate-1'),s=newGame('caesar'),base=s.world.characters.caesar;
  for(let i=0;i<105;i++){const id=`fictional:${1000+i}`,name=[`Chronicle Test ${i}`,`史录测试${i}`];s.world.dynasties.catalog[id]={name,birth:[-75,-75],faction:'caesar',role:['Simulated','模拟'],culture:['Simulated','模拟'],fictional:true};s.world.characters[id]={...JSON.parse(JSON.stringify(base)),id,birthYear:-75,parents:[],adoptiveParents:[],children:[]};s.world.dynasties.lives[id]=[]}
  s.chronicle.entries.unshift({id:987654,year:s.year,month:s.month,kind:'character',faction:'caesar',characterId:'fictional:1104',personName:['Chronicle Test 104','史录测试104'],en:'Family event',zh:'家族事件',priority:'routine'});
  s.chronicle.entries.unshift({id:987655,year:s.year,month:s.month,kind:'dispatch',faction:'caesar',characterId:'cleopatra',en:'Reported diplomatic contact',zh:'已报告的外交接触',priority:'routine'});
  s.world.characters.cleopatra.health='dying';
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.reload();await page.locator('[data-tab="chronicle"]').click();await page.locator('[data-view-character="fictional:1104"]').click();
 assert.match(await page.locator('.gene-detail').innerText(),/史录测试104/);assert.match(await page.locator('.gene-pages').innerText(),/101/);
 await page.locator('[data-tab="chronicle"]').click();await page.locator('[data-view-character="cleopatra"]').click();await page.waitForURL('**/map-lab/**');
 await page.locator('#command-detail').getByText('克娄巴特拉七世').first().waitFor();const detail=await page.locator('#command-detail').innerText();assert.match(detail,/未知/);assert.doesNotMatch(detail,/垂危/);
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=gathering-delegate-1'),s=newGame('caesar');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.goto(new URL('/map-lab/#person=cleopatra',page.url()).href,{waitUntil:'domcontentloaded'});await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!location.hash);
 assert.doesNotMatch(await page.locator('#command-detail').innerText(),/克娄巴特拉七世/);assert.deepEqual(errors,[]);
 console.log('Chronicle opens paginated own records and knowledge-limited foreign dossiers.');
}finally{await browser.close()}
