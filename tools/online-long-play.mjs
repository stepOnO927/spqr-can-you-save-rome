// Play a real hosted Senate campaign through its visible controls and save slots.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.env.SPQR_PREVIEW_URL;
if(!base)throw Error('Set SPQR_PREVIEW_URL to the independent preview URL.');
const months=Number(process.env.SPQR_LONG_PLAY_MONTHS||48);
assert.ok(Number.isInteger(months)&&months>=12&&months<=120);
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.setDefaultTimeout(20000);
const errors=[],missing=[],observations=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).host===new URL(base).host)missing.push(`${response.status()} ${response.url()}`)});
const turn=async()=>{
 const before=await page.locator('#turn-date').innerText();
 await page.locator('#advance').click();
 await page.waitForFunction(previous=>document.querySelector('#turn-date')?.innerText!==previous,before,{timeout:30000});
};
try{
 await page.goto(new URL('/',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#entry-senate').click({noWaitAfter:true});
 await page.waitForURL('**/map-lab/',{waitUntil:'commit',timeout:30000});
 await page.locator('.grand-site').first().waitFor({timeout:120000});
 assert.equal(await page.locator('#start-overlay').isVisible(),false);
 await page.locator('[data-army="italy"]').click();
 await page.locator('#lab-orders select').selectOption('cisalpine');
 await page.locator('#lab-orders button').click();
 assert.ok(await page.locator('.prebattle-intel').isVisible());
 assert.match(await page.locator('.prebattle-intel').innerText(),/Unknown|未知/);
 await page.locator('#screen-scouts').click();
 await turn();
 await page.locator('[data-army="italy"]').click();
 await page.locator('#lab-orders select').selectOption('cisalpine');
 await page.locator('#lab-orders button').click();
 const prebattle=await page.locator('.prebattle-intel').innerText();
 assert.match(prebattle,/confidence|可信度/i);
 assert.doesNotMatch(prebattle,/1 months/);
 await page.locator('#attack-anyway').click();
 for(let i=1;i<months;i++){
  if(await page.locator('#advance').isDisabled())break;
  const date=await page.locator('#turn-date').innerText();
  if([6,18,30,42].includes(i)){
   await page.locator('#save').click();
   const saved=await page.evaluate(()=>localStorage.getItem('spqr-save-1'));
   assert.ok(saved?.includes('"player":"senate"'));
   await turn();
   await page.locator('#load').click();
   assert.equal(await page.locator('#turn-date').innerText(),date);
  }
  if(i===12||i===24){
   const previous=await page.locator('html').getAttribute('lang');
   await page.locator('#language').click();
   assert.notEqual(await page.locator('html').getAttribute('lang'),previous);
   await page.locator('#map-mode').selectOption('military');
   assert.ok(await page.locator('.density-counter').count()>0);
   await page.locator('#map-mode').selectOption('political');
  }
  await turn();
  if(i%6===5){
   await page.locator('#save').click();
   const snapshot=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('spqr-save-1'));return {date:`${s.year}/${s.month}`,treasury:s.factions.senate.treasury,food:s.factions.senate.food,territories:s.regions.filter(r=>r.owner==='senate').length,battles:s.battles.length,finalized:!!s.achievementState?.finalized}});
   observations.push(snapshot);
   console.log(JSON.stringify(snapshot));
  }
 }
 assert.equal(await page.locator('.ending-achievements').count(),0,'Achievements must stay hidden during an unfinished campaign');
 const beforeEnd=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')||'{"coins":150}').coins);
 await page.locator('#end-campaign').click();
 await page.locator('.ending-achievements').waitFor();
 assert.match(await page.locator('#ending-overlay').innerText(),/CAMPAIGN SUMMARY|战役总览/);
 const award=await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('spqr-legacy-profile-v1'));return {coins:p.coins,achievements:p.achievements.length,archive:p.archive.length}});
 assert.ok(award.coins>=beforeEnd);
 assert.equal(award.archive,1);
 const downloaded=page.waitForEvent('download');
 await page.locator('#ending-download').click();
 const finalSave=await readFile(await (await downloaded).path());
 await page.locator('#upload-save-file').setInputFiles({name:'senate-final.json',mimeType:'application/json',buffer:finalSave});
 const afterReload=await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('spqr-legacy-profile-v1'));return {coins:p.coins,achievements:p.achievements.length,archive:p.archive.length}});
 assert.deepEqual(afterReload,award,'Loading an ended campaign must not grant rewards again');
 await page.locator('#ending-language').click();
 assert.ok(await page.locator('.ending-achievements').isVisible());
 await page.locator('#ending-overlay a[href="../legacy/"]').click({noWaitAfter:true});
 await page.waitForURL('**/legacy/',{waitUntil:'commit',timeout:30000});
 await page.locator('#nav-museum').click();
 assert.equal(await page.locator('.museum-achievements article').count(),award.achievements);
 assert.deepEqual(errors,[]);
 assert.deepEqual(missing,[]);
 assert.ok(observations.length>=2);
 console.log(JSON.stringify({base,prebattle,observations,beforeEnd,award,errors,missing},null,2));
}finally{await browser.close()}
