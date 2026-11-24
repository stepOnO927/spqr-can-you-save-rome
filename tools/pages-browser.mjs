// Run against a dist/ server on port 5174, not the source tree.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const base='http://127.0.0.1:5174',other='http://localhost:5174',failures=[];
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
async function open(url){
  const page=await browser.newPage({acceptDownloads:true,viewport:{width:1920,height:1080}});
  await page.route(/cloudflareinsights\.com|googletagmanager\.com/,route=>route.abort());
  page.on('pageerror',error=>failures.push(`${url}: ${error.message}`));
  page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).origin===new URL(url).origin&&!response.url().endsWith('/favicon.ico'))failures.push(`${response.status()} ${response.url()}`)});
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200,url);
  assert.equal(await page.locator('script[src*="cloudflareinsights.com"]').count(),0,'test server must remove the public beacon');
  assert.equal(await page.evaluate(()=>window.__SPQR_TEST_MODE?.kind),'local_preview');
  const loaded=await page.evaluate(async()=>{const faces=await document.fonts.load('24px "SPQR CJK"','罗马军团');return faces.some(f=>f.family.replace(/["']/g,'')==='SPQR CJK'&&f.status==='loaded')});
  assert.equal(loaded,true,'packaged entry must load its bundled Chinese font');
  await page.locator('#save-transfer-open').waitFor();
  await page.locator('.spqr-version').click();
  assert.match(await page.locator('.spqr-release-dialog').innerText(),/0\.1\.0/);
  await page.locator('.spqr-release-close').click();
  return page;
}
try{
  const main=await open(base+'/');
  const font=await main.request.get(base+'/assets/fonts/noto-sans-sc-chinese-simplified-400-normal.woff2');
  assert.equal(font.status(),200);
  assert.equal(createHash('sha256').update(await font.body()).digest('hex'),'95e3633b6a98f764ba3adfb54504a0cd4799328c009adf9081d6c1850f9c4c78','unchanged font is included in the actual distribution');
  const licenseUrl=await main.locator('link[rel="license"]').evaluate(el=>el.href),license=await main.request.get(licenseUrl);
  assert.equal(license.status(),200,'full license must ship with the font');
  assert.match(await license.text(),/SIL OPEN FONT LICENSE Version 1.1/);
  assert.match(await license.text(),/Copyright 2014-2021 Adobe/);
  assert.equal(await main.locator('#save-transfer-open').evaluate(button=>button.parentElement.classList.contains('setup-saves')),true);
  await main.locator('#start-campaign').click();
  assert.equal(await main.locator('#save-transfer-open').evaluate(button=>button.parentElement.classList.contains('controls')),true);
  await main.locator('#step').click();
  await main.locator('#save').evaluate(button=>button.click());
  const campaign=await main.evaluate(()=>localStorage.getItem('spqr-save-1'));
  assert.ok(campaign?.includes('"regions"'));
  await main.locator('#load').evaluate(button=>button.click());
  await main.locator('#save-transfer-open').click();
  const downloadPromise=main.waitForEvent('download');
  await main.locator('#save-transfer-export').click();
  const exported=JSON.parse(await fs.readFile(await (await downloadPromise).path(),'utf8'));
  assert.equal(exported.saves['spqr-save-1'],campaign);
  await main.close();

  const atlas=await open(base+'/map-lab/');
  await atlas.locator('#start-free').click();
  await atlas.locator('#status').waitFor({state:'hidden',timeout:30000});
  await atlas.locator('#save').click();
  assert.ok(await atlas.evaluate(()=>localStorage.getItem('spqr-save-1')));
  await atlas.locator('#advance').click();
  await atlas.locator('#load').click();
  await atlas.close();

  const han=await open(base+'/han/');
  await han.locator('#begin').click();
  await han.locator('#advance').click();
  await han.locator('#save').click();
  assert.ok(await han.evaluate(()=>localStorage.getItem('spqr-han-save-browser')));
  await han.locator('#load').click();
  await han.close();

  const migrated=await open(other+'/');
  await migrated.locator('#save-transfer-open').click();
  await migrated.locator('#save-transfer-file').setInputFiles({name:'spqr-saves.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});
  await migrated.waitForFunction(()=>localStorage.getItem('spqr-save-1')!==null,undefined,{timeout:10000});
  assert.equal(await migrated.evaluate(()=>localStorage.getItem('spqr-save-1')),campaign);
  assert.match(await migrated.locator('#save-transfer-status').innerText(),/Imported 1/);
  const bad={format:'spqr-save-transfer',version:1,saves:{'evil-key':'value'}};
  await migrated.locator('#save-transfer-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
  assert.equal(await migrated.evaluate(()=>localStorage.getItem('evil-key')),null);
  await migrated.close();
  assert.deepEqual(failures,[]);
  console.log('PASS: three routes, campaign/Map Lab/Han advance and saves, cross-origin import, unknown key rejection, no page errors or local asset failures');
}finally{await browser.close()}
