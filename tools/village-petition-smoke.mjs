import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}`;
try {
  await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
  await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
  const before=await page.evaluate(async()=>{
    const {newGame}=await import('/engine.js?v=multipolar-review-1');
    const {advanceVillages}=await import('/local-villages.js');
    const state=newGame('caesar'),village=state.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='ravenna-farms');
    village.village.storedFood=0;state.month=6;advanceVillages(state);
    const letter=state.mail.messages.find(mail=>mail.context?.kind==='village_petition');
    if(!letter)throw Error('village petition missing');
    letter.delivery='received';
    sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state}));
    return {treasury:state.factions.caesar.treasury,food:state.factions.caesar.food};
  });
  await page.reload();
  await page.locator('#mail-open').click();
  const letter=page.locator('.mail-letter');
  assert.match(await letter.innerText(),/Road petition from/);
  assert.match(await letter.innerText(),/three-month project costs 14 treasury and 2 food/);
  const fund=page.locator('[data-mail-reply="fund_village_road"]');
  await fund.click();
  if(await fund.count())await fund.click();
  assert.match(await letter.innerText(),/Replied/);
  await page.locator('#mail-close').click();
  await page.locator('#new').click();
  await page.locator('[data-slot="save"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  const village=saved.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='ravenna-farms');
  assert.deepEqual(village.village.project,{kind:'road',actor:'caesar',remaining:3});
  assert.equal(saved.factions.caesar.treasury,before.treasury-14);
  assert.equal(saved.factions.caesar.food,before.food-2);
  await page.evaluate(async()=>{
    const {newGame}=await import('/engine.js?v=multipolar-review-1');
    const {advanceVillages}=await import('/local-villages.js');
    const state=newGame('caesar'),site=state.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='ravenna-farms');
    site.village.road=1;state.month=6;advanceVillages(state);
    const digest=state.mail.messages.find(mail=>mail.context?.kind==='village_digest');
    if(!digest)throw Error('village digest missing');
    digest.delivery='received';
    sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state}));
  });
  await page.reload();await page.locator('#mail-open').click();
  assert.match(await page.locator('.mail-letter').innerText(),/Village developments/);
  assert.match(await page.locator('.mail-letter').innerText(),/harvest gathering/);
  assert.deepEqual(errors,[]);
  console.log('A village petition funds a saved road project, and the half-year digest appears in campaign mail.');
} finally {await browser.close()}
