import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 const expected=await page.evaluate(async()=>{
  const {newGame,forecastEconomy}=await import('/engine.js?v=faces-empire-2');
  const {proposeAgreement}=await import('/agreements.js?v=grand-chessboard-2');
  const s=newGame('caesar'),before=forecastEconomy(s).treasury;
  s.relations['caesar:egypt']=80;
  if(!proposeAgreement(s,'caesar','egypt','trade').ok)throw Error('Trade treaty was not accepted');
  if(forecastEconomy(s).treasury!==before)throw Error('Treaty minted forecast income');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
  return before;
 });
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 await page.locator('#resources-help').click();
 const zh=await page.locator('#command-detail').innerText();
 assert.match(zh,new RegExp(`下月 ${expected>=0?'+':''}${expected}`));
 assert.match(zh,/贸易成交与条件性援助另行结算/);
 await page.locator('#language').click();await page.locator('#resources-help').click();
 const en=await page.locator('#command-detail').innerText();
 assert.match(en,new RegExp(`next-month change ${expected>=0?'+':''}${expected}`));
 assert.match(en,/Completed trade and conditional aid settle separately/);
 assert.deepEqual(errors,[]);
 console.log('Roman treasury forecast matches simulation without treaty income in both languages.');
}finally{await browser.close()}
