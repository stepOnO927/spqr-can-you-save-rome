import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const e=await import('/engine.js?v=portraits-hundred-days-1'),a=await import('/agreements.js?v=grand-chessboard-2'),d=await import('/diplomatic-knowledge.js?v=multipolar-2');
  for(let seed=1;seed<200;seed++){
   const s=e.newGame('caesar');s.seed=seed;s.wars.push(['egypt','parthia']);s.relations['caesar:egypt']=40;a.proposeAgreement(s,'egypt','caesar','trade');d.observeDiplomacy(s);
   assertOffer(e.sendStrategicOffer(s,'egypt','caesar','parthia').ok);for(let i=0;i<2;i++){s.month++;e.advanceStrategicOffers(s)}
   if(s.world.strategicOffers[0].status==='awaiting_decision'){sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return}
  }
  throw Error('no offer delivered');
  function assertOffer(ok){if(!ok)throw Error('offer not sent')}
 });
 await page.reload();await page.locator('#mail-open').click();const letter=page.locator('.mail-letter');assert.match(await letter.innerText(),/请求军事协作/);assert.match(await letter.innerText(),/立即宣战/);
 const join=page.locator('[data-mail-reply="join_war"]');await join.click();assert.match(await join.innerText(),/确认加入战争/);await join.click();assert.match(await letter.innerText(),/已回复/);
 await page.locator('#mail-close').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.ok(s.wars.some(w=>w.includes('caesar')&&w.includes('parthia')));assert.equal(s.world.strategicOffers[0].phase,'return');assert.deepEqual(errors,[]);
 console.log('Player receives a cooperation request and confirms the actual war in the mailbox.');
}finally{await browser.close()}
