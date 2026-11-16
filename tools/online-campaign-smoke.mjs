// Exercise the separately deployed branch as a new visitor in a fresh browser.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {newGrandGame} from '../engine.js';

const base=process.env.SPQR_PREVIEW_URL;
if(!base)throw Error('Set SPQR_PREVIEW_URL to the independent preview URL.');
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
page.setDefaultTimeout(15000);
const errors=[],missing=[],failed=[],pending=new Set();
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>pending.add(request.url()));
page.on('requestfinished',request=>pending.delete(request.url()));
page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).host===new URL(base).host)missing.push(`${response.status()} ${response.url()}`)});
page.on('requestfailed',request=>{pending.delete(request.url());failed.push(`${request.failure()?.errorText} ${request.url()}`)});
const stage=name=>console.log(`preview campaign: ${name}`);
try{
 if(process.env.SPQR_PREVIEW_DIRECT_HANDOFF==='1'){
  stage('direct handoff');
  await page.addInitScript(state=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state})),newGrandGame('senate'));
  await page.goto(new URL('/map-lab/',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 }else{
  stage('entrance');
  await page.goto(new URL('/',base).href,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#entry-senate').waitFor({state:'visible',timeout:30000});
  await page.locator('#entry-senate').click({noWaitAfter:true,force:true});
  await page.waitForURL('**/map-lab/',{waitUntil:'commit',timeout:30000});
 }
 stage('senate atlas');
 try{await page.locator('.grand-site').first().waitFor({timeout:120000})}catch{throw Error(`Atlas did not render: ${JSON.stringify({url:page.url(),errors,missing:missing.slice(0,12),failed:failed.slice(0,12),pending:[...pending].slice(0,20),pendingCount:pending.size})}`)}
 assert.equal(await page.locator('#start-overlay').isVisible(),false);
 const visibleSites=await page.locator('.grand-site').count();
 assert.ok(visibleSites>=50&&visibleSites<=121,`Expected viewport-filtered city markers, got ${visibleSites}`);
 await page.locator('#map-mode').selectOption('military');
 assert.ok(await page.locator('.density-counter').count()>0);
 await page.locator('#map-mode').selectOption('political');
 const before=await page.locator('#turn-date').innerText();
 await page.locator('#advance').click();
 await page.waitForFunction(previous=>document.querySelector('#turn-date')?.innerText!==previous,before,{timeout:30000});
 const saved=await page.locator('#turn-date').innerText();
 stage('advanced');
 await page.locator('#save').click();
 await page.locator('#advance').click();
 await page.waitForFunction(previous=>document.querySelector('#turn-date')?.innerText!==previous,saved,{timeout:30000});
 await page.locator('#load').click();
 await page.waitForFunction(date=>document.querySelector('#turn-date')?.innerText===date,saved,{timeout:30000});
 stage('save loaded');
 const firstLanguage=await page.locator('html').getAttribute('lang');
 await page.locator('#language').click();
 assert.notEqual(await page.locator('html').getAttribute('lang'),firstLanguage);
 await page.locator('#language').click();
 assert.equal(await page.locator('html').getAttribute('lang'),firstLanguage);
 await page.locator('.file-transfer a[href="../legacy/"]').click({noWaitAfter:true});
 await page.waitForURL('**/legacy/',{waitUntil:'commit',timeout:30000});
 await page.locator('#nav-museum').click();
 assert.ok(await page.locator('.hub-panel').count()>0);
 stage('legacy');
 if(errors.length||missing.length)throw Error(`Hosted game errors: ${JSON.stringify({errors,missing,failed:failed.slice(0,12)})}`);
 console.log(JSON.stringify({base,visibleSites,turnBefore:before,turnSaved:saved,saveReloaded:true,legacyVisited:true,errors,missing},null,2));
}finally{const closed=await Promise.race([browser.close().then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),5000))]);if(!closed)console.error('Preview browser close timed out')}
