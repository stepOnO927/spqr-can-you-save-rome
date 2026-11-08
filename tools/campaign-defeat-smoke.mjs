import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor({timeout:30000});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=defeat-1');
  const {captureCampaignState,recordCampaignTurn}=await import('/chronicle.js?v=defeat-1');
  const s=newGame('caesar'),before=captureCampaignState(s),lost=s.regions.find(r=>r.id==='gaul');
  lost.owner='senate';recordCampaignTurn(s,before);
  s.armies=s.armies.filter(a=>a.owner!=='caesar');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
 });
 await page.reload();
 await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',{timeout:30000});
 assert.match(await page.locator('#front-alert').innerText(),/失地警报.*远高卢/s);
 await page.locator('#front-alert [data-front-region="gaul"]').click();
 assert.match(await page.locator('#selection-title').innerText(),/远高卢/);
 for(let month=0;month<3;month++)await page.locator('#advance').click();
 await page.locator('#campaign-outcome:not([hidden])').waitFor();
 assert.match(await page.locator('#campaign-outcome').innerText(),/战役失败/);
 assert.equal(await page.locator('#advance').isDisabled(),true);
 await page.locator('#outcome-legacy').click();
 await page.locator('.defeat-summary').waitFor();
 assert.match(await page.locator('.defeat-summary').innerText(),/战役已经结束/);
 assert.doesNotMatch(await page.locator('.inspector').innerText(),/战役结束前不展示隐藏功绩/);
 await page.locator('#finalize-campaign').click();
 assert.match(await page.locator('.legacy-entries').innerText(),/战败/);
 assert.deepEqual(errors,[]);
 console.log('Campaign defeat browser smoke passed: persistent loss alert, defeat, frozen turns, legacy summary and archive.');
}finally{await browser.close()}
