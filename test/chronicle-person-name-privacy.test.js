import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=search-uncertainty-1';
import {createFictionalPerson} from '../dynasties.js?v=search-uncertainty-1';
import {chronicleCharacterName} from '../map-lab/chronicle-ui.js?v=search-uncertainty-1';

test('chronicle filters use the recorded name rather than a hidden live fictional name',()=>{
 let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Old name','旧姓名'],faction:'egypt',birthYear:-75});s.chronicle.entries.unshift({id:999,characterId:id,personName:['Known name','已知姓名']});
 s.world.dynasties.catalog[id].name=['Secret name','秘密姓名'];s=upgradeSave(structuredClone(s));assert.deepEqual(chronicleCharacterName(s,id),['Known name','已知姓名']);
 delete s.chronicle.entries[0].personName;assert.deepEqual(chronicleCharacterName(s,id),['Unrecorded name','姓名未记录']);
});
