// Inspect actual prerequisite wiring in the rendered, zoomable invention tree.
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const width=Number(process.env.SPQR_TREE_WIDTH)||1440;
const page=await browser.newPage({viewport:{width,height:900}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('http://spqr.test/**',async route=>{
  const url=new URL(route.request().url()),file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 await page.locator('#entry-continue').click();
 await page.locator('[data-tab="development"]').click();
 await page.locator('.dev-tree-links path[data-from="water-control"][data-to="urban-drainage"]').waitFor();
 const material=await page.locator('.dev-tree-links path').count();
 await page.screenshot({path:`outputs/development-tree-material-${width}.png`});
 await page.locator('[data-dev-branch="idea"]').click();
 await page.locator('.dev-tree-links path[data-from="legion-training"][data-to="reserve-mobilization"]').waitFor();
 if(!/Bosporan Grain Stewardship[\s\S]*productive Bosporan-culture ports/.test(await page.locator('#tech-bosporan-grain-stewardship').textContent()))throw Error('English Bosporan policy is absent from the idea tree');
 await page.locator('[data-tree-pan="right"]').click();
 if(!await page.locator('.dev-tree').evaluate(tree=>tree.scrollLeft>100))throw Error('Later-stage button did not pan the tree');
 await page.locator('[data-tree-pan="left"]').click();
 if(!await page.locator('.dev-tree').evaluate(tree=>tree.scrollLeft<2))throw Error('Earlier-stage button did not return the tree');
 const ideas=await page.locator('.dev-tree-links path').count();
 await page.screenshot({path:`outputs/development-tree-ideas-${width}.png`});
 await page.locator('#tech-legion-training').hover();
 if(!await page.locator('.dev-tree-links path[data-from="legion-training"][data-to="reserve-mobilization"]').evaluate(path=>path.classList.contains('emphasis')))throw Error('Hover did not highlight the matching prerequisite');
 await page.screenshot({path:`outputs/development-tree-focused-${width}.png`});
 await page.locator('[data-tree-zoom="out"]').click();
 const afterZoom=await page.locator('.dev-tree-links path[data-from="legion-training"][data-to="reserve-mobilization"]').getAttribute('d');
 await page.locator('#lang').click();
 await page.locator('[data-dev-branch="idea"]').click();
 if(!/博斯普鲁斯谷物统筹[\s\S]*博斯普鲁斯文化港口/.test(await page.locator('#tech-bosporan-grain-stewardship').textContent()))throw Error('Chinese Bosporan policy is absent from the idea tree');
 if(material<20||ideas<8||!afterZoom||errors.length)throw Error(JSON.stringify({material,ideas,afterZoom,errors}));
 console.log(JSON.stringify({material,ideas,afterZoom,errors}));
}finally{await browser.close()}
