import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto((process.env.SPQR_TEST_URL||'http://127.0.0.1:5173')+'/',{waitUntil:'domcontentloaded'});
 const outcomes=await page.evaluate(async()=>{const {newGame,tick}=await import('/engine.js?v=ai-wartime-aid-1'),results=[];for(const autoplayPlayer of [true,false]){const s=newGame('caesar');s.difficulty='expert';s.seed=2;s.wars.push(['caesar','egypt']);for(let i=0;i<24;i++)tick(s,{autoplayPlayer});results.push((s.world.strategicOffers||[]).filter(x=>x.actor==='egypt'&&x.kind==='request_aid').map(x=>x.status));if(!autoplayPlayer)sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))}return results});
 for(const result of outcomes)assert.ok(result.includes('accepted'),'Egypt should sometimes receive actual aid with or without an automated Rome');
 await page.reload();await page.locator('[data-tab="chessboard"]').click();await page.locator('[data-board-view="power"]').click();assert.match(await page.locator('.chessboard').innerText(),/多国势力网络/);assert.deepEqual(errors,[]);console.log('Autonomous wartime aid works in the browser while the power network remains playable.');
}finally{await browser.close()}
