import assert from 'node:assert/strict';
import {auditCoastGrid} from './coast-mask-grid.mjs';

const {samples,landSamples,seaSamples,overlaps,gaps}=auditCoastGrid({west:12.3025,south:44.6825,east:12.85,north:45.13,step:.005});
assert.equal(overlaps,0,'land and sea must not overlap in the Po crop');
assert.equal(gaps,0,'land and sea must cover the Po crop');
assert.ok(landSamples>0&&landSamples<samples,'the Po crop must contain land and sea');
console.log(JSON.stringify({samples,landSamples,seaSamples,overlaps,gaps}));
