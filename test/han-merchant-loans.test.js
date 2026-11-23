import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=faces-name-disagreement-1';
import {createMarketMerchant} from '../han/field-identities.js';
import {advanceEasternMarkets,quoteEasternMerchantLoan,repayEasternMerchantLoan,requestEasternMerchantLoan} from '../han/markets.js?v=faces-wheels-1';

function setup(){
 const s=newHanGame('han',{seed:418});s.tradeMarkets.embeddedRoman=true;
 const id=createMarketMerchant(s,'han','changan');s.tradeMarkets.merchants.han=[id];
 s.persons[id].wealth=12;s.persons[id].marketReputation=2;s.factions.han.treasury=50;
 return {s,id};
}
function next(s){if(++s.month>12){s.month=1;s.year++}advanceEasternMarkets(s)}

test('a named merchant lends real capital and early repayment transfers the full debt once',()=>{
 let {s,id}=setup();const initial=s.factions.han.treasury+s.persons[id].wealth;
 const quote=quoteEasternMerchantLoan(s,id,8);assert.equal(quote.ok,true);assert.equal(quote.total,10);
 const issued=requestEasternMerchantLoan(s,id,8);assert.equal(issued.ok,true);
 assert.equal(s.factions.han.treasury,58);assert.equal(s.persons[id].wealth,4);
 assert.equal(issued.loan.outstanding,10);assert.equal(requestEasternMerchantLoan(s,id,4).ok,false,'one merchant cannot issue overlapping loans');
 s=loadHanSave(serialize(s));const loan=s.tradeMarkets.merchantLoans[0];assert.equal(loan.id,issued.loan.id);
 assert.equal(repayEasternMerchantLoan(s,loan.id).ok,true);
 assert.equal(s.factions.han.treasury,48);assert.equal(s.persons[id].wealth,14);
 assert.equal(s.factions.han.treasury+s.persons[id].wealth,initial,'principal and interest are transfers, not minted cash');
 assert.equal(loan.status,'repaid');assert.equal(loan.paid,10);assert.equal(loan.outstanding,0);
 assert.deepEqual(loan.payments.map(payment=>payment.amount),[10]);
 assert.ok(s.log.some(entry=>entry.kind==='trade'&&entry.text[0].includes('loan received 10')));
 assert.equal(repayEasternMerchantLoan(s,loan.id).ok,false,'a saved loan cannot settle twice');
 s=loadHanSave(serialize(s));assert.equal(s.tradeMarkets.merchantLoans[0].status,'repaid');
 assert.equal(s.persons[id].history.filter(event=>event.kind==='merchant_loan_repaid').length,1);
});

test('short treasury makes the saved loan overdue; later receipts repay it without a second penalty',()=>{
 let {s,id}=setup(),issued=requestEasternMerchantLoan(s,id,8);assert.equal(issued.ok,true);
 const stability=s.factions.han.stability;s.factions.han.treasury=30;
 const loyalty=s.persons[id].loyalty;
 for(let i=0;i<12;i++)next(s);
 let loan=s.tradeMarkets.merchantLoans[0];assert.equal(loan.status,'overdue');assert.equal(loan.outstanding,10);
 assert.equal(s.factions.han.stability,stability-2);assert.equal(s.persons[id].wealth,4);
 assert.equal(s.persons[id].loyalty,loyalty-10);
 s=loadHanSave(serialize(s));loan=s.tradeMarkets.merchantLoans[0];s.factions.han.treasury=34;next(s);
 assert.equal(loan.outstanding,6);assert.equal(loan.paid,4);assert.equal(s.persons[id].wealth,8);
 s.factions.han.treasury=36;next(s);
 assert.equal(loan.status,'repaid');assert.equal(loan.outstanding,0);assert.equal(s.persons[id].wealth,14);
 assert.deepEqual(loan.payments.map(payment=>payment.amount),[4,6]);
 assert.equal(s.factions.han.stability,stability-2);
 assert.equal(s.persons[id].loyalty,loyalty-10);
 next(s);assert.equal(s.persons[id].wealth,14,'monthly processing cannot repay twice');
});

test('merchant credit rejects unfunded, foreign, dead and concluded-campaign requests',()=>{
 const {s,id}=setup(),cash=s.factions.han.treasury,wealth=s.persons[id].wealth;
 assert.equal(quoteEasternMerchantLoan(s,id,5).ok,false,'only published 4 or 8 treasury terms are valid');
 s.persons[id].wealth=5;assert.equal(requestEasternMerchantLoan(s,id,4).ok,false);
 s.persons[id].wealth=wealth;s.persons[id].faction='parthia';assert.equal(requestEasternMerchantLoan(s,id,4).ok,false);
 s.persons[id].faction='han';s.persons[id].alive=false;assert.equal(requestEasternMerchantLoan(s,id,4).ok,false);
 s.persons[id].alive=true;s.finalized={outcome:'defeat'};assert.equal(requestEasternMerchantLoan(s,id,4).ok,false);
 assert.equal(s.factions.han.treasury,cash);assert.equal(s.persons[id].wealth,wealth);
 assert.equal(s.tradeMarkets.merchantLoans.length,0);
});

test('older saves gain an empty credit ledger and a lender estate can still receive a debt',()=>{
 let {s,id}=setup();delete s.tradeMarkets.merchantLoans;delete s.tradeMarkets.nextMerchantLoan;
 s=loadHanSave(serialize(s));assert.deepEqual(s.tradeMarkets.merchantLoans,[]);
 const loan=requestEasternMerchantLoan(s,id,4).loan;assert.equal(loan.id,'eastern-merchant-loan:1');
 s.persons[id].alive=false;s.tradeMarkets.nextMerchantLoan=1;
 s=loadHanSave(serialize(s));assert.ok(s.tradeMarkets.nextMerchantLoan>1);
 const wealth=s.persons[id].wealth;assert.equal(repayEasternMerchantLoan(s,loan.id).ok,true);
 assert.equal(s.persons[id].wealth,wealth+5,'the saved lender estate receives repayment even after death');
 assert.equal(s.tradeMarkets.merchantLoans[0].status,'repaid');
});
