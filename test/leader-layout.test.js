import test from 'node:test';
import assert from 'node:assert/strict';
import {placeLeaderLabels} from '../map-lab/leader-layout.js';
const bounds={left:0,top:0,right:600,bottom:400};
const label=(id,x,y)=>({id,x,y,full:{width:150,height:38},compact:{width:68,height:30}});
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

test('nearby labels avoid each other and important map markers while retaining anchors',()=>{
 const blocker={left:265,right:325,top:150,bottom:190},result=placeLeaderLabels([label('one',300,200),label('two',310,205),label('three',315,215)],[blocker],bounds),visible=result.filter(x=>!x.hidden);
 assert.equal(visible.length,3);for(let i=0;i<visible.length;i++){assert.ok(!overlap(visible[i].box,blocker));for(let j=0;j<i;j++)assert.ok(!overlap(visible[i].box,visible[j].box));assert.ok(Math.abs(visible[i].dx)<=45&&Math.abs(visible[i].dy)<=76)}
});
test('crowded layouts fall back safely and restore full names when space returns',()=>{
 const labels=[label('a',300,200),label('b',300,200)],crowded=placeLeaderLabels(labels,[{left:0,top:0,right:600,bottom:400}],bounds);assert.ok(crowded.every(x=>x.hidden));
 const free=placeLeaderLabels([label('a',150,200),label('b',450,200)],[],bounds);assert.ok(free.every(x=>!x.hidden&&!x.compact&&x.dx===0&&x.dy===0));
});
test('a narrow available space keeps the faction name when only its compact label fits',()=>{
 const result=placeLeaderLabels([label('a',100,60)],[],{left:60,top:0,right:140,bottom:120})[0];assert.equal(result.hidden,false);assert.equal(result.compact,true);assert.ok(result.box.left>=60&&result.box.right<=140);
});
