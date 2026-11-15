import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const origin='http://127.0.0.1:5173';
const reports=[];
async function visibleInFrame(locator){
  return locator.evaluate(el=>{const b=el.getBoundingClientRect();return b.width>0&&b.height>0&&b.top>=0&&b.bottom<=innerHeight&&b.left>=0&&b.right<=innerWidth});
}
try{
  for(const [width,height] of [[640,360],[836,470]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#start-campaign').waitFor();
    assert.equal(await visibleInFrame(page.locator('#start-campaign')),true,'Roman Start outside '+width+'x'+height);
    await page.locator('#start-campaign').tap();
    console.log('Roman viewport',width,height,await page.evaluate(()=>{const ids=['.top','.shell','.shell main','.map-toolbar','#step','#map-svg'];return {portrait:matchMedia('(orientation:portrait)').matches,landscapeRule:matchMedia('(max-height:600px) and (orientation:landscape)').matches,inner:[innerWidth,innerHeight],scroll:document.documentElement.scrollHeight,rects:Object.fromEntries(ids.map(id=>{const e=document.querySelector(id),r=e?.getBoundingClientRect();return [id,r?{y:r.y,height:r.height,bottom:r.bottom}:null]}))}}));
    assert.equal(await visibleInFrame(page.locator('#step')),true,'Roman Advance outside '+width+'x'+height);
    await page.locator('#map-svg [data-army]').first().tap();
    assert.equal(await page.locator('.inspector:not(.closed)').count(),1,'Roman touch did not inspect an army');
    assert.deepEqual(errors,[],'Roman browser errors');
    const layout=await page.evaluate(()=>({scrollHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight}));
    assert.ok(layout.scrollHeight<=height+2,'Roman frame scrolls at '+width+'x'+height);
    reports.push({entry:'roman',width,height,layout});
    await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:640,height:360},hasTouch:true,isMobile:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/han/',{waitUntil:'domcontentloaded'});
    await page.locator('#begin').tap();
    await page.locator('#map path.territory[data-region="changan"]').tap({timeout:5000});
    assert.ok((await page.locator('#inspector').textContent()).trim().length>20,'Han touch did not inspect Chang’an');
    assert.deepEqual(errors,[],'Han browser errors');
    reports.push({entry:'han',touch:'changan'});
    await context.close();
  }
  {
    const context=await browser.newContext({viewport:{width:640,height:360},hasTouch:true,isMobile:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/map-lab/',{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(await visibleInFrame(page.locator('#start-game')),true,'Atlas Start outside 640x360');
    await page.locator('#start-game').tap();
    await page.locator('.maplibregl-marker').first().tap({timeout:5000});
    assert.equal(await page.locator('.selection:not(.collapsed)').count(),1,'Atlas touch did not inspect marker');
    assert.deepEqual(errors,[],'Atlas browser errors');
    reports.push({entry:'atlas',touch:'marker'});
    await context.close();
  }
  console.log(JSON.stringify(reports));
}finally{await browser.close()}
