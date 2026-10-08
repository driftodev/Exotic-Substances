const fs=require('fs'),vm=require('vm'),path=require('path');
const upstream=path.resolve(process.argv[2]||process.env.HE_UPSTREAM||'upstream-083');
const sandbox={require,console,process:{argv:[null,null,path.join(upstream,'data/Items.json')]},__dirname};sandbox.global=sandbox;vm.createContext(sandbox);const run=s=>vm.runInContext(s,sandbox);
run(fs.readFileSync(path.join(__dirname,'market.test.cjs'),'utf8').split('vm.runInThisContext')[0]);
run(`
global.$dataStates=JSON.parse(fs.readFileSync(process.argv[2].replace('Items.json','States.json')));
global.T={obj:()=>({}),};const withdrawalStateId=50,WITHDRAWAL_ON=100,WITHDRAWAL_OFF=80,sleepDecreaseRate=.01;
class ActorBase{
 constructor(){this._states=[];this._selectedTraits=[];this.mood=20;this.sleepValue=10;this.hp=100;this.mp=0;this.mmp=100;this.hungerValue=100;this._result={isHit:()=>true};}
 name(){return 'Tester';}actorId(){return 3;}isAlive(){return true;}result(){return this._result;}
 paramRate(){return 1;}sparam(){return 1;}xparam(){return 1;}stateRate(){return 1;}skillMpCost(){return 100;}param(id){return 100*this.paramRate(id)*(1+(this._statModifiers?.[id]||0)/100);}gainMp(n){this.mp=Math.min(this.mmp,this.mp+n);}get mhp(){return 1000*this.paramRate(0);}
 leisure(){return this.mood;}addLeisure(n){this.mood=Math.max(0,Math.min(100,this.mood+n));}
 addSleep(n){this.sleepValue=Math.max(0,Math.min(100,this.sleepValue+n));}reduceHunger(n){this.hungerValue-=n;}
 addSocial(n){this.social=(this.social||0)+n;}gainHp(n){this.hp=Math.min(this.mhp,this.hp+n);}
 isStateAffected(id){return this._states.includes(id);}addState(id){if(!this.isStateAffected(id))this._states.push(id);this.refresh();}removeState(id){this._states=this._states.filter(x=>x!==id);this.refresh();}
 refresh(){this.paramRate(2);this.xparam(0);}
}
class Game_Actor extends ActorBase{};global.Game_BattlerBase=ActorBase;global.Game_Actor=Game_Actor;
global.Intoxication={slur:t=>t};
global.NPCEmpathize.Look={socialMult:()=>1,odds:()=>2};
global.Scene_Map=class extends Scene_Base{};
`);
const timeSource=fs.readFileSync(path.join(upstream,'js/plugins/Core/TimeDateSystem.js'),'utf8');
const start=timeSource.indexOf('  window.AddictionSystem = {'),end=timeSource.indexOf('\n  //====',start);
run(timeSource.slice(start,end));
run('const clampRestHours=h=>h,isRoughRest=r=>r,getGameTimeMinutes=()=>time,maxSleep=100,ROUGH_REST_FACTOR=.5;');
run(timeSource.slice(timeSource.indexOf('  Scene_Map.prototype._beginSleepAdvance ='),timeSource.indexOf('  Scene_Map.prototype._stepSleepAdvance =')));
run(fs.readFileSync(path.join(__dirname,'../source/ExoticSubstances.js'),'utf8'));
run(`
new Scene_Boot().create();const M=ExoticSubstances;
function fresh(){time=0;const a=new Game_Actor();$gameActors._data=[a];return a;}
function use(a,id){if(id===9013){assert(M.drugs.consume(a,id,{insulation:0}));return;}const action=new Game_Action();action._item=$dataItems[id];assert(action.testApply(a));action.apply(a);}
let a=fresh();use(a,9003);
assert.equal(a.hp,600);assert.equal(a.sleepValue,100);assert.equal(a.mhp,1000);
for(const id of [2,4,6])assert.equal(a.paramRate(id),1.75);
assert.equal(a.paramRate(5),.75);assert.equal(a.xparam(0),.85);assert(a.isStateAffected(7));assert(a.isStateAffected(9004));
const repeat=new Game_Action();repeat._item=$dataItems[9003];assert(!repeat.testApply(a));repeat.apply(a);assert.equal(a._exoticSubstanceDrugs[9003].uses,1);
// Native five-turn state removal ends only the combat modifiers, not the crash timer.
a.removeState(9004);assert.equal(a.paramRate(2),1);assert.equal(a.xparam(0),1);
time=240;M.expire();assert.equal(a.sleepValue,40);assert.equal(a.mood,15);assert(!a.isStateAffected(9003));const sleep=a.sleepValue;M.expire();assert.equal(a.sleepValue,sleep);
// Meld Resin appetite and attention effects; no dependency after one use.
a=fresh();use(a,9001);assert.equal(a.mood,52);assert.equal(a.paramRate(6),.9);assert.equal(a.xparam(0),.95);a.reduceHunger(10);assert.equal(a.hungerValue,88.5);assert.equal(a.social,6);assert(!AddictionSystem.has(a,'meld'));
time=120;M.expire();assert.equal(a.mood,32);assert.equal(a.paramRate(6),1);assert.equal(a.xparam(0),1);
// Psychedelic repetition builds tolerance, never narcotic dependency.
a=fresh();a.mood=50;Math.random=()=>1;use(a,9002);assert.equal(a.paramRate(5),1.15);assert.equal(a.xparam(0),.9);time=180;M.expire();const before=a.mood;use(a,9002);assert(a.mood-before<20);assert.equal(a._exoticSubstanceDrugs[9002].dependence,0);assert(!AddictionSystem.isAddict(a));
// Low mood changes odds of unease without inventing a craving meter.
a=fresh();Math.random=()=>.2;use(a,9002);assert(a._exoticSubstanceDrugs[9002].active.uneasy);assert.equal(a.xparam(0),.85);
// Repeated Crystal use develops its own dependence, shown by native UI methods.
a=fresh();for(let i=0;i<5;i++){use(a,9003);time+=240;M.expire();}
assert(AddictionSystem.has(a,'frack'));assert(!AddictionSystem.has(a,'narcotic'));assert(!AddictionSystem.has(a,'meld'));assert.equal(AddictionSystem.label('frack'),'Frack');
time+=1000;M.expire();assert(AddictionSystem.craving(a,'frack')>=50);assert(a.isStateAffected(9006));assert.equal(a.paramRate(2),.9);
AddictionSystem.updateWithdrawal(a);assert(!a.isStateAffected(50));
const oldCraving=AddictionSystem.craving(a,'frack');use(a,9001);assert.equal(AddictionSystem.craving(a,'frack'),oldCraving);assert(!AddictionSystem.relieve(a,'narcotic',100));assert.equal(AddictionSystem.craving(a,'frack'),oldCraving);
// Detox supports custom meters; it eases craving, not dependence/tolerance.
AddictionSystem.relieveAll(a,100);assert.equal(AddictionSystem.craving(a,'frack'),0);assert(a._exoticSubstanceDrugs[9003].dependent);
// Native time-skip updates with our zero-rate specs do not double count.
time+=600;const crave=AddictionSystem.craving(a,'frack');$gameParty.members=()=>[a];AddictionSystem.advanceMinutes(600);assert.equal(AddictionSystem.craving(a,'frack'),crave);
// Persistence and abstinence recovery, including a very large time skip.
const saved=JSON.parse(JSON.stringify(a._exoticSubstanceDrugs));const b=new Game_Actor();b._exoticSubstanceDrugs=saved;assert.deepEqual(M.drugs.status(b),M.drugs.status(a));
time+=30*1440;M.drugs.update(b);assert.equal(b._exoticSubstanceDrugs[9003].dependence,0);assert.equal(b._exoticSubstanceDrugs[9003].tolerance,0);assert(!AddictionSystem.has(b,'frack'));assert(!b.isStateAffected(9006));
// Generic pre-existing narcotic dependence and withdrawal remain native.
b._selectedTraits=[{id:104}];AddictionSystem.setCraving(b,'narcotic',100);AddictionSystem.updateWithdrawal(b);assert(b.isStateAffected(50));assert.equal(AddictionSystem.craving(b,'narcotic'),100);
// Crystal dependency does not overwrite another character's data.
assert(!M.drugs.status(new Game_Actor()).length);
assert.deepEqual(M.bounds('Milano',9003),[12500,45000]);assert(!M.goods[22]);assert.equal($dataItems[22].price,4000);assert.equal($dataItems[22].effects.length,5);
assert.equal(ItemModelSystem.family.unique.i9003,'createExoticSubstancesCrystal');assert(HypernetOS.getIconHTML(9003).includes('svg'));
// Red Cocaine follows native pricing and trading, even below our gate.
profiles.Alice.score=-100;const shop=new Scene_Shop();shop.prepare([[0,22,0,0]],false);assert(shop._goods.some(r=>r[1]===22));assert.equal(shop.unitSellPrice($dataItems[22]),400);
console.log('PASS: three effect profiles, exact Frack multipliers/penalties, no max-HP reduction, crash once, active-use lock, appetite, Synth tolerance/unease without dependency, independent craving UI, detox, abstinence/save recovery, native addiction compatibility and legal Red Cocaine.');
`);

run(`assert.deepEqual([9001,9002,9003,9004,9005,9006].map(id=>$dataStates[id].name),['relaxed / distracted','signal bleed','wired','rush: 7 turns','withdrawal','withdrawal']);
console.log('PASS: status labels retain wording and duration without drug names.');`);

module.exports={sandbox,run};
