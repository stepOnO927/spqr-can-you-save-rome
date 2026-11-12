import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const ids=await page.evaluate(async()=>{
  const engine=await import('/engine.js?v=mission-discount-1'),dynasties=await import('/dynasties.js?v=safe-save-1'),characters=await import('/character-system.js?v=mission-discount-1');
  const s=engine.newGame('caesar'),own=dynasties.createFictionalPerson(s,{name:['Gaius Furius Crispus','盖乌斯·弗里乌斯·克里斯普斯'],faction:'caesar',birthYear:-82,location:'cisalpine',sex:'male',role:['Fictional field commander','虚构野战指挥官'],militaryOnly:true});
  const legion=s.armies.find(a=>a.id==='xiii');legion.characterId=own;legion.commander=[...s.world.dynasties.catalog[own].name];
  const foreign=dynasties.createFictionalPerson(s,{name:['Theon of Alexandria','亚历山大里亚的提翁'],faction:'egypt',birthYear:-75,location:'roma'});
  s.wars=[];s.world.characters.caesar.location='roma';
  characters.addReport(s,'caesar','egypt',{kind:'leaders',leaders:[foreign],source:'spy'});
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
  return {own,foreign};
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-army="xiii"]').click({force:true});await page.getByText('查看指挥官',{exact:true}).click();
 assert.equal(await page.locator('#command-detail [data-character] .portrait-procedural').count(),1);
 await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator(`[data-character="${ids.foreign}"]`).first().click();
 assert.equal(await page.locator('#command-detail .portrait-procedural').count(),0);
 await page.locator('#save').click();
 const observed=await page.evaluate(async foreign=>{
  const diplomacy=await import('/personal-diplomacy.js?v=mission-discount-1');
  const s=JSON.parse(localStorage.getItem('spqr-save-1'));
  if(!diplomacy.requestPersonalMeeting(s,'caesar',foreign,'egypt').ok)throw Error('meeting request unavailable');
  s.world.intelSeed=1000;diplomacy.advancePersonalDiplomacy(s);diplomacy.advancePersonalDiplomacy(s);
  const meeting=s.meetings.find(m=>m.target===foreign);if(meeting?.status!=='met'||!Number.isInteger(meeting.portraitSeed))throw Error('meeting did not record an appearance');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
  return meeting.portraitSeed;
 },ids.foreign);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator(`[data-character="${ids.foreign}"]`).first().click();
 const art=await page.locator('#command-detail .portrait-procedural').first().evaluate(el=>el.outerHTML);assert.ok(art.includes('<svg'));
 await page.locator('#save').click();const saved=await page.evaluate(foreign=>JSON.parse(localStorage.getItem('spqr-save-1')).meetings.find(m=>m.target===foreign).portraitSeed,ids.foreign);assert.equal(saved,observed);
 await page.locator('#load').click();await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator(`[data-character="${ids.foreign}"]`).first().click();
 assert.equal(await page.locator('#command-detail .portrait-procedural').first().evaluate(el=>el.outerHTML),art);
 assert.deepEqual(errors,[]);
 console.log('Procedural commander portrait and foreign observed portrait survive a personal meeting and save/load.');
}finally{await browser.close()}
