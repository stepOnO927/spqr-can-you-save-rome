import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 const target=await page.evaluate(async()=>{
  const {newGame,adjacent,previewMarch}=await import('/engine.js?v=archived-exchange-1');
  const state=newGame('caesar'),army=state.armies.find(unit=>unit.id==='xiii');
  state.training=true;state.difficulty='beginner';army.men=200;army.morale=10;
  const route=adjacent(army.region).map(link=>({to:link.to,plan:previewMarch(state,army.id,link.to)})).find(row=>row.plan.ok&&row.plan.hostile);
  if(!route)throw Error('No legal hostile training route in the scenario');
  const defender=state.armies.find(unit=>unit.owner!==state.player&&unit.region===route.to);
  if(!defender)throw Error('Training route has no defender');
  defender.men=50000;defender.morale=100;
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
  return {army:army.id,destination:route.to,men:army.men};
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#training-badge').waitFor({state:'visible'});
 await page.locator(`#map [data-army="${target.army}"]`).click();
 await page.locator('#lab-orders select').selectOption(target.destination);
 assert.match(await page.locator('.preview-detail').innerText(),/Reported enemy|已报告敌军/);
 await page.locator('#lab-orders button').click();
 await page.locator('#save').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-training-save-1')));
 assert.ok(saved.trainingCheckpoint,'Training attack has no recovery checkpoint');
 for(let turn=0;turn<4;turn++){
  await page.locator('#advance').click();await page.locator('#save').click();
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-training-save-1')));
  if(saved.battles?.some(battle=>battle.attacker.id===target.army&&battle.region===target.destination))break;
 }
 const battle=saved.battles?.find(item=>item.attacker.id===target.army&&item.region===target.destination);
 assert.ok(battle,'Practice attack did not resolve into a real battle');
 assert.equal(battle.attackerWins,false,'Low-strength training force unexpectedly won');
 await page.locator('#recent-battle').click();
 await page.locator('#training-combat-retry').click();
 await page.locator('#save').click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-training-save-1')));
 assert.equal(saved.training,true);
 assert.equal(saved.armies.find(unit=>unit.id===target.army).men,target.men);
 assert.equal(saved.armies.find(unit=>unit.id===target.army).move,null);
 assert.deepEqual(errors,[]);
 console.log('Real training battle preview, defeat and isolated retry passed');
}finally{await browser.close()}
