import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [width,height] of [[640,360],[836,470]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/han/',{waitUntil:'domcontentloaded'});await page.locator('#begin').tap();
  const region=page.locator('#map [data-region="changan"]').first();await region.tap();assert.match(await page.locator('#inspector').innerText(),/Chang|长安/i);assert.equal(await page.locator('.han-map .route').first().evaluate(el=>getComputedStyle(el).pointerEvents),'none');assert.deepEqual(errors,[]);console.log(width+'x'+height+' Han territory touch passed');await page.close();
 }
 const desktop=await browser.newPage({viewport:{width:1366,height:768}});await desktop.goto('http://127.0.0.1:5173/han/',{waitUntil:'domcontentloaded'});await desktop.locator('#begin').click();assert.equal(await desktop.locator('.han-map .route').first().evaluate(el=>getComputedStyle(el).pointerEvents),'stroke');await desktop.close();console.log('Desktop route tooltips remain available');
}finally{await browser.close()}
