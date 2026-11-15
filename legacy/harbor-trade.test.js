import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProfile,exportProfile,importProfile,purchase,applyCosmetic} from './legacy-core.js';
import {HARBOR_ROUTES,commissionMerchantReport,acquireTyrianCloth,settleHarborExchange} from './harbor-trade.js';
import {ARTIFACTS} from './museum.js';

const profile=()=>{const storage={getItem:()=>null,setItem:()=>{}};const p=loadProfile(storage);p.coins=2000;return p};

test('merchant reports are dated, paid once and survive old profile migration',()=>{
 const oldFile=JSON.parse(exportProfile(profile()));delete oldFile.profile.harborTradeReports;delete oldFile.profile.harborEvents;
 const old=importProfile(JSON.stringify(oldFile));assert.deepEqual(old.harborTradeReports,[]);assert.deepEqual(old.harborEvents,[]);
 assert.equal(commissionMerchantReport(old,'tyre').ok,false);
 assert.equal(purchase(old,'harbor').ok,true);const before=old.coins;
 assert.equal(commissionMerchantReport(old,'tyre',new Date('2026-11-14T12:00:00Z')).ok,true);
 assert.equal(old.coins,before-HARBOR_ROUTES.tyre.cost);
 assert.equal(old.harborTradeReports[0].at,'2026-11-14T12:00:00.000Z');
 assert.equal(old.harborTradeReports[0].verified,false);
 const saved=importProfile(exportProfile(old));assert.equal(commissionMerchantReport(saved,'tyre').ok,false);assert.equal(saved.coins,old.coins);
 assert.equal(settleHarborExchange(saved,'audit').ok,false);
 saved.harborTradeReports.push({...saved.harborTradeReports[0]});assert.equal(settleHarborExchange(saved,'audit').ok,false);saved.harborTradeReports.pop();
 assert.equal(commissionMerchantReport(saved,'alexandria').ok,true);
 const politics={...saved.politics},coins=saved.coins;
 assert.equal(settleHarborExchange(saved,'audit',new Date('2026-11-15T12:00:00Z')).ok,true);
 assert.equal(saved.coins,coins-20);assert.equal(saved.politics.reputation,politics.reputation+3);assert.equal(saved.politics.corruption,politics.corruption-1);
 assert.ok(saved.collectibles.includes('merchant-ledger'));assert.ok(ARTIFACTS.some(item=>item.id==='merchant-ledger'&&item.kind==='campaign'));
 const restored=importProfile(exportProfile(saved));assert.equal(settleHarborExchange(restored,'broker').ok,false);assert.equal(restored.coins,saved.coins);assert.equal(restored.harborEvents[0].at,'2026-11-15T12:00:00.000Z');
});

test('foreign import and broker choice have costs, guards and distinct consequences',()=>{
 const p=profile();purchase(p,'harbor');assert.equal(acquireTyrianCloth(p).ok,false);
 commissionMerchantReport(p,'tyre');const before=p.coins;assert.equal(acquireTyrianCloth(p).ok,true);assert.equal(p.coins,before-80);assert.equal(acquireTyrianCloth(p).ok,false);assert.equal(p.coins,before-80);
 commissionMerchantReport(p,'massalia');const politics={...p.politics},coins=p.coins;
 assert.equal(settleHarborExchange(p,'broker').ok,true);assert.equal(p.coins,coins-10);assert.equal(p.politics.aristocrats,politics.aristocrats+3);assert.equal(p.politics.corruption,politics.corruption+2);
 const poor=profile();purchase(poor,'harbor');poor.coins=0;assert.equal(commissionMerchantReport(poor,'tyre').ok,false);assert.equal(poor.harborTradeReports.length,0);
});

test('owned foreign awnings can be reapplied after a different purchased theme',()=>{
 const p=profile();purchase(p,'harbor');assert.equal(purchase(p,'theme-harbor').ok,true);assert.equal(p.theme,'harbor');
 assert.equal(purchase(p,'theme-senate').ok,true);assert.equal(p.theme,'senate');const coins=p.coins;
 assert.equal(applyCosmetic(p,'theme-harbor'),true);assert.equal(p.theme,'harbor');assert.equal(p.coins,coins);
 assert.equal(applyCosmetic(p,'unowned-cosmetic'),false);
 const saved=importProfile(exportProfile(p));assert.equal(saved.theme,'harbor');assert.ok(saved.purchases.includes('theme-harbor'));
});
