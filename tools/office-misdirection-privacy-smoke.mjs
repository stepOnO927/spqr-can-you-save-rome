import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const ids=await page.evaluate(async()=>{
  const {newGame,upgradeSave}=await import('/engine.js?v=archived-exchange-1'),{createFictionalPerson}=await import('/dynasties.js?v=archived-exchange-1'),{addReport}=await import('/character-system.js?v=archived-exchange-1');let s=newGame('caesar');
  const known=createFictionalPerson(s,{name:['Old officer','旧报告官员'],faction:'senate',birthYear:s.year-40,location:'roma'}),future=createFictionalPerson(s,{name:['Future officer','未来秘密官员'],faction:'senate',birthYear:s.year-38,location:'roma'});
  addReport(s,'caesar','senate',{kind:'office_finance',value:known,source:'travelers'});s.knowledge.caesar.senate.reports.unshift({kind:'office_finance',value:future,source:'spy',year:s.year+1,month:s.month,peopleNames:{[future]:['Future officer','未来秘密官员']}});
  s.world.dynasties.catalog[known].name=['Hidden rename','隐秘新姓名'];s=upgradeSave(structuredClone(s));sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));return {known,future};
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();await page.locator('[data-page="intelligence"]').click();await page.locator('#mission-subject').selectOption('office_finance');await page.locator('[data-mission="spy"]').click();await page.locator('#mission-feedback button').first().click();assert.match(await page.locator('#mission-feedback').innerText(),/行动已派出/);await page.locator('#save').click();
 await page.evaluate(async ids=>{
  const e=await import('/engine.js?v=archived-exchange-1'),s=JSON.parse(localStorage.getItem('spqr-save-1')),op=s.operations.find(x=>x.type==='spy'&&x.subject==='office_finance'&&x.status==='pending');op.remaining=1;
  let seed=null;for(let i=0;i<10000;i++){const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;if(q>=.4&&q<.44){const trial=e.upgradeSave(structuredClone(s));trial.world.intelSeed=i;e.tick(trial);const r=trial.knowledge.caesar.senate.reports[0];if(r?.kind==='office_finance'&&r.value===ids.known){seed=i;break}}}if(seed===null)throw Error('No reproducible misdirection');s.world.intelSeed=seed;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
 },ids);
 await page.reload();await page.locator('#advance').click();await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();await page.locator('[data-page="intelligence"]').click();let text=await page.locator('#mission-records').innerText();assert.match(text,/旧报告官员/);assert.doesNotMatch(text,/未来秘密官员|隐秘新姓名/);
 await page.locator('#save').click();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1'))),report=saved.knowledge.caesar.senate.reports[0];assert.equal(report.value,ids.known);assert.deepEqual(report.peopleNames[ids.known],['Old officer','旧报告官员']);await page.locator('#load').click();await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();await page.locator('[data-page="intelligence"]').click();text=await page.locator('#mission-records').innerText();assert.match(text,/旧报告官员/);assert.doesNotMatch(text,/未来秘密官员|隐秘新姓名/);assert.deepEqual(errors,[]);
 console.log('A real office investigation cannot reveal undelivered leads or hidden renames.');
}finally{await browser.close()}
