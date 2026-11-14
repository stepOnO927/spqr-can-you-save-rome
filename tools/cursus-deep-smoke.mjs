import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor();
 await page.locator('#roman-faction').selectOption('senate');
 await page.locator('#difficulty').selectOption('travel');
 await page.locator('#start-free').click();
 await page.locator('#factions').click();
 await page.locator('[data-faction="senate"]').click();
 await page.locator('[data-cursus-foreign]').selectOption('parthia');
 for(let stage=1;stage<=3;stage++){
  await page.locator('[data-cursus-investigate]').click();
  for(let month=0;month<2+stage;month++)await page.locator('#advance').click();
  assert.match(await page.locator('.cursus-tree').innerText(),new RegExp('调查阶段 '+stage+'/5'));
 }
 const official=page.locator('.cursus-foreign-list article').filter({hasText:'阿尔塔巴努斯'});
 assert.equal(await official.count(),1);
 assert.equal(await official.locator('[data-cursus-contact="scholarly"]').isDisabled(),true);
 await official.locator('.cursus-contact-more summary').click();
 assert.equal(await official.locator('[data-cursus-contact="provincial_visit"]').isDisabled(),false);
 assert.equal(await official.locator('[data-cursus-contact="military_visit"]').isDisabled(),true);
 await official.locator('[data-cursus-contact="embassy"]').click();
 assert.match(await page.locator('.cursus-records').innerText(),/外交使节.*进行中/);
 assert.deepEqual(errors,[]);
 console.log('Cursus staged foreign inquiry and embassy contact passed in browser');
}finally{await browser.close()}
