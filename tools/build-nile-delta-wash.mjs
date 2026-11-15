import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import rivers from '../mediterranean-rivers.js';

// A soft cartographic wash derived only from the two modern mapped Nile branches.
// It is neither an ancient farmland map nor a surveyed alluvium boundary.
const rosetta=rivers.features.find(feature=>feature.properties.name==='Rosetta Branch').geometry.coordinates;
const damietta=rivers.features.find(feature=>feature.properties.name==='Damietta Branch').geometry.coordinates;
const ring=[...rosetta,...damietta.slice().reverse(),rosetta[0]];
const bounds={left:29.8,right:32,top:31.7,bottom:30};
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage();
 const data=await page.evaluate(({ring,bounds})=>{
  const size=1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const context=canvas.getContext('2d'),merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
  const top=merc(bounds.top),bottom=merc(bounds.bottom),path=new Path2D();
  for(const [index,[lon,lat]] of ring.entries()){
   const x=(lon-bounds.left)/(bounds.right-bounds.left)*size,y=(top-merc(lat))/(top-bottom)*size;
   if(index)path.lineTo(x,y);else path.moveTo(x,y);
  }
  path.closePath();
  context.filter='blur(50px)';context.fillStyle='#829a72';context.fill(path);
  return canvas.toDataURL('image/png').split(',')[1];
 },{ring,bounds});
 const file=resolve(fileURLToPath(new URL('../map-lab/nile-delta-wash.png',import.meta.url)));
 await writeFile(file,Buffer.from(data,'base64'));
 console.log(`Generated ${file} from the bundled Natural Earth river branches.`);
}finally{await browser.close()}
