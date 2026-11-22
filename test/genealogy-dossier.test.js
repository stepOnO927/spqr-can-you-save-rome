import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=born-portrait-thirteen-1';
import {createFictionalPerson} from '../dynasties.js?v=born-portrait-thirteen-1';
import {renderGenealogy,renderGenealogyDossier} from '../genealogy-ui.js?v=born-portrait-thirteen-1';

test('own historical character separates simulated health and commands from historical reference',()=>{
 let s=newGame('caesar'),c=s.world.characters.caesar;c.health='seriously_ill';c.loyalty=23;c.location='cisalpine';
 let html=renderGenealogyDossier(s,'caesar',true);assert.match(html,/本局人物状态/);assert.match(html,/游戏健康: 重病/);assert.match(html,/模拟忠诚: 23%/);assert.match(html,/所在战区: 山南高卢/);assert.match(html,/军事指挥:/);assert.match(html,/<details class="gene-historical">/);assert.match(html,/历史百科（非游戏情报）/);assert.match(html,/历史资料不决定/);assert.match(html,/britannica\.com/);
 s=upgradeSave(structuredClone(s));html=renderGenealogyDossier(s,'caesar',false);assert.match(html,/Simulated health: Seriously ill/);assert.match(html,/Game loyalty: 23%/);assert.match(html,/HISTORICAL ENCYCLOPEDIA \(NOT GAME INTELLIGENCE\)/);
});
test('a missing own person reveals neither hidden condition, location, loyalty nor current office',()=>{
 const s=newGame('caesar'),c=s.world.characters.caesar;c.missing={year:s.year,month:s.month};c.health='seriously_ill';c.loyalty=23;c.location='cisalpine';
 const html=renderGenealogyDossier(s,'caesar',true);assert.match(html,/游戏健康: 未知/);assert.match(html,/模拟忠诚: 未知/);assert.match(html,/所在战区: 未知/);assert.match(html,/军事指挥: 未知/);assert.doesNotMatch(html,/重病|23%|山南高卢/);
 const tree=renderGenealogy(s,true),person=tree.match(/<button class="gene-person" data-gene-person="caesar"[\s\S]*?<\/button>/)?.[0];assert.ok(person);assert.match(person,/失联（职务未知）/);assert.doesNotMatch(person,/军队统帅/);
 c.alive=false;c.deathYear=s.year;const hiddenDeath=renderGenealogyDossier(s,'caesar',true);assert.doesNotMatch(hiddenDeath,/去世时|已故/);const hiddenTree=renderGenealogy(s,true).match(/<button class="gene-person" data-gene-person="caesar"[\s\S]*?<\/button>/)?.[0];assert.match(hiddenTree,/失联/);assert.doesNotMatch(hiddenTree,/已故|– 前49年/);
});
test('foreign people cannot be inspected through the own family dossier; fictional newborns have a game age',()=>{
 const s=newGame('caesar');assert.equal(renderGenealogyDossier(s,'cleopatra',true),'');const id=createFictionalPerson(s,{name:['Child','子女'],faction:'caesar',birthYear:s.year,parents:['caesar'],sex:'female'});const html=renderGenealogyDossier(s,id,true);assert.match(html,/年龄: 0/);assert.match(html,/虚构人物/);assert.doesNotMatch(html,/gene-historical/);
});
test('a deceased person is not described as holding a stale current office',()=>{
 const s=newGame('caesar'),c=s.world.characters.caesar;c.alive=false;c.deathYear=s.year;c.health='deceased';const html=renderGenealogyDossier(s,'caesar',true);assert.match(html,/模拟去世时年龄/);assert.match(html,/游戏健康: 已故/);assert.match(html,/军事指挥: 无/);const tree=renderGenealogy(s,true),person=tree.match(/<button class="gene-person" data-gene-person="caesar"[\s\S]*?<\/button>/)?.[0];assert.match(person,/已故（无现职）/);assert.doesNotMatch(person,/军队统帅/);
});

test('future and unreported missing-person life events do not appear in family counts',()=>{const s=newGame('caesar'),c=s.world.characters.caesar;s.world.dynasties.lives.caesar=[{year:s.year,month:s.month,en:'Visible past',zh:'已知过去'},{year:s.year+1,month:s.month,en:'Future secret',zh:'未来秘密'}];let html=renderGenealogy(s,true);assert.match(html,/模拟记事 1/);c.missing={year:s.year,month:s.month};html=renderGenealogy(s,true);const card=html.match(/<button class="gene-person" data-gene-person="caesar"[\s\S]*?<\/button>/)?.[0];assert.doesNotMatch(card,/模拟记事/)});
