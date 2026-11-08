// Memories belong to the leader who experienced an event; successors do not
// automatically inherit private knowledge. Effects fade over ten years.
const now=s=>s.year*12+s.month;
export function rememberPoliticalEvent(s,observer,subject,kind,weight){
 const person=(s.world?.leadership?.[observer]||[]).find(id=>s.world.characters[id]?.alive);
 if(!person)return;rememberPersonalEvent(s,person,subject,kind,weight);
}
export function rememberPersonalEvent(s,person,subject,kind,weight){
 const observer=s.world?.characters?.[person]?.faction;
 if(!observer||!s.factions[subject]||!Number.isFinite(weight))return;
 s.world.politicalMemories||=[];
 s.world.politicalMemories.push({person,observer,subject,kind,weight,year:s.year,month:s.month});
 if(s.world.politicalMemories.length>300)s.world.politicalMemories.splice(0,s.world.politicalMemories.length-300);
}
export function personalMemoryAdjustment(s,person,subject){
 const value=(s.world?.politicalMemories||[]).filter(m=>m.person===person&&m.subject===subject).reduce((sum,m)=>{const age=now(s)-(m.year*12+m.month);return sum+(age>=0?m.weight*Math.max(0,1-age/120):0)},0);
 return Math.max(-20,Math.min(12,value));
}
export function politicalMemoryAdjustment(s,observer,subject){
 const leaders=new Set(s.world?.leadership?.[observer]||[]);
 const value=(s.world?.politicalMemories||[]).filter(m=>m.observer===observer&&m.subject===subject&&leaders.has(m.person)&&s.world.characters[m.person]?.alive).reduce((sum,m)=>{const age=now(s)-(m.year*12+m.month);return sum+(age>=0?m.weight*Math.max(0,1-age/120):0)},0);
 return Math.max(-20,Math.min(12,value));
}
