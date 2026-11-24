import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=faces-name-disagreement-1'),{addReport}=await import('/character-system.js?v=faces-name-disagreement-1'),s=newGame('caesar');for(const source of ['spy','envoy','travelers'])addReport(s,'caesar','egypt',{kind:'leaders',leaders:['ptolemy'],source});for(let i=0;i<35;i++)addReport(s,'caesar','egypt',{kind:'stability',value:'stable',source:'spy'});sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 async function check(){await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();const text=await page.locator('#leader-intelligence-summary').innerText();assert.match(text,/未经核实/);assert.match(text,/上次领袖报告获独立佐证/);assert.doesNotMatch(text,/未知/);assert.ok((text.match(/49/g)||[]).length>=2)}
 await check();await page.locator('#save').click();await page.locator('#load').click();await check();assert.deepEqual(errors,[]);console.log('Archived leadership observation and historical verification dates remain visible after save/load.');
}finally{await browser.close()}

