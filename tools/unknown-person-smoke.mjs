import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=separate-crowns-1'),s=newGame('caesar'),k=s.knowledge.caesar.egypt;k.reportedLeaders=['ptolemy'];k.reports=[];k.sightings={};k.commanderReports=[];s.factions.caesar.treasury=100;s.world.characters.cleopatra.health='wounded';s.inquiries=[];for(const a of s.armies){a.move=null;a.siege=null}sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();
 await page.locator('#mission-subject').selectOption('location');assert.equal(await page.locator('#mission-person').inputValue(),'ptolemy');await page.locator('#mission-person').selectOption('');assert.doesNotMatch(await page.locator('#mission-records').innerText(),/克娄巴特拉/);
 await page.locator('[data-mission="spy"]').click();await page.locator('#mission-feedback button').first().click();assert.match(await page.locator('#mission-feedback').innerText(),/行动已派出/);
 await page.locator('#save').click();await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('spqr-save-1')),op=s.operations.find(o=>o.type==='spy'&&o.target==='egypt');op.remaining=1;s.world.intelSeed=Array.from({length:100000},(_,i)=>i).find(i=>((Math.imul(i,1664525)+1013904223)>>>0)/4294967296>.96);sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.reload();await page.locator('#advance').click();await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();
 const records=page.locator('#mission-records');assert.match(await records.innerText(),/克娄巴特拉七世/);await records.locator('[data-character="cleopatra"]').first().click();const dossier=await page.locator('#command-detail').innerText();assert.match(dossier,/未知/);assert.doesNotMatch(dossier,/受伤/);assert.deepEqual(errors,[]);
 console.log('An unnamed investigation can reveal an observed person and open a knowledge-limited dossier.');
}finally{await browser.close()}
