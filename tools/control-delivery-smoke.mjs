import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 async function open(mode){
  await page.evaluate(async mode=>{const {newGame}=await import('/engine.js?v=peace-outcome-1'),s=newGame('caesar');for(const id of ['parthia','media']){delete s.controlKnowledge.caesar[id];
   if(mode!=='unknown')s.controlKnowledge.caesar[id]={owner:'egypt',year:s.year,month:s.month,receivedYear:mode==='future'?s.year+1:s.year,receivedMonth:s.month};}
   sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));},mode);
  await page.reload();return page.locator('[data-map-group*="parthia"]').first().getAttribute('fill');
 }
 const unknown=await open('unknown'),future=await open('future'),delivered=await open('delivered');
 assert.ok(unknown);assert.equal(future,unknown);assert.notEqual(delivered,unknown);assert.deepEqual(errors,[]);
 console.log('Campaign map hides an undelivered control report and displays it after arrival.');
}finally{await browser.close()}
