import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.locator('.setup-advanced summary').click();
 const choice=page.locator('#campaign-legend-homage');
 assert.equal(await choice.isChecked(),false);
 await choice.check();
 assert.equal(await choice.isChecked(),true);
 await page.locator('#start-campaign').click();
 assert.equal(await page.locator('#start-campaign').count(),0);
 const result=await page.evaluate(async()=>{
  const {newGame,upgradeSave}=await import('/engine.js?v=world-kings-command-age-1');
  const {createFictionalPerson}=await import('/dynasties.js?v=world-kings-command-age-1');
  const {setLegendMode,recordLegendEvidence,advanceLegend,legendName,legendDossier}=await import('/legend.js?v=world-kings-command-age-1');
  const {renderGenealogyDossier}=await import('/genealogy-ui.js?v=world-kings-command-age-1');
  let s=newGame('caesar');setLegendMode(s,'homage');
  const id=createFictionalPerson(s,{name:['Lucius Varro','卢基乌斯·瓦罗'],faction:'caesar',birthYear:-80,location:'cisalpine'});
  for(let i=0;i<3;i++)recordLegendEvidence(s,id,'maneuver',{reference:'browser:'+i,detail:['Outmaneuvered a rival court.','智胜对手宫廷。']});
  advanceLegend(s);
  const name=legendName(s,id,'zh'),html=renderGenealogyDossier(s,id,true),principal=legendDossier(s,id).principal?.key;
  s=upgradeSave(JSON.parse(JSON.stringify(s)));
  return {name,html,principal,restored:legendDossier(s,id).principal?.key,mode:s.world.legend.mode};
 });
 assert.equal(result.mode,'homage');
 assert.equal(result.principal,'wolf');
 assert.equal(result.restored,'wolf');
 assert.match(result.name,/狼/);
 assert.match(result.html,/智胜对手宫廷/);
 assert.deepEqual(errors,[]);
 console.log('Names of Legend setup, dossier, and saved reputation passed in Chromium.');
}finally{await browser.close()}
