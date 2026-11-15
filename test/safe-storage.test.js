import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../safe-storage.js';

test('blocked storage keeps a playable in-memory session without claiming persistence', () => {
  const host = {};
  Object.defineProperty(host, 'localStorage', {get() { throw new DOMException('denied', 'SecurityError'); }});
  const store = createStore('localStorage', host);
  assert.equal(store.persistent, false);
  store.setItem('campaign', '{"month":2}');
  assert.equal(store.getItem('campaign'), '{"month":2}');
  store.removeItem('campaign');
  assert.equal(store.getItem('campaign'), null);
});

test('native storage remains persistent when available', () => {
  const items = new Map();
  const backing = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key)
  };
  const store = createStore('localStorage', {localStorage: backing});
  assert.equal(store.persistent, true);
  store.setItem('campaign', 'saved');
  assert.equal(items.get('campaign'), 'saved');
  assert.equal(store.getItem('campaign'), 'saved');
});

test('quota failures degrade to session memory while retaining readable old saves', () => {
  const items = new Map([['old', 'existing']]);
  let fail = false;
  const backing = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => {if (fail) throw new DOMException('quota', 'QuotaExceededError'); items.set(key, value);},
    removeItem: key => items.delete(key)
  };
  const store = createStore('localStorage', {localStorage: backing});
  fail = true;
  store.setItem('new', 'temporary');
  assert.equal(store.persistent, false);
  assert.equal(store.getItem('new'), 'temporary');
  assert.equal(store.getItem('old'), 'existing');
});
