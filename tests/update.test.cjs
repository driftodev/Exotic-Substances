const {run}=require('./drugs.test.cjs');
run(`
a=fresh();for(let i=0;i<5;i++){assert(M.drugs.consume(a,9001));assert(Math.abs(M.drugs.meldProtection(a)-[.10,.19,.27,.34,.40][i])<1e-9);}
assert(!M.drugs.canUse(a,9001));assert.equal(a._exoticSubstanceDrugs[9001].active.layers.length,5);
const protection=M.drugs.meldProtection(a);assert(Math.abs(protection-.40)<1e-9);assert.equal(a.sparam(7),1-protection);
assert.equal(a.paramRate(6),.78);assert.equal(a.social,6);time=120;M.expire();assert.equal(a.sparam(7),1);
a=fresh();M.drugs.consume(a,9001);time=60;M.drugs.consume(a,9001);time=121;M.expire();assert.equal(a._exoticSubstanceDrugs[9001].active.layers.length,1);assert(a.sparam(7)<1);time=181;M.expire();assert.equal(a.sparam(7),1);
assert.equal(M.drugs.definitions[9003].duration,240);assert.equal($dataStates[9004].maxTurns,7);
global.BSE={Helpers:{getNationName:()=> 'France'}};group='Procedural';assert.equal(M.economy.region(),'Country:France');group='Ghent';assert.equal(M.economy.region(),'Country:Belgium');group='Antwerpen';assert.equal(M.economy.region(),'Country:Belgium');
for(let w=0;w<20;w++){const reports=M.economy.wire('Country:Belgium',w);assert.deepEqual(reports,M.economy.wire('Country:Belgium',w));for(const r of reports){const id=Object.keys(M.economy.profiles).find(id=>M.economy.profiles[id].family===r.family);const event=M.economy.event(r.region,Number(id),r.week);assert.equal(r.kind,event.price<0?'surplus':'shortage');}}
assert.equal(M.cooking.tier({name:'Fresh Milk'}),0);assert.equal(M.cooking.tier({name:'Honey Mead'}),2);assert.equal(M.cooking.tier({id:1780,name:'Sea Grapes'}),1);
assert.equal(M.cooking.tier({name:'Dragon’s Breath Fruit'}),3);assert.equal(M.cooking.tier({name:'Mythic Berry',note:'<Rarity: Mythic>'}),4);
global.CookingSystem={isFoodItem:i=>i?.meta?.category==='Food',canPairItems:()=>true,canCook:()=>true,createCookedItemName:()=> 'Meal',cookItems:()=> 'native',activeCook:()=>a,flatRoll:()=>({success:true,nat20:true}),cookware:()=>({multiplier:1}),getRecoveryValues:()=>({hunger:1,tp:0,mp:0}),hungerWorthOf:()=>1,serveToParty:()=>{}};
M.cooking.install();const hook=CookingSystem.cookItems;M.cooking.install();assert.equal(CookingSystem.cookItems,hook);
a=fresh();$gameParty.members=()=>[a];$gameParty.leader=()=>a;
global.testKit=$dataItems[9013];global.testFood={id:9999,name:'Honey Mead',meta:{category:'Food'}};$gameParty.gainItem(testKit,1);$gameParty.gainItem(testFood,1);
assert(!M.drugs.canUse(a,9013));assert(CookingSystem.isFoodItem(testKit));assert(CookingSystem.canCook(testKit,testFood));assert(!CookingSystem.canPairItems(testKit,testKit));
`);
(async()=>{
 const result=await run('CookingSystem.cookItems(testKit,testFood)');
 if(result.insulation!==.25||result.consumers!==1)throw Error('Hush preparation failed');
 run(`assert.equal($gameParty.numItems(testKit),0);assert.equal($gameParty.numItems(testFood),0);assert.equal(a._exoticSubstanceDrugs[9013].active.insulation,.25);assert.equal(a.paramRate(6),.85);assert(!CookingSystem.canCook(testKit,testFood));`);
 console.log('PASS: layered Meld, independent expiry, Frack duration, country markets, event-backed Wire, Hush tiers and immediate party cooking.');
})().catch(e=>{console.error(e);process.exitCode=1;});
