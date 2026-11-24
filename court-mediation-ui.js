import {courtMediationPlan} from './character-system.js?v=77';

export function courtMediationHtml(s,language='en'){
 const actor=s.player;
 if(!['egypt','parthia'].includes(actor)||!s.world?.disputes?.[actor])return '';
 const zh=language==='zh',plan=courtMediationPlan(s,actor);
 const explanation=zh?'争议持续期间，每三个月损失1稳定度和3国库。出资15国库召集调解；下次宫廷审议可能达成和解，也可能失败。':'An unresolved court dispute costs 1 stability and 3 treasury every three months. Spend 15 treasury to convene mediation. The next court review may reconcile the claim, but can fail.';
 const reason=plan.ok?'':zh?({pending:'调解已安排，等待宫廷审议。',cooldown:`须再等${plan.waitMonths}个月才能再次召集调解。`,treasury:'国库不足15。',vacancy:'执政者空缺，须先解决继承。',dispute:'目前没有可参与调解的竞争者。'}[plan.reason]||'此时无法调解。'):({pending:'Mediation is pending the next court review.',cooldown:`Wait ${plan.waitMonths} more month(s) before another mediation.`,treasury:'At least 15 treasury is required.',vacancy:'The ruler is vacant; succession must be settled first.',dispute:'No available rival claimant can be mediated.'}[plan.reason]||'Mediation is unavailable.');
 return `<section class="court-mediation"><h3>${zh?'宫廷继承争议':'Court succession dispute'}</h3><p>${explanation}</p><button class="action" data-mediate-court ${plan.ok?'':'disabled'}>${zh?'召集调解 · 15国库':'Convene mediation · 15 treasury'}</button>${reason?`<p class="court-mediation-reason">${reason}</p>`:''}</section>`;
}
