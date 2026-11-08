// Both campaign views use the same one-time setup. Difficulty affects AI
// decisions; the separate economic handicap is explicitly opt-in.
export function configureStartingDifficulty(s,mode='standard',economicHandicap=false){
 if(!['beginner','standard','hard','expert'].includes(mode)||!s.factions?.[s.player])throw new Error('Invalid difficulty');
 if(s.difficultySetupApplied)throw new Error('Difficulty already configured');
 s.difficulty=mode;s.economicHandicap=!!economicHandicap;s.difficultySetupApplied=true;
 if(mode==='beginner'){const f=s.factions[s.player];f.treasury+=20;f.food+=15;f.manpower+=1500;f.stability=Math.min(100,f.stability+5)}
 return s;
}
