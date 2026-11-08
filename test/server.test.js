import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicPathname} from '../server.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('local server exposes game files without exposing repository internals',()=>{
  for(const url of ['/', '/index.html', '/app.js', '/engine.js', '/style.css', '/map-lab/', '/map-lab/lab.js', '/map-lab/SOURCES.md', '/assets/portraits/caesar-128.jpg']){
    assert.ok(publicPathname(url),`${url} should be public`);
  }
  for(const url of ['/.git', '/.git/config', '/.env', '/package.json', '/server.mjs', '/engine.test.js', '/test/server.test.js', '/tools/browser-smoke.mjs', '/node_modules/playwright/package.json', '/work/full-audit/server.mjs', '/assets/portraits/../../.git/config']){
    assert.equal(publicPathname(url),null,`${url} should be private`);
  }
  assert.throws(()=>publicPathname('/%'),URIError);
});

test('all browser modules remain reachable through the public file list',()=>{
  for(const name of fs.readdirSync(root).filter(name=>name.endsWith('.js')&&!name.endsWith('.test.js'))){
    assert.equal(publicPathname(`/${name}`),`/${name}`);
  }
  for(const name of fs.readdirSync(path.join(root,'map-lab')).filter(name=>name.endsWith('.js'))){
    assert.equal(publicPathname(`/map-lab/${name}`),`/map-lab/${name}`);
  }
});
