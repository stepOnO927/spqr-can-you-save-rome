import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';

function request(port,path){return new Promise((resolve,reject)=>{
 const call=http.get({host:'127.0.0.1',port,path},response=>{let body='';response.setEncoding('utf8');response.on('data',chunk=>body+=chunk);response.on('end',()=>resolve({status:response.statusCode,body}))});
 call.on('error',reject);
})}

test('malformed URL returns 400 without stopping the local server',async()=>{
 const child=spawn(process.execPath,[fileURLToPath(new URL('../server.mjs',import.meta.url))],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 let port,output='';
 try{
  port=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('server did not start')),5000);
   child.stdout.on('data',chunk=>{output+=chunk;if(!output.includes('\n'))return;const match=output.match(/localhost:(\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]))}});
   child.once('error',error=>{clearTimeout(timer);reject(error)});
   child.once('exit',code=>{clearTimeout(timer);reject(Error(`server exited before start: ${code}`))});
  });
  assert.equal((await request(port,'/%')).status,400);
  const home=await request(port,'/');assert.equal(home.status,200);assert.match(home.body,/SPQR/);
 }finally{if(child.exitCode===null){const ended=once(child,'exit');child.kill();await ended}}
});

