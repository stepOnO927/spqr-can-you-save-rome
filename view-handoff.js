// A one-use transfer between views in the same tab; saved game slots are untouched.
import {PLAYABLE} from './engine.js';
export const HANDOFF_KEY = 'spqr-view-handoff-v1';

export function stageHandoff(storage, state, target) {
  if (!['atlas', 'campaign'].includes(target)) throw new Error('Invalid destination');
  storage.setItem(HANDOFF_KEY, JSON.stringify({target, state}));
}

export function receiveHandoff(storage, target, upgrade) {
  try {
    const raw = storage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const transfer = JSON.parse(raw);
    if (transfer.target !== target || !transfer.state || !Array.isArray(transfer.state.regions) || !Array.isArray(transfer.state.armies) || !transfer.state.factions || !PLAYABLE.includes(transfer.state.player)) return null;
    const state = upgrade(transfer.state);
    if (!state.factions[state.player]) return null;
    storage.removeItem(HANDOFF_KEY);
    return state;
  } catch {
    return null;
  }
}
