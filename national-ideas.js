// Expansion effects use the existing invention/idea controller and its active slots.
export function hasNationalIdea(s,actor,id){return Object.values(s.inventions?.[actor]?.active||{}).some(ids=>ids.includes('gc_'+id))}
