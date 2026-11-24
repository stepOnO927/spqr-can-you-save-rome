// No OS font installation: verify the exact font shipped to players.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 for(const [name,path,start] of [['campaign','/','#start-campaign'],['atlas','/map-lab/','#start-free'],['han','/han/','#begin']]) {
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1}),errors=[],fontResponses=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().endsWith('/assets/fonts/noto-sans-sc-chinese-simplified-400-normal.woff2'))fontResponses.push(r)});
  await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//,route=>route.abort());
  await page.addInitScript(()=>{localStorage.setItem('spqr-lang','zh');localStorage.setItem('spqr-han-lang','zh')});
  await page.goto(`http://127.0.0.1:5173${path}`,{waitUntil:'domcontentloaded'});
  await page.locator(start).waitFor();
  async function check(stage) {
   const result=await page.evaluate(async()=>{
    const faces=await document.fonts.load('24px "SPQR CJK"','罗马军团');await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=60;canvas.height=60;const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.font='32px "SPQR CJK"';ctx.textBaseline='top';
    const glyphs=[...new Set('罗马军团凯撒庞培地图城市战役健康继承情报书信外交征召选择难度埃及帕提亚')];
    function raster(c){ctx.clearRect(0,0,60,60);ctx.fillText(c,3,3);const pixels=ctx.getImageData(0,0,60,60).data;let hash=2166136261,ink=0;for(let i=3;i<pixels.length;i+=4){ink+=pixels[i];hash=Math.imul(hash^pixels[i],16777619)>>>0}return {hash,ink}}
    const missing=raster('\u0378'),rendered=glyphs.map(raster),uncovered=[],visibleGlyphs=new Set();let count=0;
    function hasFallback(family){const list=family.split(',').map(f=>f.trim().replace(/["']/g,'')),index=list.indexOf('SPQR CJK');return index>=0&&!list.slice(0,index).some(f=>['serif','sans-serif','system-ui','monospace','cursive','fantasy'].includes(f))}
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){
     const text=walker.currentNode,el=text.parentElement;if(!/[\u3400-\u9fff]/.test(text.textContent)||!el||el.closest('script,style,option'))continue;
     const rect=el.getBoundingClientRect(),css=getComputedStyle(el);if(rect.width<=0||rect.height<=0||css.visibility==='hidden'||css.display==='none')continue;
     count++;for(const c of text.textContent.match(/[\u3400-\u9fff]/gu)||[])visibleGlyphs.add(c);if(!hasFallback(css.fontFamily))uncovered.push(`${el.tagName}: ${text.textContent.slice(0,30)} (${css.fontFamily})`);
    }
    for(const el of document.querySelectorAll('input,select,textarea')){
     const text=el.tagName==='SELECT'?el.selectedOptions[0]?.textContent||'':el.value||el.placeholder||'',rect=el.getBoundingClientRect(),css=getComputedStyle(el);
     if(!/[\u3400-\u9fff]/.test(text)||rect.width<=0||rect.height<=0||css.visibility==='hidden'||css.display==='none')continue;
     count++;for(const c of text.match(/[\u3400-\u9fff]/gu)||[])visibleGlyphs.add(c);if(!hasFallback(css.fontFamily))uncovered.push(`${el.tagName}: ${text.slice(0,30)} (${css.fontFamily})`);
    }
    return {loaded:faces.some(f=>f.family.replace(/["']/g,'')==='SPQR CJK'&&f.status==='loaded'),glyphs:glyphs.length,unique:new Set(rendered.map(r=>r.hash)).size,missing:rendered.filter(r=>r.ink===0||r.hash===missing.hash).length,missingVisible:[...visibleGlyphs].filter(c=>{const r=raster(c);return r.ink===0||r.hash===missing.hash}),count,uncovered};
   });
   assert.equal(result.loaded,true,`${name} ${stage}: bundled font loaded`);
   assert.equal(result.unique,result.glyphs,`${name} ${stage}: distinct Chinese glyphs, not identical missing-character boxes`);
   assert.equal(result.missing,0,`${name} ${stage}: no empty or replacement glyphs`);
   assert.deepEqual(result.missingVisible,[],`${name} ${stage}: visible Chinese text has actual glyphs`);
   assert.ok(result.count>4,`${name} ${stage}: visible Chinese labels exercised`);
   assert.deepEqual(result.uncovered,[],`${name} ${stage}: every visible Chinese label has the local fallback`);
   console.log(`TYPOGRAPHY ${name} ${stage}: ${result.glyphs} distinct glyphs; ${result.count} visible labels covered`);
  }
  await check('setup');
  // The guided Roman start opens the atlas. Exercise the campaign screen here;
  // the atlas is checked separately below.
  if(name==='campaign')await page.locator('#campaign-guide').evaluate(el=>{el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.locator(start).click();
  if(name==='atlas'){await page.locator('[data-city="ROMA"]').waitFor();await page.waitForTimeout(8000)}
  await check('campaign');
  if(name==='atlas'){
   await page.locator('[data-army="xiii"]').click({force:true});await page.locator('#open-march-planner').click();await page.locator('#march-planner:not([hidden])').waitFor();
   await check('march planner');await page.screenshot({path:'typography-atlas-planner-1920x1080.png'});await page.locator('#march-planner [data-plan="cancel"]').click();
  }
  if(name==='atlas')assert.ok((await page.locator('.strength-line b').evaluateAll(els=>els.map(el=>{const range=document.createRange();range.selectNodeContents(el);return range.getClientRects().length}))).every(n=>n===1),'strength values and unknown labels remain on one line');
  assert.ok(fontResponses.some(r=>r.status()===200),`${name}: local font response succeeds`);
  assert.equal((await fontResponses[0].body()).length,1142552,`${name}: complete font file`);
  await page.screenshot({path:`typography-${name}-1920x1080.png`});
  assert.deepEqual(errors,[],`${name}: no uncaught errors`);await page.close();
 }
} finally {await browser.close()}
