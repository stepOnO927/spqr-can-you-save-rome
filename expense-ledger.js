const empty=()=>({construction:0,research:0});

// Orders are paid immediately. Keep only the current month's totals because
// the budget describes this month, while campaign events retain longer history.
export function recordExpense(s,owner,kind,amount){
 if(!['construction','research'].includes(kind)||!Number.isFinite(amount)||amount<=0)return false;
 if(s.expenseLedger?.year!==s.year||s.expenseLedger?.month!==s.month)s.expenseLedger={year:s.year,month:s.month,owners:{}};
 s.expenseLedger.owners||={};
 const totals=s.expenseLedger.owners[owner]||=empty();
 totals[kind]+=amount;
 return true;
}

export function expensesThisMonth(s,owner){
 const ledger=s.expenseLedger;
 if(ledger?.year!==s.year||ledger?.month!==s.month)return empty();
 const totals=ledger.owners?.[owner];
 return totals?{construction:totals.construction||0,research:totals.research||0}:empty();
}
