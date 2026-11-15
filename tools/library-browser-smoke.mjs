import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:1440,height:900}});
await context.route('https://**/*',route=>route.abort());
await context.route('http://spqr.test/**',async route=>{
 const url=new URL(route.request().url()),relative=url.pathname==='/legacy/'?'legacy/index.html':url.pathname.slice(1),target=path.resolve(root,relative);
 if(!target.startsWith(root+path.sep))return route.abort();
 try{const body=await readFile(target),ext=path.extname(target),contentType={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[ext]||'application/octet-stream';await route.fulfill({status:200,contentType,body})}catch{await route.fulfill({status:404,body:'Not found'})}
});
const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.goto('http://spqr.test/legacy/');
await page.evaluate(()=>{const key='spqr-legacy-profile-v1',profile=JSON.parse(localStorage.getItem(key)||'{}');profile.coins=2000;localStorage.setItem(key,JSON.stringify(profile));localStorage.setItem('spqr-lang','zh')});
await page.reload();
await page.locator('#nav-shop').click();await page.locator('[data-buy="library"]').click();await page.locator('#nav-city').click();await page.locator('[data-building="library"]').click();
assert.equal(await page.locator('[data-library-entry]').count(),34);
assert.match(await page.locator('#library-detail').innerText(),/道路修筑/);
assert.match(await page.locator('#library-detail .library-source').getAttribute('href'),/^https:\/\//);
await page.locator('#library-search').fill('渡槽');assert.equal(await page.locator('[data-library-entry]:visible').count(),1);
await page.locator('#library-search').fill('not-a-roman-research-node');assert.equal(await page.locator('[data-library-entry]:visible').count(),0);assert.equal(await page.locator('#library-empty').isVisible(),true);
await page.locator('#library-search').fill('');await page.locator('[data-library-entry="aqueduct-refinement"]').click();assert.match(await page.locator('#library-detail').innerText(),/马尔基亚水道/);
await page.locator('[data-library-related="water-control"]').click();assert.match(await page.locator('#library-detail h3').innerText(),/水利/);
await page.locator('[data-library-branch="idea"]').click();assert.equal(await page.locator('[data-library-entry]').count(),42);assert.match(await page.locator('#library-detail h3').innerText(),/军团战场训练/);
await page.locator('[data-library-entry="egyptian-multiscript-decrees"]').click();assert.match(await page.locator('#library-detail').innerText(),/埃及/);
await page.locator('[data-library-entry="achaean-assembly-practice"]').click();assert.match(await page.locator('#library-detail').innerText(),/亚该亚议事传统/);
await page.locator('[data-library-entry="egyptian-temple-revenues"]').click();assert.match(await page.locator('#library-detail').innerText(),/前118年/);
await page.locator('#nav-lang').click();assert.equal(await page.locator('[data-library-entry]').count(),42);assert.match(await page.locator('#library-detail h3').innerText(),/Egyptian Temple Revenue Guarantees/);
assert.equal(await page.locator('.library-scholars article').count(),3);
await page.locator('[data-activity="library-roads"][data-activity-choice="0"]').click();assert.match(await page.locator('.civic-activity').innerText(),/Map labels/);
const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')).coins);await page.reload();await page.locator('[data-building="library"]').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-profile-v1')).coins),before);assert.equal(await page.locator('[data-activity="library-roads"]').count(),0);
await mkdir(path.join(root,'outputs'),{recursive:true});await page.screenshot({path:path.join(root,'outputs','legacy-library-desktop.png'),fullPage:true});
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(root,'outputs','legacy-library-mobile.png'),fullPage:true});
assert.deepEqual(errors,[]);await browser.close();console.log('Library browser smoke passed: purchase, 76 entries, search, sources, bilingual, reload, mobile.');
