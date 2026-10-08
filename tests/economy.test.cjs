const {run}=require('./drugs.test.cjs');
run(`
time=0;$gameSystem._exoticSubstances={version:'0.4.0',cities:{},dealers:{}};
const ids=Object.keys(M.goods).map(Number),stats={};let localProfits=0;
for(const id of ids){let available=0,totalStock=0,minAsk=Infinity,maxBid=0;
 for(let n=0;n<120;n++){const ctx={kind:'net',city:'City '+n,key:'network:'+n},r=M.ledger(ctx,id);available+=r.stock>0;totalStock+=r.stock;minAsk=Math.min(minAsk,M.quote(ctx,id,true));maxBid=Math.max(maxBid,M.quote(ctx,id,false));assert(M.quote(ctx,id,true)>M.quote(ctx,id,false));
  let last=M.market(ctx.city,id).center;for(let w=1;w<=52;w++){time=w*10080-600;const next=M.market(ctx.city,id).center;assert(Math.abs(next/last-1)<=M.economy.profiles[id].drift+1e-9);last=next;const [lo,hi]=M.bounds(ctx.city,id);assert(next>lo*.65&&next<hi*1.35);}time=0;
 }
 stats[id]={available,totalStock,minAsk,maxBid};assert(maxBid>minAsk*1.2,'Intercity route should exist for '+id);
 // Same-person round trips are capped at 80%; distinct compatible buyers can
 // still make a local route profitable when their class and offer align.
 const strong={9001:11,9002:12,9003:6,9010:19,9011:27,9012:35,9013:46,9014:43,9015:14}[id];profiles.Bob={score:100,itemIds:[],assignedClassId:strong};
 let cheapest=Infinity,best=0;
 for(let n=0;n<400;n++){
  const seller={kind:'barter',name:'Alice',city:'Local',key:'supplier:'+n},buyer={kind:'barter',name:'Bob',city:'Local',key:'buyer:'+n};
  const ask=M.quote(seller,id,true),bid=M.quote(buyer,id,false);cheapest=Math.min(cheapest,ask);best=Math.max(best,bid);
  assert(M.quote(seller,id,false)<=ask*.8);assert(bid<=M.quote(buyer,id,true)*.8);
 }
 if(best>cheapest)localProfits++;
 assert(best>=cheapest*.75,'Strong preferences should remain economically legible for '+id);
}
assert(localProfits>=6,'Most drugs should expose a local preference route outside adverse weeks');
assert(stats[9010].available<stats[9001].available*.7);assert(stats[9011].totalStock<stats[9010].totalStock);assert(stats[9013].minAsk<10000);
// Family events correlated, with the wax trade delayed one week.
for(let w=0;w<20;w++){assert.equal(M.economy.event('Local',9001,w).label,M.economy.event('Local',9010,w).label);assert.equal(M.economy.event('Local',9011,w+1).label,M.economy.event('Local',9010,w).label);assert.equal(M.economy.event('Local',9013,w).label,M.economy.event('Local',9014,w).label);}
// An exhausted current ledger survives save/load without granting a refill.
time=0;const persisted={kind:'net',city:'Milano',key:'persisted'};$gameSystem._exoticSubstances={version:'0.4.0',cities:{'default|Milano|9001':{week:0,center:8000}},dealers:{'persisted|9001':{week:0,stock:0,demand:0,initialStock:4,initialDemand:8,preferenceVersion:1,netStockVersion:1}}};assert.equal(M.ledger(persisted,9001).stock,0);assert.equal(M.ledger(persisted,9001).demand,0);assert.equal(M.market('Milano',9001).center,8000);const save=JSON.stringify($gameSystem),price=M.quote(persisted,9001,true);$gameSystem=JSON.parse(save);assert.equal(M.quote(persisted,9001,true),price);
// All nine participate in authority refusal and actual-inventory barter.
profiles.Alice.score=100;profiles.Alice.isPolice=true;const cop={kind:'barter',name:'Alice',city:'Milano',key:'cop'};for(const id of ids){profiles.Alice.itemIds=[id];assert.equal(M.count(cop,id),0);assert.equal(M.transact(cop,$dataItems[id],1,true),0);}delete profiles.Alice.isPolice;
const barter={kind:'barter',name:'Alice',city:'Milano',key:'actual'};profiles.Alice.itemIds=[];for(const id of ids)assert.equal(M.count(barter,id),0);
console.log('Economy sample (120 cities):',JSON.stringify(stats));
// Preference tiers govern weekly quantities and keep aversion absolute.
profiles.Bob={score:100,itemIds:[],assignedClassId:11,personalityIndex:23};
const seek={kind:'barter',name:'Bob',city:'Local',key:'seeking'},pref=M.economy.preference(seek,9001);assert(['Interested','Seeking'].includes(pref.label));assert(M.ledger(seek,9001).demand>=2);
let avoiding=null;profiles.Alice.assignedClassId=67;profiles.Alice.personalityIndex=17;for(let n=0;n<300&&!avoiding;n++){const c={kind:'barter',name:'Alice',city:'Local',key:'averse:'+n};if(M.economy.preference(c,9003).label==='Avoiding')avoiding=c;}
assert(avoiding);assert.equal(M.ledger(avoiding,9003).demand,0);assert.equal(M.quote(avoiding,9003,false),0);
console.log('PASS: nine route markets, 52-week bounded volatility, class-readable opportunities, preference quantities, specialist scarcity, family events/lag, save persistence, 80% same-trader cap and authority gates.');
`);
