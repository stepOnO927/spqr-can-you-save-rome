import {eligibleTitleAssets} from '../peace-titles.js';

export function showIncomingTitleTerms({box, incoming, state, language}) {
  const letter = incoming.find(item => item.status === 'awaiting_decision' && item.titleAsset);
  if (!letter) return;
  const asset = eligibleTitleAssets(state, letter.actor, letter.target).find(item => item.kind === letter.titleAsset.kind && item.id === letter.titleAsset.id);
  const note = document.createElement('p');
  note.textContent = asset
    ? language === 'zh' ? `条款：接受后，将承认 ${asset.name[1]} 的法理归属属于对方；回信送达前不会生效。` : `Term: acceptance recognizes the other side's legal title to ${asset.name[0]}; it takes effect only when the reply arrives.`
    : language === 'zh' ? '条款中的领地控制或法理状态已经改变，原提议不能生效。' : 'The proposed place has changed control or title; the original term can no longer take effect.';
  box.append(note);
}

export function showOutgoingTitleTerms({panel, letters, state, language}) {
  const offers = letters.filter(item => item.subject === 'peace' && item.titleAsset);
  if (!offers.length) return;
  const section = document.createElement('section');
  section.className = 'help-list';
  const heading = document.createElement('strong');
  heading.textContent = language === 'zh' ? '议和书信中的领地条款' : 'Territorial terms in peace letters';
  section.append(heading);
  for (const offer of offers.slice(0, 5)) {
    const place = offer.titleAsset.kind === 'theater'
      ? state.regions.find(item => item.id === offer.titleAsset.id)
      : state.regions.flatMap(item => item.localEntities || []).find(item => item.id === offer.titleAsset.id);
    const note = document.createElement('p');
    note.textContent = `${place?.name?.[language === 'zh' ? 1 : 0] || offer.titleAsset.id} · ${offer.status} · ${language === 'zh' ? '请求承认我方法理归属' : 'request to recognize our legal title'}`;
    section.append(note);
  }
  panel.append(section);
}

export function bindPeaceTitleChoice({panel, state, actor, target, language, send, refresh}) {
  const button = panel.querySelector('[data-diplomacy="peace"]');
  if (!button) return;
  const assets = eligibleTitleAssets(state, actor, target), picker = document.createElement('select');
  picker.id = 'peace-title-asset';
  picker.setAttribute('aria-label', language === 'zh' ? '议和中的法理归属条款' : 'Legal title term in peace offer');
  picker.add(new Option(language === 'zh' ? '仅停战，维持现状' : 'End the war, keep current titles', ''));
  for (const asset of assets) picker.add(new Option(`${language === 'zh' ? asset.name[1] : asset.name[0]} · ${asset.kind === 'local' ? language === 'zh' ? '城镇' : 'town' : language === 'zh' ? '战区' : 'theater'}`, `${asset.kind}:${asset.id}`));
  const note = document.createElement('p');
  note.textContent = language === 'zh' ? '可请求对方通过条约承认一个已控制地点的法理归属。谈判需数月，可能被拒或遗失；占领本身不改变法理。' : 'You may request treaty recognition for one place you already control. The letter takes months and may be refused or lost; occupation alone does not change title.';
  button.parentElement.before(note, picker);
  button.onclick = () => {
    const selected = picker.value, asset = selected ? assets.find(item => `${item.kind}:${item.id}` === selected) : null;
    const result = send(state, actor, target, 'peace', asset ? {titleAsset: {kind: asset.kind, id: asset.id}} : {});
    if (result.ok) refresh();
    else panel.querySelector('#diplomacy-feedback').textContent = language === 'zh' ? `无法寄信：${result.reason}。` : `Cannot send: ${result.reason}.`;
  };
}
