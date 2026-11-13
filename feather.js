// Feather reads only the player's own state and public forecast. Advice never
// inspects hidden foreign armies, plans, or exact losses.
export function featherAdvice(s,lang='en',forecast=null){
 const zh=lang==='zh',player=s.player,f=s.factions[player],own=s.regions.filter(r=>r.owner===player);
 const armies=s.armies.filter(a=>a.owner===player&&a.men>0);
 const label=r=>r?.name?.[zh?1:0]||r?.id||'';
 const tips=[];
 const add=(en,cn)=>tips.push(zh?cn:en);
 if(s.defeat)return [zh?'战役已经结束。打开战报复盘最后的失地与军队损失。':'The campaign has ended. Review the Chronicle for the final territorial and army losses.'];
 if(f.food<25)add('Food is low. Hold exposed armies near supplied theaters and check next month’s forecast before marching.','粮食偏低。先让前线军队靠近补给充足的战区，推进前查看下月预测。');
 if(f.treasury<30)add('Treasury is low. Delay new recruitment and sea transport until the monthly balance improves.','国库偏低。先缓征新军、避免海运，等月度收支改善。');
 if(f.stability<55)add('Political stability is fragile. Check taxation and local loyalty before extending the front.','政治稳定不足。扩大战线前先检查税率与地方忠诚。');
 const weak=armies.filter(a=>a.men<3000&&!a.move&&!a.siege);
 if(weak.length)add(`${weak.length} field army or armies are below 3,000 men. Inspect reinforcement costs and available manpower before committing them.`,`${weak.length}支野战军不足3000人。投入战斗前检查补员费用和可用兵源。`);
 const lowMorale=armies.filter(a=>a.morale<55);
 if(lowMorale.length)add(`${lowMorale.length} army or armies have low morale. Rally or defend while they recover.`,`${lowMorale.length}支军队士气偏低。可以重整或先守住阵地。`);
 const empty=own.filter(r=>!armies.some(a=>a.region===r.id&&!a.move));
 if(empty.length)add(`${label(empty[0])} has no stationary field army. Moving the last defender elsewhere may let this theater fall without a battle.`,`${label(empty[0])}没有留守野战军。若撤走最后的守军，战区可能未经战斗就失守。`);
 if(forecast&&(forecast.treasury<0||forecast.food<0))add(`Next month’s forecast is ${forecast.treasury>=0?'+':''}${forecast.treasury} treasury and ${forecast.food>=0?'+':''}${forecast.food} food. Plan for the deficit before issuing costly orders.`,`预计下月国库${forecast.treasury>=0?'+':''}${forecast.treasury}、粮食${forecast.food>=0?'+':''}${forecast.food}。下达昂贵命令前先考虑赤字。`);
 const marching=armies.filter(a=>a.move);
 if(marching.length)add(`${marching.length} army or armies are marching. Check their destinations and keep a reserve before advancing time.`,`${marching.length}支军队正在行军。推进月份前检查目的地，并留出预备队。`);
 if(!tips.length)add('Your resources and armies are steady. Compare the reported controller, terrain, supply, and uncertain enemy intelligence before the next attack.','资源与军队暂时稳定。下次进攻前比较报告中的控制方、地形、补给和可能过时的敌情。');
 if(tips.length<3)add('Three objectives are milestones, not final victory. Open Objectives to track remaining hostile theaters, field armies, and courier confirmation.','三个阶段目标不等于最终胜利。打开“目标”检查剩余敌方战区、野战军和信使确认进度。');
 if(tips.length<3)add('Orders resolve when you advance a month. Save before a major decision and read the battle report afterward.','命令在推进月份时结算。重大决策前可存档，战后再读战报。');
 return tips.slice(0,3);
}
