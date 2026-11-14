import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const id=await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=coalition-courier-1'),{assignSuccession}=await import('/characters.js?v=succession-ui-recovery-1'),{advanceGovernments}=await import('/governance.js?v=portraits-hundred-days-1'),{addReport}=await import('/character-system.js?v=portraits-hundred-days-1'),s=newGame('caesar');s.world.characters.artavasdes.alive=false;s.world.characters.artavasdes.health='deceased';assignSuccession(s,'armenia');s.wars=[];s.factions.armenia.treasury=100;s.factions.armenia.stability=60;s.world.dynasties.seed=1;for(let i=0;i<7;i++){s.month++;advanceGovernments(s)}const id=s.world.leadership.armenia[0];addReport(s,'caesar','armenia',{kind:'leaders',leaders:[id],source:'spy',confidence:'unverified'});sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));return id});
 const open=async()=>{await page.locator('#factions').click();await page.locator('[data-faction="armenia"]').click();await page.locator('[data-page="intelligence"]').click();await page.locator('#mission-records').locator(`[data-character="${id}"]`).first().click()};
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await open();
 assert.equal(await page.locator('#command-detail .character-card img').count(),0,'a spy report alone does not reveal the portrait');
 await page.locator('#save').click();
 await page.evaluate(async id=>{const s=JSON.parse(localStorage.getItem('spqr-save-1')),{requestPersonalMeeting,advancePersonalDiplomacy}=await import('/personal-diplomacy.js?v=portraits-hundred-days-1');s.world.characters.caesar.location='armenia';s.world.intelSeed=1000;const r=requestPersonalMeeting(s,'caesar',id,'armenia');if(!r.ok)throw Error('Could not request meeting');advancePersonalDiplomacy(s);advancePersonalDiplomacy(s);if(s.meetings[0].status!=='met')throw Error('Meeting did not occur');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))},id);
 await page.reload();await open();const image=page.locator('#command-detail .character-card img');assert.match(await image.getAttribute('src'),/fictional-court-armenia-128\.jpg/);assert.equal(await image.evaluate(e=>e.complete&&e.naturalWidth===128),true);assert.match(await page.locator('#command-detail').innerText(),/游戏创作/);
 await page.locator('#save').click();await page.locator('#load').click();await open();assert.match(await page.locator('#command-detail .character-card img').getAttribute('src'),/fictional-court-armenia-128\.jpg/);assert.deepEqual(errors,[]);
 console.log('Regional artwork appears only after a personal meeting and survives save/load.');
}finally{await browser.close()}
