import {newGame} from '../engine.js?v=faces-born-portrait-1';
import {inspectState} from '../inspector-diagnostics.js';
import assert from 'node:assert/strict';

const clean=newGame('caesar'),before=JSON.stringify(clean);
assert.equal(inspectState(clean).some(x=>x.severity==='fatal'),false);
const damaged=structuredClone(clean);
damaged.armies[0].men=-1;
const failure=inspectState(damaged).find(x=>x.code==='invalid-troops');
assert.ok(failure&&failure.severity==='fatal','The controlled regression was not detected');
assert.equal(JSON.stringify(clean),before,'The disposable regression modified the original state');
assert.equal(inspectState(clean).some(x=>x.severity==='fatal'),false,'Restored state did not pass');
console.log(JSON.stringify({controlledRegression:'detected',finding:failure,restored:'PASS',saveUntouched:true}));
