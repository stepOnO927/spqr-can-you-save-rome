// Run against a dist/ server on port 5174, not the source tree.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const base='http://127.0.0.1:5174',other='http://localhost:5174',failures=[];
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
async function open(url){
  const page=await browser.newPage({acceptDownloads:true,viewport:{width:1920,height:1080}});
  page.on('pageerror',error=>failures.push(`${url}: ${error.message}`));
  page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).origin===new URL(url).origin&&!response.url().endsWith('/favicon.ico'))failures.push(`${response.status()} ${response.url()}`)});
  const response=await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200,url);
  await page.locator('#save-transfer-open').waitFor();
  return page;
}
try{
  const main=await open(base+'/');
  assert.equal(await main.locator('#save-transfer-open').evaluate(button=>button.parentElement.classList.contains('setup-saves')),true);
  await main.locator('.setup-advanced').evaluate(el=>el.open=true);
  await main.locator('#campaign-guide').uncheck();
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
  await migrated.locator('#save-transfer-status').filter({hasText:/Imported 1/}).waitFor();
  assert.equal(await migrated.evaluate(()=>localStorage.getItem('spqr-save-1')),campaign);
  assert.match(await migrated.locator('#save-transfer-status').innerText(),/Imported 1/);
  const bad={format:'spqr-save-transfer',version:1,saves:{'evil-key':'value'}};
  await migrated.locator('#save-transfer-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
  await migrated.locator('#save-transfer-status').filter({hasText:/Imported 0/}).waitFor();
  assert.equal(await migrated.evaluate(()=>localStorage.getItem('evil-key')),null);
  await migrated.close();
  assert.deepEqual(failures,[]);
  console.log('PASS: three routes, campaign/Map Lab/Han advance and saves, cross-origin import, unknown key rejection, no page errors or local asset failures');
}finally{await browser.close()}
