import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
try{
 for(const view of ['campaign','atlas']){
  const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.evaluate(async(target)=>{localStorage.setItem('spqr-lang','zh');const {newGame}=await import('/engine.js?v=finance-history-merge-1'),{proposeAgreement}=await import('/agreements.js?v=agreement-courier-1'),{observeDiplomacy}=await import('/diplomatic-knowledge.js?v=diplomatic-chronicle-1');const s=newGame('caesar');s.wars.push(['caesar','parthia']);s.factions.caesar.treasury=100;s.relations['caesar:egypt']=60;proposeAgreement(s,'egypt','caesar','trade');observeDiplomacy(s);sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target,state:s}))},view);
  if(view==='campaign'){await page.goto('http://127.0.0.1:5173/#government',{waitUntil:'domcontentloaded'});await page.reload({waitUntil:'domcontentloaded'});}else{await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click()}
  const aid=page.locator('.strategic-aid');await aid.waitFor({timeout:5000});await aid.locator('[data-aid-recipient]').selectOption('egypt');await aid.locator('[data-aid-target]').selectOption('parthia');await aid.locator('[data-aid-send]').click();assert.match(await aid.innerText(),/确认寄信/);await aid.locator('[data-aid-target]').selectOption('parthia');assert.match(await aid.innerText(),/请求物资 · 5国库/);await aid.locator('[data-aid-send]').click();await aid.locator('[data-aid-send]').click();assert.match(await page.locator('.strategic-aid').innerText(),/等待答复/);
  assert.deepEqual(errors,[]);console.log(view+' player aid request sent in browser');await page.close();
 }
}finally{await browser.close()}



