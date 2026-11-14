import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../engine.js?v=diplomatic-chronicle-1';
import {observeDiplomacy} from '../diplomatic-knowledge.js?v=diplomatic-chronicle-1';
import {initializeChronicle,syncChronicleDispatches} from '../chronicle.js?v=succession-ui-recovery-1';

test('a reported foreign treaty reaches the chronicle only after contact, and secret treaties remain hidden',()=>{
 const s=newGame('caesar');initializeChronicle(s);const end=s.year*12+s.month+24;
 s.agreements.push({id:'public-test',type:'trade',parties:['armenia','parthia'],status:'active',expiresAt:end},{id:'secret-test',type:'defensive',parties:['armenia','egypt'],secret:true,status:'active',expiresAt:end});
 observeDiplomacy(s);syncChronicleDispatches(s);assert.ok(!s.chronicle.entries.some(x=>x.en.includes('Armenia')));
 s.regions.find(x=>x.id==='anatolia').owner='caesar';s.controlKnowledge.caesar.armenia={owner:'armenia',year:s.year,month:s.month};observeDiplomacy(s);syncChronicleDispatches(s);
 const texts=s.chronicle.entries.map(x=>x.en).join('\n');assert.match(texts,/treaty.*Armenia.*Parthia/);assert.doesNotMatch(texts,/treaty.*Armenia.*Egypt/);
 assert.ok(s.chronicle.entries.some(x=>x.topic==='diplomacy'&&x.en.includes('Armenia')));
 s.regions.find(x=>x.id==='anatolia').owner='senate';s.agreements.find(x=>x.id==='public-test').status='expired';s.month++;observeDiplomacy(s);syncChronicleDispatches(s);
 assert.equal(s.chronicle.entries.filter(x=>x.en.includes('treaty')&&x.en.includes('Armenia')).length,1);
 s.regions.find(x=>x.id==='anatolia').owner='caesar';observeDiplomacy(s);syncChronicleDispatches(s);assert.ok(s.chronicle.entries.some(x=>x.en.includes('treaty')&&x.en.includes('has ended')));
});
