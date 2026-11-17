import test from 'node:test';
import assert from 'node:assert/strict';
import {SessionMeter,releaseChannel,classifySession} from '../analytics-core.js';

test('page, foreground and active time remain separate across idle and hidden periods',()=>{
 let clock=0;const meter=new SessionMeter({now:()=>clock,idleMs:60000});
 clock=10000;meter.setRunning(true);
 clock=20000;meter.activity();
 clock=90000;let result=meter.snapshot();
 assert.deepEqual([result.pageMs,result.foregroundMs,result.activeMs,result.actions],[90000,90000,70000,1]);
 meter.setForeground(false,false);clock=150000;result=meter.snapshot();
 assert.deepEqual([result.pageMs,result.foregroundMs,result.activeMs],[150000,90000,70000]);
 meter.setForeground(true,true);clock=160000;meter.touch();clock=170000;meter.setRunning(false);
 clock=200000;result=meter.snapshot();
 assert.deepEqual([result.pageMs,result.foregroundMs,result.activeMs],[200000,140000,80000]);
});

test('channel detection isolates production, staging, local and Poki',()=>{
 assert.equal(releaseChannel('stepono927.github.io','/spqr-public-release-staging/'),'staging');
 assert.equal(releaseChannel('stepono927.github.io','/spqr-can-you-save-rome/'),'production');
 assert.equal(releaseChannel('spqr-rome.pages.dev','/'),'production');
 assert.equal(releaseChannel('preview.spqr-rome.pages.dev','/map-lab/'),'staging');
 assert.equal(releaseChannel('spqr.example.com','/',false,{production:['spqr.example.com']}),'production');
 assert.equal(releaseChannel('preview.example.com','/',false,{staging:['preview.example.com']}),'staging');
 assert.equal(releaseChannel('unlisted.example.com','/'),'development_preview');
 assert.equal(releaseChannel('localhost','/'),'local_preview');
 assert.equal(releaseChannel('example.com','/',true),'poki');
});

test('classification remains conservative',()=>{
 assert.equal(classifySession({signals:['webdriver']}).category,'unknown');
 assert.equal(classifySession({signals:['webdriver','rapid_actions']}).category,'likely_automation');
 assert.equal(classifySession({activeMs:120000,actions:3}).category,'engaged_gameplay_session');
 assert.equal(classifySession({knownTest:true,activeMs:120000,actions:3}).category,'known_development_test');
});

