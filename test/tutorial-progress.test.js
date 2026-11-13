import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolveBattle,upgradeSave} from '../engine.js?v=court-portraits-1';
import {tutorialTurnProgress,createTutorial} from '../map-lab/tutorial.js?v=playability-1';

test('tutorial tracks the commanded army rather than another friendly battle',()=>{
 let s=newGame('caesar'),unit=s.armies.find(a=>a.id==='xiii');unit.move={to:'italiaN',remaining:2};s.battles=[{year:s.year,month:s.month,attacker:{id:'other',owner:'caesar'},defender:{id:'italy',owner:'senate'}}];assert.deepEqual(tutorialTurnProgress(s,'caesar'),{kind:'marching',armyId:'xiii',remaining:2});
 s.battles.unshift({year:s.year,month:s.month,attacker:{id:'xiii',owner:'caesar'},defender:{id:'italy',owner:'senate'}});assert.equal(tutorialTurnProgress(s,'caesar').kind,'battle');s.battles=[];unit.move=null;unit.region='italiaN';assert.equal(tutorialTurnProgress(s,'caesar').kind,'arrived');unit.siege={region:'italiaN',remaining:1};assert.equal(tutorialTurnProgress(s,'caesar').kind,'siege');s.armies=s.armies.filter(a=>a.id!=='xiii');assert.equal(tutorialTurnProgress(s,'caesar').kind,'unavailable');
});
test('battle records retain army identity across saves for the tutorial',()=>{
 let s=newGame('caesar');resolveBattle(s,s.armies.find(a=>a.id==='xiii'),s.armies.find(a=>a.id==='italy'),s.regions.find(r=>r.id==='italiaN'));assert.equal(tutorialTurnProgress(s,'caesar').kind,'battle');s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(tutorialTurnProgress(s,'caesar').kind,'battle');
});
test('both campaign start paths pass the separately selected handicap',()=>{
 const saved={document:globalThis.document,localStorage:globalThis.localStorage};const elements=new Map(),calls=[];
 const get=key=>{if(!elements.has(key))elements.set(key,{hidden:false,textContent:'',value:'',checked:false,style:{},parentElement:{},options:[{},{},{},{}],classList:{add(){},remove(){}}});return elements.get(key)};
 get('#roman-faction').value='senate';get('#difficulty').value='expert';get('#economic-handicap').checked=true;
 globalThis.document={querySelector:get,addEventListener(){}};globalThis.localStorage={setItem(){},getItem(){return null}};
 try{createTutorial({language:()=> 'en',getState:()=>({}),onReset:(...args)=>calls.push(args),onMode(){},skipInitial:true});get('#start-game').onclick();get('#start-free').onclick();assert.deepEqual(calls,[['expert','senate',true],['expert','senate',true]])}finally{Object.assign(globalThis,saved)}
});
test('interactive guide accepts defensive choices and persists real action progress',()=>{
 const saved={document:globalThis.document,localStorage:globalThis.localStorage,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight};const elements=new Map();let listener;
 const make=()=>({hidden:false,textContent:'',value:'',checked:true,style:{},parentElement:{},options:[{},{},{},{}],classList:{add(){},remove(){}},scrollIntoView(){},getBoundingClientRect(){return {width:1,height:1,bottom:1,top:0,right:1,left:0}}});
 const get=key=>{if(!elements.has(key))elements.set(key,make());return elements.get(key)};get('#roman-faction').value='caesar';get('#difficulty').value='standard';globalThis.document={querySelector:get,addEventListener:(name,fn)=>{if(name==='spqr:action')listener=fn}};globalThis.localStorage={setItem(){},getItem(){return null}};globalThis.innerWidth=1920;globalThis.innerHeight=1080;
 try{const state={},ui=createTutorial({language:()=> 'zh',getState:()=>state,onReset(){},onMode(){},skipInitial:true});get('#start-game').onclick();get('#guide-next').onclick();const send=detail=>listener({detail});send({type:'army',id:'italy',own:false});assert.equal(state.tutorial.step,1);send({type:'army',id:'xiii',own:true});get('#guide-next').onclick();send({type:'preview',id:'narbo'});assert.equal(state.tutorial.step,4);send({type:'order',id:'narbo'});assert.equal(state.tutorial.step,5);send({type:'cancel',id:'xiii'});assert.equal(state.tutorial.step,4);send({type:'advance',battle:false});assert.equal(state.tutorial.step,6);const snapshot=JSON.parse(JSON.stringify(state.tutorial));ui.restore(snapshot);assert.equal(get('#guide-title').textContent,'查看结果');get('#guide-next').onclick();send({type:'city',id:'ROMA'});send({type:'resources'});send({type:'intelligence',id:'senate'});send({type:'objective',id:'roma'});assert.equal(state.tutorial.step,11);ui.stop()}finally{Object.assign(globalThis,saved)}
});
