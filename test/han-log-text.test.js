import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame} from '../han/engine.js?v=dossier-archive-1';
import {formatHanLog} from '../han/log-text.js';

test('Han accession chronicle shows the ruler name in both languages', () => {
 const state = newHanGame('han', {start:'han'});
 const accession = state.log.find(entry => entry.text?.[0]?.includes('enthroned'));
 assert.ok(accession);
 assert.match(formatHanLog(state, accession, 0), /Liu Shi/);
 assert.match(formatHanLog(state, accession, 1), /刘奭/);
 assert.doesNotMatch(formatHanLog(state, accession, 0), /%NAME%/);
});

test('Han chronicle fills every named participant and region', () => {
 const state = newHanGame('han', {start:'han'});
 const event = {text:['%NAME% met %NAME2% in %REGION%; %NAME% agreed.', '%NAME%与%NAME2%会于%REGION%；%NAME%同意。'], who:'liu-shi', who2:'liu-xun', region:'changan'};
 const english = formatHanLog(state, event, 0);
 assert.equal((english.match(/Liu Shi/g)||[]).length, 2);
 assert.doesNotMatch(english, /%NAME|%REGION/);
 assert.doesNotMatch(formatHanLog(state, event, 1), /%NAME|%REGION/);
});
