// Rebuild the small overview masks from the same bundled GSHHG shoreline as
// the close-scale vectors. Requires the project's Playwright browser setup.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import land from '../mediterranean-land.js';

const output=resolve(import.meta.dirname,'..','map-lab','overview-coast');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();
 const tiles=await page.evaluate(land=>{
  const width=8192,height=4096,merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
  const top=merc(58),bottom=merc(18),point=p=>[(p[0]+20)/80*width,(top-merc(p[1]))/(top-bottom)*height];
  const path=ctx=>{ctx.beginPath();for(const feature of land.features){const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;for(const polygon of polygons)for(const ring of polygon){for(let i=0;i<ring.length;i++){const [x,y]=point(ring[i]);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.closePath()}}};
  const render=kind=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');path(ctx);
   if(kind==='land'){ctx.fillStyle='#d4d0ae';ctx.fill('evenodd');ctx.strokeStyle='#efe1bb';ctx.lineWidth=3;ctx.stroke()}
   else{ctx.fillStyle='#2b626d';ctx.fillRect(0,0,width,height);ctx.globalCompositeOperation='destination-out';path(ctx);ctx.fillStyle='#000';ctx.fill('evenodd')}
   return canvas};
  const out=[];
  for(const kind of ['land','sea']){const source=render(kind);for(let row=0;row<2;row++)for(let col=0;col<4;col++){
   const tile=document.createElement('canvas');tile.width=2048;tile.height=2048;tile.getContext('2d').drawImage(source,col*2048,row*2048,2048,2048,0,0,2048,2048);
   out.push({kind,row,col,data:tile.toDataURL('image/png').split(',')[1]});
  }}return out;
 },land);
 for(const {kind,row,col,data} of tiles)await writeFile(resolve(output,`${kind}-${row}-${col}.png`),Buffer.from(data,'base64'));
 console.log(`Wrote ${tiles.length} GSHHG overview coast images to ${output}`);
}finally{await browser.close()}
