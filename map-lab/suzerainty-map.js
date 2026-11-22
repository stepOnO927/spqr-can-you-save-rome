import {subjectRelation} from '../suzerainty.js?v=world-kings-village-foothold-1';

// The atlas receives reported controllers, never hidden current foreign
// theater ownership. A treaty alone does not paint unseen land as known.
export function suzeraintyColor(state, viewer, reportedOwners) {
  if (reportedOwners.length !== 1) return '#b39757';
  const owner = reportedOwners[0];
  if (owner === viewer) return '#a74737';
  if (!owner || owner === 'shared') return '#65756d';
  if (subjectRelation(state, owner)?.terms.subject.suzerain === viewer) return '#c0a35b';
  if (subjectRelation(state, viewer)?.terms.subject.suzerain === owner) return '#6d91ac';
  return '#65756d';
}
