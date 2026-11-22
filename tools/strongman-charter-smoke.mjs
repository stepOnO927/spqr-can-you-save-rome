import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}`;
try {
  await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
  await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
  const setup=await page.evaluate(async()=>{
    const {newGame}=await import('/engine.js?v=world-kings-meeting-1');
    const {configureStartingDifficulty}=await import('/difficulty.js?v=world-kings-meeting-1');
    const {advanceLocalEntities}=await import('/local-polities.js');
    const state=configureStartingDifficulty(newGame('caesar'),'hard',false,{localSeed:9});
    const chief=state.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.type==='strongman'&&entity.procedural&&state.regions.find(region=>region.id===entity.theater).owner==='caesar');
    if(!chief)throw Error('no host-controlled strongman');
    chief.strategy=5;chief.treasury=10;chief.militia=Math.max(chief.militia,Math.ceil(chief.population*.1));
    state.month=4;advanceLocalEntities(state);
    const letter=state.mail.messages.find(mail=>mail.context?.kind==='strongman_charter_request'&&mail.context.polityId===chief.id);
    if(!letter)throw Error('no strongman charter petition');
    letter.delivery='received';
    sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state}));
    return {id:chief.id,name:chief.name[0].toUpperCase(),legal:chief.legalSovereign,treasury:state.factions.caesar.treasury};
  });
  await page.reload();await page.locator('#mail-open').click();
  const letter=page.locator('.mail-letter');
  assert.match(await letter.innerText(),/Autonomy petition from/);
  assert.match(await letter.innerText(),/legal title stays with the host court/);
  const grant=page.locator('[data-mail-reply="grant_local_charter"]');
  await grant.click();if(await grant.count())await grant.click();
  assert.match(await letter.innerText(),/Replied/);
  await page.locator('#mail-close').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  const chief=saved.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id===setup.id);
  assert.equal(chief.localCharter.active,true);
  assert.equal(chief.controller,chief.id);assert.equal(chief.legalSovereign,setup.legal);
  assert.equal(chief.access.caesar,undefined);
  assert.equal(saved.factions.caesar.treasury,setup.treasury-5);
  await page.evaluate(state=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state})),saved);
  await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
  const marker=page.locator(`.city-marker[data-city="${setup.name}"]`);
  await marker.waitFor({state:'visible'});await marker.click();
  assert.match(await page.locator('#command-detail').innerText(),/Household charter active/);
  assert.deepEqual(errors,[]);
  console.log('A strongman petition can receive a funded local charter without changing sovereignty or passage; Map Lab displays the saved result.');
} finally {await browser.close()}
