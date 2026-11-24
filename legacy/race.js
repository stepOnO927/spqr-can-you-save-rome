import {claimReward} from './legacy-core.js?v=22';

export const DRIVERS=['Aurelia','Titus','Livia','Marcellus'];
const RIVALS=['Lucius','Nero','Flavia','Sabina','Claudia','Gaius','Felix','Domitia','Quintus','Valeria','Sextus','Aemilia'];
export function selectableDrivers(eliminated=[]){
 const gone=new Set(Array.isArray(eliminated)?eliminated:[]),available=DRIVERS.filter(name=>!gone.has(name));
 if(available.length)return available;
 let number=1;while(gone.has(`Replacement ${number}`))number++;
 return [`Replacement ${number}`];
}
export function raceRivals(driver,eliminated=[]){
 const unavailable=new Set([driver,...(Array.isArray(eliminated)?eliminated:[])]),chosen=[];
 for(const name of RIVALS)if(!unavailable.has(name)&&chosen.length<4)chosen.push(name);
 for(let number=1;chosen.length<4;number++){const name=`Reserve ${number}`;if(!unavailable.has(name))chosen.push(name)}
 return chosen;
}
export function isOnRaceTrack(x,y,cx,cy,rx,ry){
 const dx=x-cx,dy=y-cy;
 return Math.hypot(dx/(rx-37),dy/(ry-37))>=1&&Math.hypot(dx/(rx+37),dy/(ry+37))<=1;
}
export function advanceTrackProgress(progress,x,y,cx,cy,rx,ry){
 if(!isOnRaceTrack(x,y,cx,cy,rx,ry))return progress;
 const angle=Math.atan2((y-cy)/ry,(x-cx)/rx);
 const next=angle+Math.PI*2*Math.round((progress-angle)/(Math.PI*2));
 // A driver returning from the infield must regain the missed section of track.
 return next>=progress&&next-progress<=.22?next:progress;
}
export function settleRace(profile,race){
 if(!race||typeof race.id!=='string'||!race.id||!Number.isInteger(race.place)||race.place<1||race.place>5||profile.rewards.includes(`race:${race.id}`))return {ok:false};
 const place=race.retired?5:race.place,favor=Math.max(0,Math.min(100,Number(race.favor)||0));
 const payout=[0,100,60,35,15,0][place]+(race.festival&&place<=3?30:0)+(place<=3?Math.floor(Math.max(0,favor-70)/10)*5:0);
 claimReward(profile,`race:${race.id}`,payout);profile.race.runs++;profile.race.best=Math.min(profile.race.best,place);
 if(place===1){profile.race.wins++;profile.collectibles.push('race-cup');profile.titles.push('Circus Champion');if(race.track==='tight'){profile.collectibles.push('tight-cup');profile.race.champions=[...new Set([...(profile.race.champions||[]),'tight'])]}}
 if(race.lastDriver&&!profile.race.eliminated.includes(race.lastDriver))profile.race.eliminated.push(race.lastDriver);
 profile.collectibles=[...new Set(profile.collectibles)];profile.titles=[...new Set(profile.titles)];return {ok:true,payout};
}
export function startRace(canvas,hud,driver,onFinish,festival=false,raceColor='gold',track='oval',language='en',eliminated=[]){
 const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,cx=W/2,cy=H/2,rx=track==='tight'?235:260,ry=track==='tight'?112:145,TAU=Math.PI*2;
 const tr=(en,zh)=>language==='zh'?zh:en;
 const drivers=[driver,...raceRivals(driver,eliminated)];
 const racers=drivers.map((name,i)=>({name,x:cx+rx*Math.cos(-i*.105),y:cy+ry*Math.sin(-i*.105),theta:-i*.105,progress:-i*.105,speed:0,heading:Math.PI/2-i*.08,stamina:100,durability:100,favor:50,cleanLap:true,nextLap:1,offTrack:false,lastCollision:-1,finished:null,color:i===0&&raceColor==='blue'?'#4d82af':['#dfad4c','#b75842','#638caa','#a179a4','#6f9a72'][i]}));
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
  ctx.fillStyle='#5d4934';ctx.font='bold 17px Georgia';ctx.textAlign='center';ctx.fillText(track==='tight'?'CIRCVS ANGVSTVS':'CIRCUS MARTIS',cx,cy+5);ctx.textAlign='left';
  ctx.fillStyle='#f5e5bb';ctx.fillRect(cx+rx-42,cy-44,5,88);
  for(const r of racers){ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.heading-Math.PI/2);ctx.fillStyle='#312d2799';ctx.beginPath();ctx.ellipse(1,8,12,15,0,0,TAU);ctx.fill();ctx.strokeStyle='#e8d8b7';ctx.lineWidth=1;for(const hx of [-6,6]){ctx.fillStyle='#e1c9a3';ctx.beginPath();ctx.ellipse(hx,-13,4,8,0,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(hx,-19);ctx.lineTo(hx-2,-24);ctx.lineTo(hx+1,-22);ctx.stroke()}ctx.fillStyle=r.color;ctx.fillRect(-9,-2,18,18);ctx.fillStyle='#403329';for(const wx of [-11,11]){ctx.beginPath();ctx.arc(wx,12,3,0,TAU);ctx.fill()}ctx.fillStyle='#f7e6bd';ctx.beginPath();ctx.arc(0,1,4,0,TAU);ctx.fill();ctx.restore()}
  ctx.fillStyle='#fff1d4';ctx.font='bold 13px Georgia';ctx.fillText(tr('↑ accelerate · ↓ brake · ← → steer · SPACE burst','↑ 加速 · ↓ 制动 · ← → 转向 · 空格 冲刺'),14,24)
 }
  function frame(now){
   const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;elapsed+=dt;
   const p=racers[0];
   if(!p.finished&&!p.retired){
    const accel=keys.has('ArrowUp')||keys.has('KeyW'),brake=keys.has('ArrowDown')||keys.has('KeyS'),left=keys.has('ArrowLeft')||keys.has('KeyA'),right=keys.has('ArrowRight')||keys.has('KeyD'),burst=keys.has('Space')&&p.stamina>5;
    // Damaged wheels reduce top speed and steering before they fail completely.
    const wheelFactor=.55+.45*p.durability/100;
    p.speed=Math.min((burst?300:252)*wheelFactor,Math.max(0,p.speed+(accel?180:brake?-240:-65)*dt));
    if(burst)p.stamina=Math.max(0,p.stamina-22*dt);else p.stamina=Math.min(100,p.stamina+(5+p.favor*.04)*dt);
    const steer=(right?1:0)-(left?1:0);
    p.heading+=steer*dt*(1.6+Math.min(p.speed,180)/145)*(.75+.25*p.durability/100);
    p.x+=Math.cos(p.heading)*p.speed*dt;p.y+=Math.sin(p.heading)*p.speed*dt;
    const outside=!isOnRaceTrack(p.x,p.y,cx,cy,rx,ry);
    if(outside){p.speed*=Math.max(.7,1-.45*dt);p.durability=Math.max(0,p.durability-3*dt);if(!p.offTrack){p.favor=Math.max(0,p.favor-5);p.cleanLap=false}}
    p.offTrack=outside;
    const previous=p.progress;
    p.progress=advanceTrackProgress(previous,p.x,p.y,cx,cy,rx,ry);
    p.favor=Math.min(100,p.favor+(p.progress-previous)*1.5);
    while(p.progress>=p.nextLap*TAU){if(p.cleanLap)p.favor=Math.min(100,p.favor+8);p.cleanLap=true;p.nextLap++}
    if(p.progress>=3*TAU)p.finished=elapsed;
    if(p.durability===0)p.retired=true;
   }
  for(let i=1;i<racers.length;i++){const a=racers[i];if(a.finished)continue;const pace=[0,.50,.55,.60,.54][i]*(festival?1.2:1)*(1+Math.sin(elapsed*.7+i)*.045);a.progress+=pace*dt;a.x=cx+(rx+(i-2)*13)*Math.cos(a.progress);a.y=cy+(ry+(i-2)*9)*Math.sin(a.progress);a.heading=Math.atan2((ry+(i-2)*9)*Math.cos(a.progress),-(rx+(i-2)*13)*Math.sin(a.progress));if(a.progress>=3*TAU)a.finished=elapsed}
  for(let i=1;i<racers.length;i++){const a=racers[i],distance=Math.hypot(p.x-a.x,p.y-a.y);if(!p.finished&&!p.retired&&distance<20&&elapsed-p.lastCollision>.75){p.lastCollision=elapsed;p.speed*=.8;p.durability=Math.max(0,p.durability-8);p.favor=Math.max(0,p.favor-8);p.cleanLap=false;p.x+=distance?(p.x-a.x)/distance*13:13;p.y+=distance?(p.y-a.y)/distance*13:0;a.progress-=.015}}
  if(p.durability===0)p.retired=true;
  paint();const lap=Math.min(3,Math.max(1,Math.floor(p.progress/TAU)+1));hud.textContent=tr(`${lap}/3 LAPS · ${Math.round(p.speed)} SPEED · ${Math.round(p.stamina)} STAMINA · ${Math.round(p.durability)} WHEELS · ${Math.round(p.favor)} FAVOR · ${Math.round(elapsed)}s`,`第 ${lap}/3 圈 · 速度 ${Math.round(p.speed)} · 体力 ${Math.round(p.stamina)} · 车轮 ${Math.round(p.durability)} · 观众支持 ${Math.round(p.favor)} · ${Math.round(elapsed)}秒`);
  if(p.retired||(p.finished&&racers.slice(1).every(r=>r.finished||elapsed>p.finished+8))||elapsed>75){
   ended=true;
   const ranked=[...racers].sort((a,b)=>(a.finished??Infinity)-(b.finished??Infinity)||b.progress-a.progress);
   const place=p.retired?5:ranked.findIndex(r=>r===p)+1;
   cleanup();onFinish({id:randomId,driver,place,lastDriver:p.retired?p.name:ranked.at(-1).name,elapsed:Math.round(elapsed),durability:Math.round(p.durability),favor:Math.round(p.favor),retired:!!p.retired,festival,track});return;
  }
  raf=requestAnimationFrame(frame);
 }
 function cleanup(){cancelAnimationFrame(raf);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}
 raf=requestAnimationFrame(frame);return {stop:cleanup,control:(key,on)=>{if(on)keys.add(key);else keys.delete(key)},snapshot:()=>({x:racers[0].x,y:racers[0].y,heading:racers[0].heading,progress:racers[0].progress,speed:racers[0].speed,durability:racers[0].durability,favor:racers[0].favor,retired:!!racers[0].retired,elapsed}),get ended(){return ended}};
}
