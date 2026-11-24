import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame} from '../engine.js';
import {drawMap} from '../map.js';

test('equipped eagle decorates only the current Roman command and keeps faction standards',()=>{
 for(const faction of ['caesar','senate','egypt']){
  const campaign=newGrandGame(faction);
  const render=banner=>drawMap(campaign,{selectedRegion:campaign.armies.find(a=>a.owner===faction).region,selectedArmy:null,mode:'political',lang:'en',view:[0,0,1200,650],banner});
  const classic=render('classic'),eagle=render('eagle');
  assert.equal(classic.includes('legacy-eagle-mark'),false);
  const marks=eagle.match(/class="legacy-eagle-mark"/g)||[];
  assert.equal(marks.length,['caesar','senate'].includes(faction)?campaign.armies.filter(a=>a.owner===faction&&a.men>0).length:0);
  assert.equal((classic.match(/class="faction-mark/g)||[]).length,(eagle.match(/class="faction-mark/g)||[]).length);
 }
});
