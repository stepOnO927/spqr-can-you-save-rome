import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
  await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
  await page.locator('#start-free').click();
  await page.locator('#map-mode').selectOption('satisfaction');
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
  assert.equal(await page.locator('#map-mode').inputValue(),'satisfaction');
  await page.locator('#map-mode-details summary').waitFor();
  await page.locator('#atlas-mail').click();
  await campaign.locator('.mailbox').waitFor();
  await page.locator('#campaign-panel-close').click();
  await page.waitForFunction(()=>document.querySelector('#campaign-panel')?.hidden);
  assert.equal(await page.locator('#turn-date').textContent(),after);
  for(const [button,tab] of [['#campaign-focus','focus'],['#campaign-legions','legions'],['#campaign-plans','plans']]){
    await page.locator(button).click();
    await campaign.locator('[data-tab="'+tab+'"].active').waitFor();
    await page.locator('#campaign-panel-close').click();
    await page.waitForFunction(()=>document.querySelector('#campaign-panel')?.hidden);
  }
  assert.deepEqual(errors,[]);
  console.log('Campaign affairs and mail stay in the map page and return the current simulation.');
}finally{
  await browser.close();
}
