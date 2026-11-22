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
 const materialCards=await page.locator('.dev-tree [data-tech-node]').evaluateAll(cards=>cards.map(card=>card.id));
 if(materialCards.length!==34||new Set(materialCards).size!==34)throw Error('A material was omitted or duplicated in the five families');
 if(await page.locator('.dev-lane-nav button').count()!==5)throw Error('The five material families are not navigable');
 if(await page.locator('[data-dev-lane="trade"] #tech-improved-shipbuilding').count()!==1||await page.locator('[data-dev-lane="water"] #tech-improved-shipbuilding').count())throw Error('Material cards were grouped by prerequisite root instead of historical function');
 await page.screenshot({path:`outputs/development-tree-material-${width}.png`});
 await page.locator('[data-dev-jump="trade"]').click();
 if(!await page.locator('.inspector').evaluate(panel=>panel.scrollTop>100))throw Error('Material family jump did not scroll the research screen');
 await page.screenshot({path:`outputs/development-tree-material-trade-${width}.png`});
 await page.locator('[data-dev-lane="military"] .dev-prereq-link[href="#tech-metal-extraction"]').click();
 if(!await page.locator('#tech-metal-extraction').evaluate(target=>{const panel=target.closest('.inspector').getBoundingClientRect(),nav=document.querySelector('.dev-lane-nav').getBoundingClientRect(),card=target.getBoundingClientRect();return card.top>=nav.bottom&&card.top<panel.bottom}))throw Error('A cross-family prerequisite link did not reveal its source card');
 await page.locator('[data-dev-branch="idea"]').click();
 await page.locator('.dev-tree-links path[data-from="legion-training"][data-to="reserve-mobilization"]').waitFor();
 const ideaCards=await page.locator('.dev-tree [data-tech-node]').evaluateAll(cards=>cards.map(card=>card.id));
 if(ideaCards.length!==50||new Set(ideaCards).size!==50)throw Error('An idea was omitted or duplicated in the five categories');
 if(await page.locator('.dev-lane-nav button').count()!==5||!await page.locator('[data-dev-lane="military"] > h3').innerText().then(text=>/Military & Training/.test(text)))throw Error('The five idea categories are not navigable');
 if(!/Bosporan Grain Stewardship[\s\S]*productive Bosporan-culture ports/.test(await page.locator('#tech-bosporan-grain-stewardship').textContent()))throw Error('English Bosporan policy is absent from the idea tree');
 if(await page.locator('.dev-tree').evaluate(tree=>tree.scrollWidth>tree.clientWidth+1)){
  await page.locator('[data-tree-pan="right"]').click();
  if(!await page.locator('.dev-tree').evaluate(tree=>tree.scrollLeft>0))throw Error('Later-stage button did not pan the tree');
  await page.locator('[data-tree-pan="left"]').click();
  if(!await page.locator('.dev-tree').evaluate(tree=>tree.scrollLeft<2))throw Error('Earlier-stage button did not return the tree');
 }else if(!await page.locator('[data-tree-pan="right"]').isDisabled())throw Error('Pan control should be disabled when all stages fit');
 const ideas=await page.locator('.dev-tree-links path').count();
 await page.screenshot({path:`outputs/development-tree-ideas-${width}.png`});
 await page.locator('#tech-legion-training').hover();
 if(!await page.locator('.dev-tree-links path[data-from="legion-training"][data-to="reserve-mobilization"]').evaluate(path=>path.classList.contains('emphasis')))throw Error('Hover did not highlight the matching prerequisite');
 await page.screenshot({path:`outputs/development-tree-focused-${width}.png`});
 await page.locator('[data-tree-zoom="out"]').click();
 const afterZoom=await page.locator('.dev-tree-links path[data-from="legion-training"][data-to="reserve-mobilization"]').getAttribute('d');
 await page.locator('#lang').click();
 await page.locator('[data-dev-branch="idea"]').click();
 if(!/军事与训练/.test(await page.locator('[data-dev-jump="military"]').innerText()))throw Error('Chinese idea navigation is not translated');
 if(!/博斯普鲁斯谷物统筹[\s\S]*博斯普鲁斯文化港口/.test(await page.locator('#tech-bosporan-grain-stewardship').textContent()))throw Error('Chinese Bosporan policy is absent from the idea tree');
 if(material<10||ideas<8||!afterZoom||errors.length)throw Error(JSON.stringify({material,ideas,afterZoom,errors}));
 console.log(JSON.stringify({material,ideas,afterZoom,errors}));
}finally{await browser.close()}
