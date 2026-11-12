import {performance} from 'node:perf_hooks';
import {newScenario} from '../scenarios.js?v=calendar-1';
import {tick} from '../engine.js?v=calendar-1';

const months=Number(process.env.SPQR_MONTHS||120);
if(!Number.isInteger(months)||months<1||months>1200)throw Error('Invalid month count');
const s=newScenario('three_state_coalition','caesar');s.difficulty='expert';const samples=[];
for(let i=0;i<months;i++){const start=performance.now();tick(s);samples.push(performance.now()-start)}
const ordered=[...samples].sort((a,b)=>a-b),average=samples.reduce((n,x)=>n+x,0)/samples.length;
console.log(JSON.stringify({scenario:s.scenario,difficulty:s.difficulty,months,meanMs:+average.toFixed(2),p95Ms:+ordered[Math.ceil(ordered.length*.95)-1].toFixed(2),maxMs:+ordered.at(-1).toFixed(2),characters:Object.keys(s.world.characters).length,regions:s.regions.length},null,2));
