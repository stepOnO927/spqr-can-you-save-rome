// Check the live campaign map's sea name against the bundled coastline.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import land from '../mediterranean-land.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const inside=(ring,lon,lat)=>{
 let hit=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }
 return hit;
};
const landRings=land.features.flatMap(feature=>feature.geometry.type==='Polygon'?[feature.geometry.coordinates[0]]:feature.geometry.coordinates.map(polygon=>polygon[0]));
const onLand=(x,y)=>landRings.some(ring=>inside(ring,x*62/1200-12,55-y*31/650));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
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
 await mkdir(resolve(root,'outputs'),{recursive:true});
 const boxes=[];
 for(const [language,label] of [['en','MARE INTERNVM'],['zh','地中海']]){
  if(language==='zh')await page.locator('#lang').click();
  const sea=page.locator('#map-svg .sea-name');
  assert.equal(await sea.textContent(),label);
  const box=await sea.evaluate(el=>{const {x,y,width,height}=el.getBBox();return {x,y,width,height}});
  assert.ok(box.width>0&&box.height>0);
  // Sample rendered glyph bounds, including both ends and the baseline region.
  for(let x=box.x+2;x<box.x+box.width-1;x+=5)
   for(let y=box.y+2;y<box.y+box.height-1;y+=3)
    assert.equal(onLand(x,y),false,`${language} sea name crosses land at ${x},${y}`);
  boxes.push({language,label,box});
  await page.screenshot({path:resolve(root,`outputs/main-map-sea-${language}.png`)});
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({boxes,errors}));
}finally{await browser.close()}
