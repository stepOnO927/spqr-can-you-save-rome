import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolveBattle,upgradeSave} from '../engine.js';
import {tutorialTurnProgress,createTutorial} from '../map-lab/tutorial.js';

test('tutorial tracks the commanded army rather than another friendly battle',()=>{
 let s=newGame('caesar'),unit=s.armies.find(a=>a.id==='xiii');unit.move={to:'italiaN',remaining:2};s.battles=[{year:s.year,month:s.month,attacker:{id:'other',owner:'caesar'},defender:{id:'italy',owner:'senate'}}];assert.deepEqual(tutorialTurnProgress(s,'caesar'),{kind:'marching',armyId:'xiii',remaining:2});
 s.battles.unshift({year:s.year,month:s.month,attacker:{id:'xiii',owner:'caesar'},defender:{id:'italy',owner:'senate'}});assert.equal(tutorialTurnProgress(s,'caesar').kind,'battle');s.battles=[];unit.move=null;unit.region='italiaN';assert.equal(tutorialTurnProgress(s,'caesar').kind,'arrived');unit.siege={region:'italiaN',remaining:1};assert.equal(tutorialTurnProgress(s,'caesar').kind,'siege');s.armies=s.armies.filter(a=>a.id!=='xiii');assert.equal(tutorialTurnProgress(s,'caesar').kind,'unavailable');
});
test('battle records retain army identity across saves for the tutorial',()=>{
 let s=newGame('caesar');resolveBattle(s,s.armies.find(a=>a.id==='xiii'),s.armies.find(a=>a.id==='italy'),s.regions.find(r=>r.id==='italiaN'));assert.equal(tutorialTurnProgress(s,'caesar').kind,'battle');s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(tutorialTurnProgress(s,'caesar').kind,'battle');
});
test('interactive guide waits for an actual arrival or its own battle',()=>{
 const saved={document:globalThis.document,localStorage:globalThis.localStorage,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight};const elements=new Map();let listener;
 const make=()=>({hidden:false,textContent:'',value:'',style:{},parentElement:{},options:[{},{}],classList:{add(){},remove(){}},scrollIntoView(){},getBoundingClientRect(){return {width:1,height:1,bottom:1,top:0,right:1,left:0}}});
 const get=key=>{if(!elements.has(key))elements.set(key,make());return elements.get(key)};get('#roman-faction').value='caesar';get('#difficulty').value='standard';globalThis.document={querySelector:get,addEventListener:(name,fn)=>{if(name==='spqr:action')listener=fn}};globalThis.localStorage={setItem(){},getItem(){return null}};globalThis.innerWidth=1920;globalThis.innerHeight=1080;
 try{const ui=createTutorial({language:()=> 'zh',onReset(){},onMode(){},skipInitial:true});get('#start-game').onclick();get('#guide-next').onclick();const send=detail=>listener({detail});send({type:'army',id:'xiii'});get('#guide-next').onclick();send({type:'preview',id:'italiaN'});send({type:'order',id:'italiaN'});assert.equal(get('#guide-title').textContent,'推进时间');send({type:'advance',battle:true,progress:{kind:'marching',remaining:2}});assert.equal(get('#guide-title').textContent,'推进时间');assert.match(get('#guide-feedback').textContent,/仍在行军/);send({type:'advance',progress:{kind:'battle'}});assert.equal(get('#guide-title').textContent,'理解战斗');send({type:'battle',armyIds:['other']});assert.equal(get('#guide-title').textContent,'理解战斗');send({type:'battle',armyIds:['xiii']});assert.equal(get('#guide-title').textContent,'战区与城市');ui.stop()}finally{Object.assign(globalThis,saved)}
});
