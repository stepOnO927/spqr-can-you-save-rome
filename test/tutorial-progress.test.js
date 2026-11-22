import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resolveBattle,upgradeSave} from '../engine.js?v=world-kings-neighbor-trade-1';
import {tutorialTurnProgress,createTutorial} from '../map-lab/tutorial.js?v=world-kings-neighbor-trade-1';

test('tutorial report follows the selected army, not an unrelated battle',()=>{
 let s=newGame('caesar'),unit=s.armies.find(a=>a.id==='xiii');
 unit.move={to:'italiaN',remaining:2};
 s.battles=[{year:s.year,month:s.month,attacker:{id:'other',owner:'caesar'},defender:{id:'italy',owner:'senate'}}];
 assert.deepEqual(tutorialTurnProgress(s,'caesar','xiii'),{kind:'marching',armyId:'xiii',remaining:2});
 s.battles.unshift({year:s.year,month:s.month,attacker:{id:'xiii',owner:'caesar'},defender:{id:'italy',owner:'senate'}});
 assert.equal(tutorialTurnProgress(s,'caesar','xiii').kind,'battle');
 s.battles=[];unit.move=null;unit.siege={region:'italiaN',remaining:1};
 assert.equal(tutorialTurnProgress(s,'caesar','xiii').kind,'siege');
 s.armies=s.armies.filter(a=>a.id!=='xiii');
 assert.equal(tutorialTurnProgress(s,'caesar','xiii').kind,'unavailable');
});

test('battle identity survives save upgrade',()=>{
 let s=newGame('caesar');
 resolveBattle(s,s.armies.find(a=>a.id==='xiii'),s.armies.find(a=>a.id==='italy'),s.regions.find(r=>r.id==='italiaN'));
 assert.equal(tutorialTurnProgress(s,'caesar').kind,'battle');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(tutorialTurnProgress(s,'caesar').kind,'battle');
});

function fakeBrowser(){
 const original={document:globalThis.document,window:globalThis.window,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight};
 const elements=new Map(),listeners={};
 const make=()=>({hidden:false,textContent:'',value:'',checked:true,disabled:false,style:{},dataset:{},options:Array.from({length:5},()=>({})),children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},replaceChildren(){this.children=[]},append(child){this.children.push(child)},scrollIntoView(){},getClientRects(){return [1]},getBoundingClientRect(){return {width:40,height:20,bottom:100,top:80,right:100,left:60}},closest(){return null},focus(){}});
 const get=selector=>{if(!elements.has(selector))elements.set(selector,make());return elements.get(selector)};
 globalThis.document={querySelector:get,createElement:make,addEventListener:(name,listener)=>listeners[name]=listener};
 globalThis.window={getComputedStyle:()=>({display:'block'}),matchMedia:()=>({matches:false})};
 globalThis.innerWidth=1200;globalThis.innerHeight=800;
 return {get,send:detail=>listeners['spqr:action']({detail}),restore:()=>{Object.assign(globalThis,original)}};
}

