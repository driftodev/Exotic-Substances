const {run}=require('./drugs.test.cjs');
run(`
// The six new highs affect real RPG Maker extension points, not display-only states.
a=fresh();a._sleep=20;use(a,9010);assert.equal(a.paramRate(5),1.1);assert.equal(a.stateRate(8),1.35);assert.equal(a.stateRate(9),1.35);
assert(!M.drugs.canUse(a,9001));assert(!M.drugs.canUse(a,9011));time=60;M.expire();assert.equal(a.mp,15);M.expire();assert.equal(a.mp,15);time=1000;M.expire();assert.equal(a.mp,37);assert(!a.isStateAffected(9010));M.expire();assert.equal(a.mp,37);
const tolerance=a._exoticSubstanceDrugs[9001].tolerance;assert(tolerance>0);use(a,9011);assert(a._exoticSubstanceDrugs[9011].active.strength<1);assert(a._exoticSubstanceDrugs[9001].tolerance>tolerance);assert(a.skillMpCost({})<100);assert.equal(a.paramRate(6),.85);assert.equal(a.xparam(1),.92);assert(a.stateRate(6)<1);assert(a.stateRate(13)<1);
// Cross-tolerance does not create a second cannabis craving key or let a switch reset a habit.
a=fresh();for(let i=0;i<6;i++){use(a,9011);time+=120;M.expire();}assert(AddictionSystem.has(a,'meld'));assert.equal(AddictionSystem.label('meld'),'Cannabis');assert(!AddictionSystem.keysFor(a).includes('nectar'));
time+=3000;M.expire();assert(a.isStateAffected(9005));use(a,9010);assert(!a.isStateAffected(9005));assert.equal(AddictionSystem.craving(a,'meld'),0);
// Both psychedelics share rapid tolerance, without physical dependence.
a=fresh();use(a,9002);time=180;M.expire();use(a,9015);assert(a._exoticSubstanceDrugs[9015].active.strength<.5);assert.equal(a.xparam(0),.88);assert(a.xparam(1)>1);assert.equal(a.stateRate(8),1.5);assert(!M.drugs.canUse(a,9002));assert.equal(a._exoticSubstanceDrugs[9002].dependence,0);
time=540;M.expire();const afterSleep=a.sleepValue;M.expire();assert.equal(a.sleepValue,afterSleep);assert.equal(a.xparam(1),1);
// Communion modifies only the native positive social/odds hooks, not disposition.
a=fresh();const scoreBefore=profiles.Alice.score;use(a,9012);assert.equal(NPCEmpathize.Look.socialMult(a,'positive'),1.2);assert.equal(NPCEmpathize.Look.socialMult(a,'negative'),1);assert.equal(NPCEmpathize.Look.odds('join',a,{}),10);assert.equal(NPCEmpathize.Look.odds('pickpocket',a,{}),2);assert.equal(profiles.Alice.score,scoreBefore);assert.equal(a.paramRate(5),.85);assert.equal(a.stateRate(9),1.4);
// Native sleep setup: rough rest improves; waiting never does; long sleeps prorate overlap.
a=fresh();a._sleep=20;$gameParty.leader=()=>a;assert(M.drugs.consume(a,9013,{insulation:0}));let scene=new Scene_Map();scene._beginSleepAdvance(2,false,true);assert.equal(scene._sleepAdvance.sleepTarget,70);scene._beginSleepAdvance(8,false,true);assert.equal(scene._sleepAdvance.sleepTarget,65);scene._beginSleepAdvance(2,true,true);assert.equal(scene._sleepAdvance.sleepTarget,15.2);assert.equal(a.paramRate(6),.8);assert.equal(a.xparam(0),.92);assert.equal(a.stateRate(8),.5);
a.sleepValue=20;a.addSleep(.5);assert.equal(a.sleepValue,20.625);a.addSleep(10);assert.equal(a.sleepValue,30.625);
// Eat Raw consumes only the focused Hush kit. It keeps full tolerance and
// dependence gain, halves benefits and worsens penalties beyond a poor mixer.
let nativeRaw=0,allergens=0;global.CookingSystem={eatSingleItem(){nativeRaw++;return 'native';},feedAllergens(){allergens++;}};M.cooking.install();
a=fresh();$gameParty.leader=()=>a;$gameParty.members=()=>[a];bag[9013]=1;bag[22]=2;CookingSystem._item2=$dataItems[22];
assert.equal(CookingSystem.eatSingleItem($dataItems[9013]),true);assert.equal(bag[9013],0);assert.equal(bag[22],2);assert.equal(nativeRaw,0);assert.equal(allergens,1);
assert.equal(a.mood,28);assert.equal(a.paramRate(6),.76);assert(Math.abs(a.xparam(0)-.904)<1e-9);assert.equal(a.stateRate(8),.75);assert.equal(a._exoticSubstanceDrugs[9013].tolerance,15);assert.equal(a._exoticSubstanceDrugs[9013].dependence,5);
a.sleepValue=20;a.addSleep(1);assert.equal(a.sleepValue,21.125);time=240;M.expire();assert.equal(a.mood,16);assert.equal(a.sleepValue,11.125);assert.equal(CookingSystem.eatSingleItem($dataItems[22]),'native');assert.equal(nativeRaw,1);
// Lethe eases half of an attached, repairable injury penalty, never mutating the injury.
a=fresh();a._statModifiers={2:-20};a._bodyParts={arm:{damaged:true,currentHp:0,appliedStatEffect:true,_appliedStatAmount:-20,statEffect:{param:2,amount:-40,brokenAmount:-20}}};const body=JSON.stringify(a._bodyParts);assert.equal(a.param(2),80);use(a,9014);assert.equal(a.param(2),90);assert.equal(JSON.stringify(a._bodyParts),body);assert.equal(a.hp,100);assert.equal(a.paramRate(6),.85);assert.equal(a.xparam(1),.9);a._bodyParts.arm.ruined=true;assert.equal(a.param(2),80);a._bodyParts.arm.ruined=false;time=180;M.expire();assert.equal(a.param(2),80);
// New dependency types remain independent and participate in native detox UI.
for(const id of [9012,9013,9014]){a=fresh();for(let i=0;i<20&&!a._exoticSubstanceDrugs?.[id]?.dependent;i++){use(a,id);time+=M.drugs.definitions[id].duration;M.expire();}assert(a._exoticSubstanceDrugs[id].dependent);time+=2000;M.expire();const key=M.drugs.definitions[id].key;assert(AddictionSystem.craving(a,key)>0);AddictionSystem.relieveAll(a,100);assert.equal(AddictionSystem.craving(a,key),0);const hist=JSON.parse(JSON.stringify(a._exoticSubstanceDrugs));const loaded=new Game_Actor();loaded._exoticSubstanceDrugs=hist;assert.deepEqual(M.drugs.status(loaded),M.drugs.status(a));}
console.log('PASS: six functional highs, family cross-tolerance and active locks, finite mana recovery, native social and sleep hooks, injury relief without repair, independent withdrawal/detox/save histories.');
`);
