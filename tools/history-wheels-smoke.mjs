import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const side of ['caesar','senate']){
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.locator('.setup-panel').waitFor();
  await page.locator('.setup-advanced').evaluate(el=>el.open=true);
  await page.locator('#faction-choice').selectOption(side);
  await page.locator('#start-campaign').click();
  await page.locator('#campaign-progress').click();
  assert.equal(await page.locator('[data-ambition="economic"]').isVisible(),true);
  await page.locator('[data-ambition="economic"]').click();
  assert.match(await page.locator('.wheels-ambition').innerText(),/100/);
  await page.locator('#experience-close').click();
  await page.locator('#new').click();
  await page.locator('[data-slot="save"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  assert.equal(saved.historyWheels.ambition,'economic');
  if(side==='caesar'){
   await page.evaluate(async()=>{
    const s=JSON.parse(localStorage.getItem('spqr-save-1'));
    const unit=s.armies.find(a=>a.id==='viii'),officer=s.world.characters.antony;
    unit.characterId='antony';officer.location=unit.region;officer.battlesCommanded=2;officer.loyalty=35;
    s.month++;
    const {advanceWheels}=await import('/history-wheels.js?v=world-kings-city-diplomacy-1');
    advanceWheels(s);
    const chain=s.historyWheels.chains.find(c=>c.type==='commander_petition');
    const letter=s.mail.messages.find(m=>m.id===chain.letterId);
    letter.delivery='received';letter.arrival=s.year*12+s.month;
    localStorage.setItem('spqr-save-1',JSON.stringify(s));
   });
   await page.locator('#new').click();
   await page.locator('[data-slot="load"]').click();
   await page.locator('#mail-open').click();
   await page.locator('[data-mail-select]').filter({hasText:'A commander asks to be heard'}).click();
   const reply=page.locator('[data-mail-reply="commander_reassure"]');
   await reply.click();
   await page.locator('#mail-close').click();
   await page.locator('#new').click();
   await page.locator('[data-slot="save"]').click();
   const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
   assert.equal(after.world.characters.antony.loyalty,50);
   assert.equal(after.historyWheels.chains.find(c=>c.type==='commander_petition').response,'commander_reassure');
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
 const han=await browser.newPage({viewport:{width:1366,height:768}}),hanErrors=[];
 han.on('pageerror',e=>hanErrors.push(e.message));
 await han.goto('http://127.0.0.1:5173/han/',{waitUntil:'domcontentloaded'});
 await han.locator('#begin').click();
 await han.locator('#han-progress').click();
 assert.equal(await han.locator('[data-han-ambition="dynasty"]').isVisible(),true);
 await han.locator('[data-han-ambition="dynasty"]').click();
 assert.match(await han.locator('.han-ambitions').innerText(),/Liu/);
 await han.locator('#han-experience-close').click();
 await han.locator('#save').click();
 assert.equal(await han.evaluate(()=>JSON.parse(localStorage.getItem('spqr-han-save-browser')).nationalAmbition.id),'dynasty');
 await han.reload();await han.locator('#factionSelect').selectOption('shanshan');await han.locator('#begin').click();
 await han.locator('#han-progress').click();
 assert.equal(await han.locator('[data-han-ambition="dynasty"]').count(),0);
 assert.equal(await han.locator('[data-han-ambition="independence"]').isVisible(),true);
 assert.deepEqual(hanErrors,[]);
 await han.close();
 console.log('Wheels ambition selection and save passed in both Roman campaigns');
}finally{await browser.close()}
