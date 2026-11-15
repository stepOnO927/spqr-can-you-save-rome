import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../analytics-worker/worker.js';

const env={ADMIN_TOKEN:'private-test-token'};
test('private dashboard refuses unauthenticated reads',async()=>{
 const response=await worker.fetch(new Request('https://worker.example/admin'),env);
 assert.equal(response.status,401);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
});

test('receiver rejects foreign origins and malformed events before writing',async()=>{
 const foreign=await worker.fetch(new Request('https://worker.example/api/session',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json'},body:'{}'}),env);
 assert.equal(foreign.status,403);
 const malformed=await worker.fetch(new Request('https://worker.example/api/session',{method:'POST',headers:{Origin:'https://stepono927.github.io','Content-Type':'application/json'},body:JSON.stringify({sessionId:'not-a-uuid'})}),env);
 assert.equal(malformed.status,400);
});

test('preflight allows only the game origin',async()=>{
 const good=await worker.fetch(new Request('https://worker.example/api/session',{method:'OPTIONS',headers:{Origin:'https://stepono927.github.io'}}),env);
 const bad=await worker.fetch(new Request('https://worker.example/api/session',{method:'OPTIONS',headers:{Origin:'https://foreign.example'}}),env);
 assert.equal(good.headers.get('Access-Control-Allow-Origin'),'https://stepono927.github.io');
 assert.equal(bad.headers.get('Access-Control-Allow-Origin'),null);
});

