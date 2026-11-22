import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'outputs','legacy-city-art');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],missing=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)missing.push(`${response.status()} ${response.url()}`)});
try{
 await page.route('http://spqr.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.addInitScript(()=>{if(!localStorage.getItem('spqr-lang'))localStorage.setItem('spqr-lang','en');if(!localStorage.getItem('spqr-legacy-profile-v1'))localStorage.setItem('spqr-legacy-profile-v1',JSON.stringify({coins:2000,buildings:[],rewards:['founder-grant']}))});
 await page.goto('http://spqr.test/legacy/',{waitUntil:'domcontentloaded'});
 assert.ok((await page.locator('.city-ground').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('republican-rome-city.webp'));
 await page.screenshot({path:resolve(output,'desktop-foundations.png')});
 await page.locator('#nav-shop').click();
 await page.locator('[data-buy="museum"]').click();
 await page.locator('[data-buy="temple"]').click();
 await page.locator('#nav-city').click();
 assert.equal(await page.locator('.city-building.museum.built').count(),1);
 assert.equal(await page.locator('.city-building.temple.built').count(),1);
 await page.screenshot({path:resolve(output,'desktop-grown.png')});
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.city-building.museum.built').count(),1,'Purchased museum must remain on the city after reload');
 assert.equal(await page.locator('.city-building.temple.built').count(),1,'Purchased temple must remain on the city after reload');
 await page.locator('#nav-lang').click();
 assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:resolve(output,'mobile-grown-zh.png'),fullPage:true});
 const layouts=[];
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  const layout=await page.evaluate(()=>{
   const sites=[...document.querySelectorAll('.city-building')].map(el=>({id:el.dataset.building,rect:el.getBoundingClientRect()}));
   const overlaps=[];
   for(let i=0;i<sites.length;i++)for(let j=i+1;j<sites.length;j++){
    const a=sites[i].rect,b=sites[j].rect;
    if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>3&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>3)overlaps.push(`${sites[i].id}/${sites[j].id}`);
   }
   return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,sites:sites.length,overlaps};
  });
  assert.ok(layout.scroll<=layout.viewport+1,JSON.stringify(layout));
  assert.equal(layout.sites,12);
  assert.deepEqual(layout.overlaps,[]);
  layouts.push(layout);
 }
 await page.screenshot({path:resolve(output,'mobile-320-grown-zh.png'),fullPage:true});
 await page.locator('[data-building="temple"]').click();
 assert.ok(await page.locator('.temple-festival').isVisible(),'An unlocked landmark must still open its activity at phone size');
 assert.deepEqual(errors,[]);
 assert.deepEqual(missing,[]);
 console.log(JSON.stringify({output,layouts,errors,missing}));
}finally{await browser.close()}
