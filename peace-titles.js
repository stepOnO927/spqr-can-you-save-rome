import {localEntity} from './local-polities.js';

const atWar = (state, actor, target) => state.wars.some(pair => pair.includes(actor) && pair.includes(target));

// A peace offer may request recognition for one already-controlled place. It
// cannot use a treaty letter to take a place that the sender has not secured.
export function titleAssetQuote(state, actor, target, asset) {
  if (!asset || !['theater', 'local'].includes(asset.kind) || typeof asset.id !== 'string' || !state.factions[actor] || !state.factions[target] || !atWar(state, actor, target)) return {ok: false, reason: 'invalid'};
  const place = asset.kind === 'theater' ? state.regions.find(region => region.id === asset.id) : localEntity(state, asset.id);
  const controller = asset.kind === 'theater' ? place?.owner : place?.controller;
  if (!place || controller !== actor || place.legalSovereign !== target) return {ok: false, reason: 'title_or_control'};
  return {ok: true, asset: {kind: asset.kind, id: asset.id}, name: place.name};
}

export function eligibleTitleAssets(state, actor, target) {
  const choices = [];
  for (const region of state.regions) {
    if (region.owner === actor && region.legalSovereign === target && titleAssetQuote(state, actor, target, {kind: 'theater', id: region.id}).ok) choices.push({kind: 'theater', id: region.id, name: region.name});
    for (const entity of region.localEntities || []) if (entity.controller === actor && entity.legalSovereign === target && titleAssetQuote(state, actor, target, {kind: 'local', id: entity.id}).ok) choices.push({kind: 'local', id: entity.id, name: entity.name});
  }
  return choices;
}

export function settleTitleByTreaty(state, actor, target, asset) {
  const quote = titleAssetQuote(state, actor, target, asset);
  if (!quote.ok) return quote;
  const place = asset.kind === 'theater' ? state.regions.find(region => region.id === asset.id) : localEntity(state, asset.id);
  place.legalSovereign = actor;
  place.militaryOccupier = null;
  place.administrativeStatus = 'integrated';
  place.titleTreaty = {from: target, to: actor, year: state.year, month: state.month};
  (state.world.territorialSettlements ||= []).push({asset: {...quote.asset}, from: target, to: actor, year: state.year, month: state.month});
  return {ok: true, asset: quote.asset};
}