test('eight lessons require real actions and survive a save',()=>{
 const browser=fakeBrowser(),s=newGame('caesar'),army=s.armies.find(a=>a.id==='xiii');
 browser.get('#roman-faction').value='caesar';browser.get('#difficulty').value='beginner';
 try{
  const ui=createTutorial({language:()=> 'en',getState:()=>s,getRoutes:()=>[{to:'narbo',ok:true,owner:'caesar'}],onReset(){},onMode(){},skipInitial:true});
  browser.get('#start-game').onclick();
  assert.equal(s.tutorial.step,0);
  browser.get('#guide-show').onclick();assert.equal(s.tutorial.step,0);
  browser.send({type:'territory',id:'roma'});assert.equal(s.tutorial.step,0);
  browser.send({type:'territory',id:'cisalpine'});assert.equal(s.tutorial.step,1);
  browser.send({type:'army',id:'italy',own:false});assert.equal(s.tutorial.step,1);
  browser.send({type:'army',id:'xiii',own:true});assert.equal(s.tutorial.step,2);
  browser.send({type:'supply',id:'italy'});assert.equal(s.tutorial.step,2);
  browser.send({type:'supply',id:'xiii'});assert.equal(s.tutorial.step,3);
  browser.send({type:'preview',id:'roma'});assert.equal(s.tutorial.phase,'preview');
  browser.send({type:'preview',id:'narbo'});assert.equal(s.tutorial.phase,'confirm');
  army.move={to:'narbo',remaining:2};browser.send({type:'order',id:'xiii'});assert.equal(s.tutorial.step,4);
  const saved=JSON.parse(JSON.stringify(s.tutorial));ui.restore(saved);assert.equal(s.tutorial.step,4);
  browser.send({type:'advance'});assert.equal(s.tutorial.step,4);
  s.month++;browser.send({type:'advance'});assert.equal(s.tutorial.step,5);
  browser.send({type:'report'});assert.equal(s.tutorial.step,6);
  browser.send({type:'policy',changed:false});assert.equal(s.tutorial.step,6);
  browser.send({type:'policy',changed:true});assert.equal(s.tutorial.step,7);
  browser.get('#guide-choices').children.find(button=>button.dataset.direction==='development').onclick();
  assert.equal(s.tutorial.direction,'development');assert.equal(s.tutorial.step,8);
  browser.get('#guide-next').onclick();assert.equal(s.tutorial.running,false);
 }finally{browser.restore()}
});

test('campaign start options preserve faction and economic handicap',()=>{
 const browser=fakeBrowser(),calls=[];
 browser.get('#roman-faction').value='senate';browser.get('#difficulty').value='expert';browser.get('#economic-handicap').checked=true;
 try{createTutorial({language:()=> 'en',getState:()=>newGame('senate'),onReset:(...args)=>calls.push(args),onMode(){},skipInitial:true});browser.get('#start-game').onclick();browser.get('#start-free').onclick();assert.deepEqual(calls,[['expert','senate',true],['expert','senate',true]])}finally{browser.restore()}
});

test('tutorial offers defense when only hostile routes are legal',()=>{
 const browser=fakeBrowser(),s=newGame('caesar');
 browser.get('#roman-faction').value='caesar';browser.get('#difficulty').value='beginner';
 try{
  createTutorial({language:()=> 'en',getState:()=>s,getRoutes:()=>[{to:'roma',ok:true,owner:'senate'}],onReset(){},onMode(){},skipInitial:true});
  browser.get('#start-game').onclick();
  browser.send({type:'territory',id:'cisalpine'});
  browser.send({type:'army',id:'xiii',own:true});
  browser.send({type:'supply',id:'xiii'});
  assert.equal(s.tutorial.step,3);
  assert.equal(s.tutorial.phase,'defend');
  assert.match(browser.get('#guide-body').textContent,/safe friendly march/);
  browser.get('#guide-skip').onclick();
 }finally{browser.restore()}
});

test('training combat option previews without issuing an order',()=>{
 const browser=fakeBrowser(),state=newGame('caesar'),calls=[];state.training=true;
 try{
  const ui=createTutorial({language:()=> 'en',getState:()=>state,onReset(){},onMode(){},onCombatPractice:()=>calls.push('preview'),skipInitial:true});
  ui.restore({version:2,running:true,step:8,faction:'caesar'});
  const ordersBefore=JSON.stringify(state.armies.map(army=>army.move));
  const practice=browser.get('#guide-choices').children.find(button=>button.id==='training-combat-practice');
  assert.ok(practice);
  practice.onclick();
  assert.deepEqual(calls,['preview']);
  assert.equal(state.tutorial.running,false);
  assert.equal(JSON.stringify(state.armies.map(army=>army.move)),ordersBefore);
 }finally{browser.restore()}
});
