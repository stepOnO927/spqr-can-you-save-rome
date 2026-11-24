import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-name-disagreement-1'),{startingTreaties}=await import('/test/helpers/starting-treaties.js'),{createPlan,assignRole,approvePlan}=await import('/battle-plans.js?v=faces-name-disagreement-1'),s=newGame('caesar');
  s.alliances.push(['caesar','egypt']);startingTreaties(s);s.factions.caesar.treasury=300;
  const p=createPlan(s,'caesar',{name:'Italia coordination',mode:'assisted',objective:'italiaN'}).plan;
  if(!assignRole(s,'caesar',p.id,{armyId:'xiii',role:'offensive',path:['italiaN']}).ok)throw Error('No role');approvePlan(s,'caesar',p.id);
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.reload();await page.locator('[data-tab="plans"]').click();await page.locator('[data-imp-plan]').first().click();
 await page.locator('#imp-operation-partner').selectOption('egypt');const send=page.locator('[data-imp-share-operation]');await send.click();assert.match(await send.innerText(),/确认分享作战目标/);await send.click();
 assert.match(await page.locator('[data-operation-sharing]').innerText(),/已寄出，未获独立确认/);
 async function save(){await page.locator('#new').click();await page.locator('[data-slot="save"]').click();return page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')))}
 let s=await save(),m=s.mail.messages.find(m=>m.context?.kind==='operation_notice');assert.ok(m);assert.equal(m.delivery,'traveling');assert.equal(s.factions.caesar.treasury,299);assert.deepEqual(m.context.objectives,[{region:'italiaN',enemy:'senate'}]);assert.equal(s.armies.find(a=>a.id==='xiii').move,null);
 await page.locator('#new').click();await page.locator('[data-slot="load"]').click();s=await save();assert.equal(s.factions.caesar.treasury,299);assert.equal(s.mail.messages.filter(m=>m.context?.kind==='operation_notice').length,1);
 await page.locator('#lang').click();await page.locator('[data-tab="plans"]').click();await page.locator('[data-imp-plan]').first().click();assert.match(await page.locator('[data-operation-sharing]').innerText(),/receipt not independently confirmed/);
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-name-disagreement-1'),{startingTreaties}=await import('/test/helpers/starting-treaties.js'),{createPlan,assignRole,approvePlan}=await import('/battle-plans.js?v=faces-name-disagreement-1'),{shareOperation}=await import('/operation-intelligence.js?v=operation-notices-1'),{sendLetter,advanceMail}=await import('/epistulae.js?v=faces-name-disagreement-1'),{observeControl}=await import('/control-intelligence.js?v=control-delivery-1');
  for(let seed=1;seed<100;seed++){
   const s=newGame('senate');s.seed=seed*100003;s.regions.find(r=>r.id==='africa').owner='caesar';s.wars.push(['numidia','caesar']);s.alliances.push(['numidia','senate']);startingTreaties(s);observeControl(s);
   const a=s.armies.find(a=>a.owner==='numidia'),p=createPlan(s,'numidia',{mode:'automatic',objective:'africa',ai:true}).plan;
   if(!assignRole(s,'numidia',p.id,{armyId:a.id,role:'offensive',path:['africa']}).ok)throw Error('No Numidian route');approvePlan(s,'numidia',p.id);
   const result=shareOperation(s,'numidia',p.id,'senate',{sendLetter});if(!result.ok)throw Error(result.reason);
   const m=s.mail.messages.find(m=>m.id===result.id);for(let i=0;i<result.duration;i++){if(++s.month>12){s.month=1;s.year++}advanceMail(s)}
   if(m.delivery==='received'){localStorage.setItem('spqr-lang','zh');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));return}
  }throw Error('No delivered fixture');
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#atlas-mail').click();
 await page.locator('[data-mail-select]').filter({hasText:'盟军作战通报'}).click();assert.match(await page.locator('.mail-letter').innerText(),/发信时的意向/);assert.match(await page.locator('.mail-letter').innerText(),/独立决定/);assert.deepEqual(errors,[]);
 console.log('Player shares an approved operation through paid confirmation, persists it, and can read a delivered allied notice in the atlas.');
}finally{await browser.close()}
