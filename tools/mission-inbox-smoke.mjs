import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto(process.env.SPQR_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame,queueMission}=await import('/engine.js?v=faces-born-portrait-1');const s=newGame('caesar');if(!queueMission(s,'caesar','egypt','spy','health').ok)throw Error('mission unavailable');s.world.intelSeed=0;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))});
 await page.reload();for(let i=0;i<4;i++)await page.locator('#step').click();
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));const mission=state.operations.find(o=>o.type==='spy'&&o.target==='egypt');assert.ok(['complete','captured','detected'].includes(mission.status));
 await page.locator('#mail-open').click();await page.locator(`[data-mail-select="${mission.resultMailId}"]`).click();assert.match(await page.locator('.mail-letter').innerText(),mission.status==='complete'?/情报报告已送达/:/情报人员暴露|抓获/);
 const named=await page.evaluate(async()=>{
  const {newGame,queueMission}=await import('/engine.js?v=faces-born-portrait-1'),{advanceMailReports}=await import('/mail-reports.js?v=faces-born-portrait-1');
  const s=newGame('caesar'),sent=queueMission(s,'caesar','egypt','spy','health');if(!sent.ok)throw Error('named mission unavailable');
  const op=s.operations[0];op.status='detected';op.resolvedYear=s.year;op.resolvedMonth=s.month;advanceMailReports(s);
  const name=s.world.dynasties.catalog[op.agentId]?.name?.[1];if(!name||!op.resultMailId)throw Error('named letter unavailable');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return {mailId:op.resultMailId,name};
 });
 await page.reload();await page.locator('#mail-open').click();await page.locator(`[data-mail-select="${named.mailId}"]`).click();
 assert.ok((await page.locator('.mail-letter').innerText()).includes(named.name),'the saved agent name should appear in the received letter');
 assert.deepEqual(errors,[]);console.log('The spy outcome is accessible in the campaign inbox after the mission resolves.');
}finally{await browser.close()}
