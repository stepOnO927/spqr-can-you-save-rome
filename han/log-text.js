import {FACTIONS, REGIONS} from './data.js?v=dossier-archive-1';

export function formatHanLog(state, entry, lang = 0) {
 const text = entry?.text ?? entry?.message ?? entry;
 const template = Array.isArray(text) ? (text[lang] ?? text[0]) : text;
 const person = id => state.persons?.[id]?.name?.[lang] ?? id ?? '';
 const faction = id => FACTIONS[id]?.name?.[lang] ?? id ?? '';
 const region = id => REGIONS.find(item => item.id === id)?.name?.[lang] ?? id ?? '';
 return String(template ?? '').replace(/%NAME2%|%NAME%|%REGION%|%FACTION2%|%FACTION%/g, token => ({
  '%NAME2%': person(entry?.who2),
  '%NAME%': person(entry?.who),
  '%REGION%': region(entry?.region),
  '%FACTION2%': faction(entry?.faction2),
  '%FACTION%': faction(entry?.faction),
 })[token]);
}
