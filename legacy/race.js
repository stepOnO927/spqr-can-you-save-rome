import {claimReward} from './legacy-core.js';

export const DRIVERS=['Aurelia','Titus','Livia','Marcellus'];
export function settleRace(profile,race){
 if(!race||!race.id||profile.rewards.includes(`race:${race.id}`))return {ok:false};
 const place=Math.max(1,Math.min(5,race.place)),payout=[0,100,60,35,15,0][place]+(race.festival&&place<=3?30:0);
 claimReward(profile,`race:${race.id}`,payout);profile.race.runs++;profile.race.best=Math.min(profile.race.best,place);
 if(place===1){profile.race.wins++;profile.collectibles.push('race-cup');profile.titles.push('Circus Champion')}
 if(race.lastDriver&&!profile.race.eliminated.includes(race.lastDriver))profile.race.eliminated.push(race.lastDriver);
 profile.collectibles=[...new Set(profile.collectibles)];profile.titles=[...new Set(profile.titles)];return {ok:true,payout};
}
export function startRace(canvas,hud,driver,onFinish,festival=false,raceColor='gold'){
 const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,cx=W/2,cy=H/2,rx=260,ry=145,TAU=Math.PI*2;
 const drivers=[driver,'Lucius','Nero','Flavia','Sabina'];
 const racers=drivers.map((name,i)=>({name,x:cx+rx*Math.cos(-i*.105),y:cy+ry*Math.sin(-i*.105),theta:-i*.105,progress:-i*.105,speed:0,heading:Math.PI/2-i*.08,stamina:100,durability:100,lastCollision:-1,finished:null,color:i===0&&raceColor==='blue'?'#4d82af':['#dfad4c','#b75842','#638caa','#a179a4','#6f9a72'][i]}));
 let raf=0,last=performance.now(),elapsed=0,ended=false;const keys=new Set(),down=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();keys.add(e.code)}},up=e=>keys.delete(e.code);
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);const randomId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
 function paint(){
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#47634f';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#8a7859';ctx.beginPath();ctx.ellipse(cx,cy,rx+70,ry+70,0,0,TAU);ctx.fill();
  ctx.strokeStyle='#d6c29b';ctx.lineWidth=10;ctx.beginPath();ctx.ellipse(cx,cy,rx+61,ry+61,0,0,TAU);ctx.stroke();
  ctx.fillStyle='#a2754d';ctx.beginPath();ctx.ellipse(cx,cy,rx+37,ry+37,0,0,TAU);ctx.fill();
  ctx.strokeStyle='#e0c69a';ctx.lineWidth=3;for(const inset of [-28,0,28]){ctx.beginPath();ctx.ellipse(cx,cy,rx+inset,ry+inset,0,0,TAU);ctx.stroke()}
  ctx.fillStyle='#d9c294';ctx.beginPath();ctx.ellipse(cx,cy,rx-37,ry-37,0,0,TAU);ctx.fill();
  ctx.fillStyle='#55735c';ctx.beginPath();ctx.ellipse(cx,cy,rx-46,ry-46,0,0,TAU);ctx.fill();
  ctx.fillStyle='#d8c49a';ctx.fillRect(cx-94,cy-17,188,34);ctx.strokeStyle='#8a6848';ctx.lineWidth=3;ctx.strokeRect(cx-94,cy-17,188,34);
  for(const x of [-70,-35,0,35,70]){ctx.fillStyle='#9d7650';ctx.fillRect(cx+x-2,cy-25,4,50);ctx.fillStyle='#e8d9b5';ctx.beginPath();ctx.arc(cx+x,cy,5,0,TAU);ctx.fill()}
  ctx.fillStyle='#5d4934';ctx.font='bold 17px Georgia';ctx.textAlign='center';ctx.fillText('CIRCUS MARTIS',cx,cy+5);ctx.textAlign='left';
  ctx.fillStyle='#f5e5bb';ctx.fillRect(cx+rx-42,cy-44,5,88);
  for(const r of racers){ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.heading-Math.PI/2);ctx.fillStyle='#312d2799';ctx.beginPath();ctx.ellipse(1,8,12,15,0,0,TAU);ctx.fill();ctx.strokeStyle='#e8d8b7';ctx.lineWidth=1;for(const hx of [-6,6]){ctx.fillStyle='#e1c9a3';ctx.beginPath();ctx.ellipse(hx,-13,4,8,0,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(hx,-19);ctx.lineTo(hx-2,-24);ctx.lineTo(hx+1,-22);ctx.stroke()}ctx.fillStyle=r.color;ctx.fillRect(-9,-2,18,18);ctx.fillStyle='#403329';for(const wx of [-11,11]){ctx.beginPath();ctx.arc(wx,12,3,0,TAU);ctx.fill()}ctx.fillStyle='#f7e6bd';ctx.beginPath();ctx.arc(0,1,4,0,TAU);ctx.fill();ctx.restore()}
  ctx.fillStyle='#fff1d4';ctx.font='bold 13px Georgia';ctx.fillText('↑ accelerate · ↓ brake · ← → steer · SPACE burst',14,24)
 }
 function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;const p=racers[0];if(!p.finished){const accel=keys.has('ArrowUp')||keys.has('KeyW'),brake=keys.has('ArrowDown')||keys.has('KeyS'),left=keys.has('ArrowLeft')||keys.has('KeyA'),right=keys.has('ArrowRight')||keys.has('KeyD'),burst=keys.has('Space')&&p.stamina>5;p.speed=Math.min(burst?300:252,Math.max(0,p.speed+(accel?180:brake?-240:-65)*dt));if(burst)p.stamina=Math.max(0,p.stamina-22*dt);else p.stamina=Math.min(100,p.stamina+7*dt);const steer=(right?1:0)-(left?1:0);p.heading+=steer*dt*(1.6+Math.min(p.speed,180)/145);p.x+=Math.cos(p.heading)*p.speed*dt;p.y+=Math.sin(p.heading)*p.speed*dt;const radius=Math.hypot((p.x-cx)/rx,(p.y-cy)/ry);if(radius<.75||radius>1.3){p.speed*=Math.max(.7,1-.45*dt);p.durability=Math.max(0,p.durability-3*dt)}if(radius>.58&&radius<1.5){let angle=Math.atan2((p.y-cy)/ry,(p.x-cx)/rx);while(angle<p.progress-3)angle+=TAU;while(angle>p.progress+3)angle-=TAU;if(angle>p.progress-.35)p.progress=Math.max(p.progress,angle)}if(p.progress>=3*TAU)p.finished=elapsed;}
 for(let i=1;i<racers.length;i++){const a=racers[i];if(a.finished)continue;const pace=[0,.50,.55,.60,.54][i]*(festival?1.2:1)*(1+Math.sin(elapsed*.7+i)*.045);a.progress+=pace*dt;a.x=cx+(rx+(i-2)*13)*Math.cos(a.progress);a.y=cy+(ry+(i-2)*9)*Math.sin(a.progress);a.heading=Math.atan2((ry+(i-2)*9)*Math.cos(a.progress),-(rx+(i-2)*13)*Math.sin(a.progress));if(a.progress>=3*TAU)a.finished=elapsed}
 for(let i=1;i<racers.length;i++){const a=racers[i],distance=Math.hypot(p.x-a.x,p.y-a.y);if(!p.finished&&distance<20&&elapsed-p.lastCollision>.75){p.lastCollision=elapsed;p.speed*=.8;p.durability=Math.max(0,p.durability-8);p.x+=distance?(p.x-a.x)/distance*13:13;p.y+=distance?(p.y-a.y)/distance*13:0;a.progress-=.015}}
 paint();hud.textContent=`${Math.min(3,Math.max(1,Math.floor(p.progress/TAU)+1))}/3 LAPS · ${Math.round(p.speed)} SPEED · ${Math.round(p.stamina)} STAMINA · ${Math.round(p.durability)} WHEELS · ${Math.round(elapsed)}s`;
 if((p.finished&&racers.slice(1).every(r=>r.finished||elapsed>p.finished+8))||elapsed>75){ended=true;const ranked=[...racers].sort((a,b)=>(a.finished??Infinity)-(b.finished??Infinity)||b.progress-a.progress),place=ranked.findIndex(r=>r===p)+1;cleanup();onFinish({id:randomId,driver,place,lastDriver:ranked.at(-1).name,elapsed:Math.round(elapsed),durability:Math.round(p.durability),festival});return}raf=requestAnimationFrame(frame)}
 function cleanup(){cancelAnimationFrame(raf);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}
 raf=requestAnimationFrame(frame);return {stop:cleanup,control:(key,on)=>{if(on)keys.add(key);else keys.delete(key)},snapshot:()=>({x:racers[0].x,y:racers[0].y,heading:racers[0].heading,progress:racers[0].progress,speed:racers[0].speed,elapsed}),get ended(){return ended}};
}
