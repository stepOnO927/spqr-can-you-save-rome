import {snapshotFictionalCatalog,restoreFictionalCatalog} from './characters.js?v=world-kings-estate-village-1';
import {validPlayableCampaign} from './local-campaign-save.js?v=world-kings-estate-village-1';
// A one-use transfer between views in the same tab; saved game slots are untouched.
export const HANDOFF_KEY = 'spqr-view-handoff-v1';

export function stageHandoff(storage, state, target) {
  if (!['atlas', 'campaign'].includes(target)) throw new Error('Invalid destination');
  storage.setItem(HANDOFF_KEY, JSON.stringify({target, state}));
  // A storage wrapper can fall back to memory after a write fails. That copy
  // will disappear during navigation, so never claim the handoff succeeded.
  if (storage.persistent === false) throw new Error('Session storage could not persist the campaign');
}

export function receiveHandoff(storage, target, upgrade) {
  const priorCatalog=snapshotFictionalCatalog();
  try {
    const raw = storage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const transfer = JSON.parse(raw);
    if (transfer.target !== target || !validPlayableCampaign(transfer.state)) return null;
    const state = upgrade(transfer.state);
    if (!state.factions?.[state.player]){restoreFictionalCatalog(priorCatalog);return null}
    storage.removeItem(HANDOFF_KEY);
    return state;
  } catch {
    restoreFictionalCatalog(priorCatalog);
    return null;
  }
}

