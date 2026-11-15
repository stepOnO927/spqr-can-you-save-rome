import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
  await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
  const start=await page.evaluate(async()=>{
    const {newGame}=await import('/engine.js?v=exchange-undated-1');
    const egypt=newGame('egypt');
    localStorage.setItem('spqr-save-1',JSON.stringify(egypt));
    sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:newGame('caesar')}));
    return {year:egypt.year,month:egypt.month};
  });
  await page.reload();
  await page.locator('#new').click();
  await page.locator('[data-slot="load"]').click();
  assert.equal(await page.locator('.setup-backdrop').count(),0);
  await page.locator('#step').click();
  await page.locator('#new').click();
  await page.locator('[data-slot="save"]').click();
  const afterCampaign=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  assert.equal(afterCampaign.player,'egypt');
  assert.notDeepEqual([afterCampaign.year,afterCampaign.month],[start.year,start.month]);

  await page.evaluate(async()=>{
    const {newGame}=await import('/engine.js?v=exchange-undated-1');
    sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:newGame('caesar')}));
  });
  await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#load').click()]);
  await page.locator('#advance').click();
  await page.locator('#save').click();
  const afterAtlas=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  assert.equal(afterAtlas.player,'egypt');
  assert.notDeepEqual([afterAtlas.year,afterAtlas.month],[afterCampaign.year,afterCampaign.month]);
  assert.deepEqual(errors,[]);
  console.log('A transferred regional campaign loads and advances in both campaign views.');
}finally{await browser.close()}
