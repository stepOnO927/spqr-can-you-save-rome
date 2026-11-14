import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 async function setup(noClaimants){return page.evaluate(async noClaimants=>{
  const {newGame}=await import('/engine.js?v=portraits-hundred-days-1'),{createFictionalPerson,makeWill,settleInheritance}=await import('/dynasties.js?v=portraits-hundred-days-1');
  const s=newGame('caesar'),parent=createFictionalPerson(s,{name:['Testator','立遗嘱者'],faction:'caesar',birthYear:-90,wealth:35}),family=s.world.characters[parent].familyId;
  const heir=createFictionalPerson(s,{name:['Child','子女'],faction:'caesar',birthYear:-66,parents:[parent],familyId:family}),beneficiary=createFictionalPerson(s,{name:['Beneficiary','受益人'],faction:'caesar',birthYear:-70});
  makeWill(s,parent,beneficiary);s.world.characters[parent].alive=false;settleInheritance(s,parent);if(noClaimants){s.world.characters[heir].alive=false;s.world.characters[beneficiary].alive=false;s.factions.caesar.treasury=0}
  const estate=s.world.dynasties.inheritanceDisputes.at(-1).id,cash=s.factions.caesar.treasury;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return {parent,family,heir,beneficiary,estate,cash};
 },noClaimants)}
 const normal=await setup(false);await page.reload();await page.locator('[data-tab="government"]').click();assert.match(await page.locator('.genealogy').innerText(),/待决私人遗产/);await page.locator('[data-ruling="compromise"]').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.factions.caesar.treasury,normal.cash-6);assert.equal(saved.world.dynasties.inheritanceDisputes.find(x=>x.id===normal.estate).status,'resolved');assert.equal(saved.world.characters[normal.heir].wealth+saved.world.characters[normal.beneficiary].wealth+saved.world.dynasties.families[normal.family].wealth,35);
 await page.locator('#new').click();await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="government"]').click();assert.equal(await page.locator('[data-ruling]').count(),0);
 const unclaimed=await setup(true);await page.reload();await page.locator('[data-tab="government"]').click();assert.match(await page.locator('.genealogy').innerText(),/无人领取的遗产转入家族公产/);await page.locator('[data-ruling="will"]').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.world.dynasties.inheritanceDisputes.find(x=>x.id===unclaimed.estate).choice,'family');assert.equal(saved.world.dynasties.families[unclaimed.family].wealth,35);assert.equal(saved.factions.caesar.treasury,0);assert.deepEqual(errors,[]);console.log('Contested and unclaimed private estates settle through the player interface and survive saving.');
}finally{await browser.close()}
