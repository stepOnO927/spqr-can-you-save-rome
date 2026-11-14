import {createFictionalPerson} from './dynasties.js?v=faces-empire-2';
import {initializeOffices,OFFICE_TYPES,canHoldOffice,localGovernor} from './office-system.js?v=faces-empire-2';

// Both campaign views use the same one-time setup. Difficulty affects AI
// decisions; the separate economic handicap is explicitly opt-in.
export function configureStartingDifficulty(s,mode='standard',economicHandicap=false){
 if(!['travel','beginner','standard','hard','expert'].includes(mode)||!s.factions?.[s.player])throw new Error('Invalid difficulty');
 if(s.difficultySetupApplied)throw new Error('Difficulty already configured');
 s.difficulty=mode;s.economicHandicap=!!economicHandicap;s.difficultySetupApplied=true;
 if(mode==='beginner'){const f=s.factions[s.player];f.treasury+=20;f.food+=15;f.manpower+=1500;f.stability=Math.min(100,f.stability+5)}
 if(mode==='travel')setupTravel(s);
 return s;
}

function setupTravel(s){
 const faction=s.player,f=s.factions[faction],owned=s.regions.filter(r=>r.owner===faction);
 f.treasury=Math.max(f.treasury,400);f.food=Math.max(f.food,320);
 f.manpower=Math.max(f.manpower,60000);f.stability=Math.max(f.stability,90);
 f.legitimacy=Math.max(f.legitimacy,80);
 for(const r of owned){
  r.loyalty=Math.max(r.loyalty,90);
  if(r.population)r.population.satisfaction=Math.max(r.population.satisfaction??0,90);
 }
 // These are explicitly simulated staff, not claims about historical officeholders.
 // A campaign-start adult must not receive a spurious "born this month" history entry.
 if(['caesar','senate'].includes(faction)&&owned.length){
  const offices=initializeOffices(s);
  const create=(name,location)=>{
   const id=createFictionalPerson(s,{name,faction,birthYear:s.year-35,location,role:['Simulated travel official','旅行模式模拟官员']});
   const person=s.world.characters[id];person.loyalty=88;person.influence=70;person.education=70;person.ambition=30;
   delete s.world.dynasties.lives[id];
   return id;
  };
  const seat=owned.find(r=>r.id==='roma'||r.id==='cisalpine')||owned[0];
  const names={finance:['Travel finance officer','旅行财务官'],supply:['Travel supply officer','旅行粮秣官'],administration:['Travel administrator','旅行行政官']};
  const strong=id=>id&&canHoldOffice(s,faction,id)&&s.world.characters[id].loyalty>=75&&s.world.characters[id].education>=50;
  for(const office of OFFICE_TYPES)if(!strong(offices[faction][office]))offices[faction][office]=create(names[office],seat.id);
  for(const r of owned)if(!strong(localGovernor(s,r.id)))s.world.localGovernors[r.id]={faction,person:create([`Travel governor of ${r.name[0]}`,`${r.name[1]}旅行总督`],r.id)};
 }
 const preferred=faction==='caesar'?['cisalpine','narbo','gaul']:['roma','italiaN','italiaS'];
 const bases=[...preferred.map(id=>owned.find(r=>r.id===id)).filter(Boolean),...owned.filter(r=>!preferred.includes(r.id))].slice(0,3);
 for(const r of bases){
  let id;do{id=`levy${s.nextArmy++}`}while(s.armies.some(a=>a.id===id));
  s.armies.push({id,name:['Travel legion','旅行军团'],owner:faction,region:r.id,men:4500,morale:78,skill:2,experience:2,commander:['Simulated staff officer','模拟参谋'],move:null,siege:null});
 }
}
