import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {newGrandGame,nationalBudget} from '../engine.js';
import {ideasPanel} from '../development-ui.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const width=Number(process.env.SPQR_FORECAST_WIDTH)||1440;
const state=newGrandGame('parthia');
state.development.parthia.knownIdeas.push('parthian-arrow-trains');
const before=nationalBudget(state,'parthia').projectedNet;
assert.match(ideasPanel(state,'en'),/Projected treasury \/ month after transition[\s\S]*\+2 → -1¤/);
assert.equal(nationalBudget(state,'parthia').projectedNet,before,'rendering must restore the active policy slot');
assert.deepEqual(state.development.parthia.slots.military,[null]);
state.development.parthia.knownIdeas.push('legion-training');
state.development.parthia.slots.military[0]='legion-training';
assert.match(ideasPanel(state,'en'),/Projected treasury \/ month after transition[\s\S]*0 → -1¤/);
assert.deepEqual(state.development.parthia.slots.military,['legion-training'],'replacement forecast must restore the old policy');
state.development.parthia.slots.military[0]=null;
state.development.parthia.knownIdeas.pop();
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width,height:900}});
try{
 await page.route('http://spqr.test/**',async route=>{
  const url=new URL(route.request().url()),file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 for(const lang of ['en','zh']){
  await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
  await page.evaluate(value=>localStorage.setItem('spqr-lang',value),lang);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#entry-file').setInputFiles({name:'parthia.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
  await page.locator('[data-tab="ideas"]').click();
  assert.equal(await page.locator('[data-select-idea]').count(),50);
  assert.equal(await page.locator('.dev-idea-detail:visible').count(),5);
  const expected=lang==='zh'?/过渡完成后预计国库 \/ 月.*\+2 → -1¤.*每月赤字/:/Projected treasury \/ month after transition.*\+2 → -1¤.*Monthly deficit/;
  assert.match(await page.locator('#tech-parthian-arrow-trains .dev-budget-preview').innerText(),expected);
  await page.locator('[data-select-idea="legion-training"]').click();
  assert.equal(await page.locator('#tech-parthian-arrow-trains').isVisible(),false);
  assert.equal(await page.locator('#tech-legion-training').isVisible(),true);
  await page.locator('[data-select-idea="reserve-mobilization"]').click();
  await page.locator('#tech-reserve-mobilization .dev-prereq-link[href="#tech-legion-training"]').click();
  assert.equal(await page.locator('#tech-legion-training').isVisible(),true);
  await page.locator('[data-select-idea="parthian-arrow-trains"]').click();
  if(lang==='en'){
   await page.locator('#tech-parthian-arrow-trains').screenshot({path:`outputs/phase-xiv-budget-forecast-main-${width}.png`});
   await page.screenshot({path:`outputs/phase-xiv-ideas-loadout-main-${width}.png`});
  }
  await page.evaluate(value=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:value})),state);
  await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
  if(width<=700)await page.locator('#mobile-menu').click();
  await page.locator('#development').click();
  await page.locator('[data-dev-page="ideas"]').click();
  assert.equal(await page.locator('[data-select-idea]').count(),50);
  assert.equal(await page.locator('.dev-idea-detail:visible').count(),5);
  assert.match(await page.locator('#tech-parthian-arrow-trains .dev-budget-preview').innerText(),expected);
  await page.locator('[data-select-idea="legion-training"]').click();
  assert.equal(await page.locator('#tech-legion-training').isVisible(),true);
  await page.locator('[data-select-idea="parthian-arrow-trains"]').click();
  if(lang==='en'){
   await page.locator('#tech-parthian-arrow-trains').screenshot({path:`outputs/phase-xiv-budget-forecast-atlas-${width}.png`});
   await page.screenshot({path:`outputs/phase-xiv-ideas-loadout-atlas-${width}.png`});
  }
 }
 console.log(`Phase XIV idea loadout and budget forecast passed in both languages at ${width}px across campaign and atlas.`);
}finally{await browser.close()}
