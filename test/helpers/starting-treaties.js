import {initializeAgreements} from '../../agreements.js?v=focus-agreement-consent-1';
import {rememberTreatyCopy,treatyDocument} from '../../treaty-observation.js?v=treaty-observation-1';
// Scenario setup only. Explicitly establish what each signing court already
// knows before the test starts. Never call after a hidden-state comparison.
export function startingTreaties(s){
 initializeAgreements(s);
 for(const pact of s.alliances||[])rememberTreatyCopy(s,treatyDocument(pact,'alliance'));
 for(const t of s.agreements||[])if(t.status==='active')rememberTreatyCopy(s,treatyDocument(t));
 for(const c of s.coalitions||[])if(c.status==='active')rememberTreatyCopy(s,treatyDocument(c,'coalition'));
 return s;
}
