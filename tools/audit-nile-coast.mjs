import assert from 'node:assert/strict';
import {auditCoastGrid} from './coast-mask-grid.mjs';

const result=auditCoastGrid({west:29.01,south:30.51,east:33.5,north:32.2,step:.02});
assert.equal(result.overlaps,0,'land and sea must not overlap in the Nile Delta crop');
assert.equal(result.gaps,0,'land and sea must cover the Nile Delta crop');
assert.ok(result.landSamples>0&&result.seaSamples>0,'the Nile Delta crop must contain land and sea');
console.log(JSON.stringify(result));
