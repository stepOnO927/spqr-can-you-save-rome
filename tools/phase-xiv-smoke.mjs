import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.route('http://spqr.test/**',async route=>{
    const pathname=new URL(route.request().url()).pathname;
    const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root))return route.abort();
    const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[extname(file)]||'application/octet-stream';
    try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
  });
  await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
  await page.locator('#entry-continue').click();
  await page.locator('[data-tab="development"]').click();
  assert.match(await page.locator('.inspector h2').innerText(),/Development/);
  await page.locator('[data-dev-branch="idea"]').click();
  await page.locator('[data-research="legion-training"]').click();
  assert.match(await page.locator('.dev-status').first().innerText(),/Researching/);
  for(let i=0;i<3;i++)await page.locator('#step').click();
  await page.locator('[data-tab="ideas"]').click();
  assert.equal(await page.locator('.dev-category').count(),5);
  await page.locator('[data-adopt-idea="legion-training"]').first().click();
  for(let i=0;i<2;i++)await page.locator('#step').click();
  assert.match(await page.locator('.dev-slot').first().innerText(),/Standardized Legion Training/);
  await page.locator('[data-tab="map"]').click();
  await page.locator('#region-choice').selectOption('gaul');
  assert.ok(await page.locator('[data-build="road"]').count());
  const stoneBefore=await page.locator('.dev-construction .dev-meta').first().innerText();
  await page.locator('[data-buy-material="stone"]').click();
  assert.notEqual(await page.locator('.dev-construction .dev-meta').first().innerText(),stoneBefore);
  await page.locator('#lang').click();
  await page.locator('[data-tab="development"]').click();
  assert.match(await page.locator('.inspector h2').innerText(),/文明发展/);
  await page.screenshot({path:'tools/phase-xiv-ui.png'});
  assert.deepEqual(errors,[]);
  console.log('Phase XIV browser smoke passed: research, adoption, construction controls, bilingual UI.');
}finally{await browser.close()}
