import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {newGrandGame,proposeKnowledgeSale} from '../engine.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const width=Number(process.env.SPQR_TREE_WIDTH)||1440;
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width,height:900}});
try{
 await page.route('http://spqr.test/**',async route=>{
  const url=new URL(route.request().url()),file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 const state=newGrandGame('senate');state.relations['egypt:senate']=20;proposeKnowledgeSale(state,'egypt','senate','material','water-control');
 await page.evaluate(value=>{localStorage.setItem('spqr-lang','zh');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:value}))},state);
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 if(width<=700)await page.locator('#mobile-menu').click();
 await page.locator('#development').click();
 await page.locator('[data-dev-jump="trade"]').click();
 const tradeScroll=await page.locator('.selection').evaluate(panel=>panel.scrollTop);
 if(tradeScroll<=0)throw Error('Atlas family navigation did not scroll the panel');
 await page.locator('[data-dev-lane="military"] .dev-prereq-link[href="#tech-metal-extraction"]').click();
 const position=await page.locator('#tech-metal-extraction').evaluate(card=>{const panel=card.closest('.selection'),nav=document.querySelector('.dev-lane-nav').getBoundingClientRect(),rect=card.getBoundingClientRect();return {cardTop:rect.top,cardBottom:rect.bottom,navBottom:nav.bottom,panelTop:panel.getBoundingClientRect().top,panelBottom:panel.getBoundingClientRect().bottom,scrollTop:panel.scrollTop,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight}});
 await page.screenshot({path:`outputs/atlas-development-tree-${width}.png`});
 console.log(JSON.stringify(position));
 if(position.cardTop<position.navBottom-1||position.cardTop>=position.panelBottom)throw Error('Atlas prerequisite is obscured after navigation');
 await page.locator('.dev-reference summary').click();
 if(await page.locator('.dev-reference-art svg').count()!==33)throw Error('Atlas building illustrations are missing');
 if(!await page.locator('[data-building-reference="milestone"]').textContent().then(text=>text.includes('史料来源: Plutarch, Life of Caius Gracchus 7.2')))throw Error('Atlas building source title is missing in Chinese');
 const referenceColors=await page.locator('[data-building-reference="milestone"]').evaluate(article=>({title:getComputedStyle(article.querySelector('b')).color,description:getComputedStyle(article.querySelector('p')).color}));
 if(referenceColors.title!=='rgb(59, 46, 33)'||referenceColors.description!=='rgb(75, 58, 41)')throw Error(`Atlas building text lacks dark contrast: ${JSON.stringify(referenceColors)}`);
 await page.locator('[data-building-reference="milestone"]').scrollIntoViewIfNeeded();
 await page.screenshot({path:`outputs/atlas-building-reference-${width}.png`});
}finally{await browser.close()}
