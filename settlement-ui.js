import {publicSettlementTerms} from './campaign-outcome.js?v=9';

// Explain only the player's own government and ownership visible on the map.
// The opponent's true field strength remains a private acceptance condition.
export function settlementAdvice(s,actor,target,language='en'){
 const terms=publicSettlementTerms(s,actor,target);
 if(!terms)return '';
 const zh=language==='zh',losses=Math.max(0,terms.initial-terms.held),issues=[];
 if(!terms.strategicReady)issues.push(zh?(actor==='senate'?'须控制罗马和山南高卢。':'须控制罗马。'):(actor==='senate'?'Control Rome and Cisalpine Gaul.':'Control Rome.'));
 if(losses<terms.requiredLosses)issues.push(zh?`对方相对开局的领土损失为${losses}/${terms.requiredLosses}。`:`Opposing territorial losses since the opening: ${losses}/${terms.requiredLosses}.`);
 if(terms.legitimacy<35||terms.stability<30)issues.push(zh?`本方合法性须至少35、稳定度至少30；当前为${terms.legitimacy}和${terms.stability}。`:`Your legitimacy must reach 35 and stability 30; currently ${terms.legitimacy} and ${terms.stability}.`);
 if(terms.waitMonths)issues.push(zh?`下次使团还需等待${terms.waitMonths}个月。`:`Wait ${terms.waitMonths} more month(s) before another mission.`);
 if(terms.treasury<4)issues.push(zh?'国库不足4，无法派出使团。':'At least 4 treasury is needed to send a mission.');
 const uncertainty=zh?'对方实际野战兵力仍不明，符合公开条件也可能遭拒；派出的使团消耗4国库。':'The rival field force remains uncertain, so a proposal may still be refused; a sent mission costs 4 treasury.';
 return issues.length?`${zh?'公开战局条件：':'Public campaign conditions: '}${issues.join(' ')} ${uncertainty}`:`${zh?'已满足公开的战略、领土与本方政治条件。':'Public strategic, territorial and own political conditions appear met.'} ${uncertainty}`;
}
