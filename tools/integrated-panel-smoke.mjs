import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
  await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
  await page.locator('#start-free').click();
  const before=await page.locator('#turn-date').textContent();
  await page.locator('#campaign-government').click();
  const campaign=page.frameLocator('#campaign-panel-frame');
  await campaign.locator('#step').waitFor();
  assert.equal(new URL(page.url()).pathname,'/map-lab/');
  await campaign.locator('#step').click();
  await page.locator('#campaign-panel-close').click();
  await page.waitForFunction(()=>document.querySelector('#campaign-panel')?.hidden);
  const after=await page.locator('#turn-date').textContent();
  assert.notEqual(after,before,'the campaign month must return to the map');
  await page.locator('#atlas-mail').click();
  await campaign.locator('#mail-open').waitFor();
  await page.locator('#campaign-panel-close').click();
  await page.waitForFunction(()=>document.querySelector('#campaign-panel')?.hidden);
  assert.equal(await page.locator('#turn-date').textContent(),after);
  assert.deepEqual(errors,[]);
  console.log('Campaign affairs and mail stay in the map page and return the current simulation.');
}finally{
  await browser.close();
}
