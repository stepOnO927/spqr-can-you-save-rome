import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=diplomatic-chronicle-1'),{initializeCursus}=await import('/cursus-honorum.js?v=multipolar-courier-review-1'),s=newGame('senate'),c=initializeCursus(s),id=c.foreignPosts.parthia.administration;
  c.intel.senate={parthia:{stage:3,reports:[{stage:3,people:[id],officeholders:{administration:id},observed:{year:s.year,month:s.month},delivered:{year:s.year,month:s.month},confidence:'public',offices:['administration'],links:[]}]}};
  c.contacts.push({actor:'senate',target:'parthia',id,status:'open',route:'formal',trust:35});
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
 });
 await page.reload();await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();await page.locator('[data-cursus-foreign]').selectOption('parthia');
 const official=page.locator('.cursus-foreign-list article').filter({hasText:'阿尔塔巴努斯'});
 await official.locator('[data-cursus-cultivate]').click();assert.match(await page.locator('.cursus-feedback').innerText(),/3个月.*遗失或遭拒/);
 await page.locator('[data-confirm-cultivation]').click();assert.match(await page.locator('.cursus-records').innerText(),/回信中/);assert.match(await page.locator('.cursus-records').innerText(),/信任 35/);
 await page.locator('#advance').click();assert.match(await page.locator('.cursus-records').innerText(),/回信中/);assert.match(await page.locator('.cursus-records').innerText(),/信任 35/);
 await page.locator('#advance').click();assert.match(await page.locator('.cursus-records').innerText(),/回信中/);assert.match(await page.locator('.cursus-records').innerText(),/信任 35/);
 await page.locator('#advance').click();assert.doesNotMatch(await page.locator('.cursus-records').innerText(),/回信中/);assert.deepEqual(errors,[]);
 console.log('Foreign relationship letters show cost and travel time, with no premature result.');
}finally{await browser.close()}
