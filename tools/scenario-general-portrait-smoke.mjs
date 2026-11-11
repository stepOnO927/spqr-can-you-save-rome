import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await p.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await p.locator('#campaign-guide').uncheck();await p.locator('#scenario-choice').selectOption('ambitious_general');await p.locator('#faction-choice').selectOption('senate');await p.locator('#start-campaign').click();await p.locator('#open-atlas').click();await p.waitForURL('**/map-lab/');
 await p.locator('[data-army="italy"]').click({force:true});await p.getByText('查看指挥官',{exact:true}).click();const img=p.locator('#command-detail img[src*="fictional-varus-128.jpg"]');await img.waitFor();await img.evaluate(async e=>{await e.decode();if(e.naturalWidth!==128)throw Error('portrait did not load')});assert.match(await p.locator('#command-detail').innerText(),/虚构游戏人物/);
 await p.locator('#save').click();await p.locator('#load').click();await p.locator('[data-army="italy"]').click({force:true});await p.getByText('查看指挥官',{exact:true}).click();assert.equal(await p.locator('#command-detail img[src*="fictional-varus-128.jpg"]').count(),1);assert.deepEqual(errors,[]);console.log('Scenario general portrait loads in command view and survives save/load.');
}finally{await b.close()}
