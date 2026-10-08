// Runs native upstream witness/charge logic and native PrisonManager with a
// headless game fixture. No game assets or browser required.
const fs=require('fs'),vm=require('vm'),path=require('path');
const upstream=path.resolve(process.argv[2]||process.env.HE_UPSTREAM||'upstream-083');
const read=p=>fs.readFileSync(path.join(upstream,p),'utf8');
const sandbox={require,console,process:{argv:[null,null,path.join(upstream,'data/Items.json')]},__dirname};sandbox.global=sandbox;
vm.createContext(sandbox);
const run=s=>vm.runInContext(s,sandbox);
const fixture=fs.readFileSync(path.join(__dirname,'market.test.cjs'),'utf8').split('vm.runInThisContext')[0];
run(fixture);
run(`
class Scene_Map extends Scene_Base {start(){} stop(){}};global.Scene_Map=Scene_Map;
class Game_Event {start(){} meetsConditions(){return true;}};global.Game_Event=Game_Event;
class Game_Battler {useItem(){}};global.Game_Battler=Game_Battler;
class Game_Variables {constructor(){this._data={};} value(id){return this._data[id]||0;} setValue(id,v){this._data[id]=v;}};global.Game_Variables=Game_Variables;
global.$gameVariables=new Game_Variables();
global.$dataSystem={switches:[]};global.$dataMap={note:''};global.$gamePlayer={x:0,y:0,reserveTransfer(...args){this.lastTransfer=args;}};
global.T=k=>k;global.Graphics={frameCount:0};global.ConfigManager={language:'en'};global.Utils={};
global.PluginManager={_commands:{},parameters:()=>({}),registerCommand(p,n,f){this._commands[p+':'+n]=f;},callCommand(self,p,n,a){return this._commands[p+':'+n]?.call(self,a);}};
global.Game_Interpreter=class {setup(list,event){this._list=list;this._eventId=event;} command302(){} command357(){} updateWaitMode(){} command119(p){this.jumped=p[0];}};
DataManager.createGameObjects=()=>{};DataManager.makeSaveContents=()=>({});
DataManager.extractSaveContents=c=>{global.$gameSystem=c;};
const messages=[],toasts=[],deeds=[];
global.$gameMessage={add:s=>messages.push(s),setBackground(){},isBusy:()=>false};global.ParchmentToast={show:s=>toasts.push(s)};
global.WorldEvents={record:r=>{deeds.push(r);return r;}};
TimeDateSystem.getGameTimeMinutes=()=>$gameVariables.value(114);
const advances=[];TimeDateSystem.passTime=(n,opts)=>{advances.push({n,opts});$gameVariables.setValue(114,$gameVariables.value(114)+n);};
$gameParty.loseGold=n=>$gameParty.gainGold(-n);lead.name=()=>'Leader';other.name=()=>'Companion';lead.currentClass=()=>({id:1});other.currentClass=()=>({id:1});
global.NPCSocietyRegistry={getProfile:n=>profiles[n]};
let staffCalls=0;NPCSystem.staffPolice=()=>++staffCalls;
let events=[],wall=false;global.BattleSystemEnhanced={Helpers:{hasLineOfSight:()=>!wall}};
$gameMap.requestRefresh=()=>{};$gameMap.events=()=>events;$gameMap.event=id=>events.find(e=>e.eventId()===id);$gameMap.deltaX=(a,b)=>a-b;$gameMap.deltaY=(a,b)=>a-b;
const makeEvent=(id,name,x=0,y=1,dir=8,note='NPC-1')=>({x,y,eventId:()=>id,direction:()=>dir,event:()=>({name,note,pages:[]})});
NPCEmpathize._helpers._getNPCName=id=>$gameMap.event(id)?.event().name||'';
global.LookStats={ofActor:()=>({stealth:0,intimidation:0})};
`);
sandbox.$dataCommonEvents=JSON.parse(read('data/CommonEvents.json'));
sandbox.Messages={PresetCrimes:JSON.parse(read('js/db/Messages/PresetCrimes.json'))};
run(read('js/plugins/Economy/CrimeSystem.js'));
const trialPath=fs.existsSync(path.join(upstream,'js/plugins/Economy/TrialSystem.js'))?'js/plugins/Economy/TrialSystem.js':'js/plugins/Economy/ErisTrial.js';
const trial=read(trialPath);
sandbox.trialPlugin=sandbox.$dataCommonEvents.flatMap(e=>e?.list||[]).find(c=>c.code===357&&c.parameters[1]==='autoServeSentence').parameters[0];
const serveBody=trial.match(/(?:registerTrialCommand|PluginManager.registerCommand)\("autoServeSentence", \(args\) => \{([\s\S]*?)\n  \}\);/)?.[1];
if(trialPath.endsWith('/TrialSystem.js')&&!serveBody)throw new Error('Current native sentence handler was not found; update the test adapter');
run(`
const bountyVariableId=66,returnMapVariable=76,returnXVariable=74,returnYVariable=75,prisonMapId=1102,bountyReductionRate=100;
function settleBountyTo(n){return CrimeSystem.setTotalBounty(n);}function forgiveBounty(){CrimeSystem.clearBounty({silent:true});}
${trial.slice(trial.indexOf('  class PrisonManager {'),trial.indexOf('  // Create global prison manager'))}
PrisonManager.prototype._createOverlay=function(){};PrisonManager.prototype._refresh=function(){};PrisonManager.prototype.showReleaseMessage=async function(){};
global.prisonManager=new PrisonManager();
PluginManager.registerCommand(trialPlugin,'autoServeSentence',(args)=>{${serveBody||'prisonManager.releasePrisoner();'}});
`);
run(fs.readFileSync(path.join(__dirname,'../source/ExoticSubstances.js'),'utf8'));
run(`
new Scene_Boot().create();const M=ExoticSubstances,C=CrimeSystem,h=$dataItems[9001],synth=$dataItems[9002];
let shop;
function reset(){
 C.clearBounty({silent:true});deeds.length=0;toasts.length=0;profiles.Alice.score=45;events=[makeEvent(1,'Alice')];
 $gameTemp._npcTradeWith=null;$gameTemp._npcTradeSellFactor=null;$gameTemp._exoticSubstanceTradeOrigin=null;
 bag[9001]=20;bag[9002]=20;bag[9003]=20;SceneManager._scene=new Scene_Map();
}
function open(){shop=new Scene_Shop();shop.prepare([],false);SceneManager._scene=shop;for(const id of [9001,9002,9003])M.ledger(shop._exoticSubstanceContext,id).demand=8;return shop;}
function sale(n=1,item=h){shop._item=item;return shop.doSell(n);}
reset();profiles.Witness={score:0};
const ctx={name:'Alice',event:1,actorId:1};
for(const [score,chance] of [[100,0],[50,0],[49,.25],[0,.25],[-1,.255],[-50,.5],[-100,.75],[-200,.75]]){
 profiles.Witness.score=score;assert.equal(M.crime.reportingChance({name:'Witness',eventId:2},ctx),chance);
}
assert.equal(M.crime.reportingChance({name:'Companion',eventId:2,officer:true,opinion:-100},ctx),0);
assert.equal(M.crime.reportingChance({name:'Witness',eventId:2,party:true,officer:true},ctx),0);
assert.equal(M.crime.reportingChance({name:'Alice',eventId:1,officer:true},ctx),0);
assert.equal(M.crime.reportingChance({name:'Witness',eventId:2,officer:true},ctx),1);
global.$gameWeather={sunlightMode:'night'};profiles.Witness.score=0;assert.equal(M.crime.reportingChance({name:'Witness',eventId:2},ctx),.35);profiles.Witness.score=-100;assert.equal(M.crime.reportingChance({name:'Witness',eventId:2},ctx),.75);profiles.Witness.score=50;assert.equal(M.crime.reportingChance({name:'Witness',eventId:2},ctx),0);global.$gameWeather={sunlightMode:'day'};
profiles.Witness.score=0;LookStats.ofActor=()=>({stealth:0,intimidation:100});assert.equal(M.crime.reportingChance({name:'Witness',eventId:2},ctx),0);LookStats.ofActor=()=>({stealth:0,intimidation:0});
// Actual native sight, then scene changes to Shop: native returns [] there,
// while the mod retains the map witnesses and charges the completed sale.
reset();open();sale();assert.equal(C.getCrimes().length,0);assert.equal(C.getHeat(),0);
reset();events.push(makeEvent(2,'Witness',0,2));Math.random=()=>.24;open();assert.equal(C.witnessesAt(0,0).length,0);sale();
assert.equal(C.getCrimes().length,1);assert.equal(C.getCrimes()[0].id,'drugDealing');assert.equal(C.getTotalBounty(),M.crime.debug.last.baseFine);assert(C.getHeat()>0);assert.equal(deeds.length,1);assert(toasts.some(t=>t.includes('Drug deal reported — Heat ')&&t.includes('%')));
const staffingBefore=staffCalls;SceneManager._scene=new Scene_Map();SceneManager._scene.update();assert.equal(staffCalls,staffingBefore+1);SceneManager._scene.update();assert.equal(staffCalls,staffingBefore+1);
reset();events.push(makeEvent(2,'Witness',0,2));Math.random=()=>.25;open();sale();assert.equal(C.getCrimes().length,0);
// Friends and party police never report, even with a winning roll.
reset();profiles.Witness.score=50;events.push(makeEvent(2,'Witness',0,2),makeEvent(3,'Companion',0,1));events[2].event=()=>({name:'Companion',pages:[{list:[{code:117,parameters:[124]}]}]});Math.random=()=>0;open();sale();assert.equal(C.getCrimes().length,0);
// A visible officer reports even with a losing civilian roll.
reset();events.push(makeEvent(2,'Police Officer',0,2));Math.random=()=>.999;open();sale();assert.equal(C.getCrimes().length,1);
// A live manhunt closes in-person drug counters without affecting PharmaDrop.
reset();C.setHeat(C.heatChaseThreshold());open();assert.equal(M.access(shop._exoticSubstanceContext).reason,'Active manhunt');assert.equal(sale(),0);assert(M.access({kind:'net'}).allowed);
// Multiple reporters and mixed drug basket => one fine for actual quantities.
reset();profiles.Witness.score=0;events.push(makeEvent(2,'Police Officer',0,2),makeEvent(3,'Witness',1,1));Math.random=()=>0;open();
M.ledger(shop._exoticSubstanceContext,9001).demand=1;const oldBag=bag[9001];shop.commitSale([[h,4],[synth,2],[$dataItems[9003],1]]);
assert.equal(bag[9001],oldBag-1);assert.equal(M.crime.debug.last.units,4);assert.equal(C.getCrimes().length,1);assert.equal(deeds.length,1);assert.equal(C.getTotalBounty(),25000+Math.round(M.crime.debug.last.value*.5));
assert(C.isWanted());assert.equal(sale(1,synth),0);assert.equal(C.getCrimes().length,1);
// Rejected, empty, and purchase-only transactions do not file charges.
reset();events.push(makeEvent(2,'Police Officer',0,2));open();profiles.Alice.score=44;assert.equal(sale(),0);assert.equal(C.getCrimes().length,0);
profiles.Alice.score=45;shop._item=h;shop.doBuy(1);assert.equal(C.getCrimes().length,0);shop.commitSale([]);assert.equal(C.getCrimes().length,0);
// Sight honors native wall/direction/range/night/stealth rules.
for(const mode of ['wall','away','far','night','stealth']){
 reset();profiles.Witness.score=0;events.push(makeEvent(2,'Witness',0,mode==='far'?7:mode==='night'||mode==='stealth'?5:2,mode==='away'?2:8));
 wall=mode==='wall';global.$gameWeather={sunlightMode:mode==='night'?'night':'day'};
 LookStats.ofActor=()=>({stealth:mode==='stealth'?100:0,intimidation:0});Math.random=()=>0;open();sale();assert.equal(C.getCrimes().length,0,mode);
}
wall=false;global.$gameWeather={sunlightMode:'day'};LookStats.ofActor=()=>({stealth:0,intimidation:0});
// Normal-NPC barter uses focused actor's opinion, not the leader's.
reset();events.push(makeEvent(2,'Witness',0,2));profiles.Witness.score=-100;profiles.Alice.score=30;
$gameTemp._npcTradeWith='Alice';$gameTemp._npcTradeSellFactor=1;$gameTemp._exoticSubstanceTradeOrigin={name:'Alice',event:1,actorId:2};
open();Math.random=()=>0;sale();assert.equal(C.getCrimes().length,0);assert.equal(shop._exoticSubstanceContext.actorId,2);
reset();events.push(makeEvent(2,'Witness',0,2));profiles.Alice.score=30;$gameTemp._npcTradeWith='Alice';$gameTemp._npcTradeSellFactor=1;$gameTemp._exoticSubstanceTradeOrigin={name:'Alice',event:1,actorId:1};open();sale();assert.equal(C.getCrimes().length,1);
// Captured map context can bridge a dialogue scene; props are excluded.
reset();events.push(makeEvent(2,'Witness',0,2),makeEvent(4,'Lamp',0,1,''));SceneManager._scene.stop();SceneManager._scene=new Scene_Base();open();sale();assert.equal(C.getCrimes().length,1);assert(!M.crime.debug.last.witnesses.some(w=>w.name==='Lamp'));
// Renamed procedural shop identities resolve before party/friend exemptions.
reset();events.push(makeEvent(2,'Template',0,2));global.NPCSim={npcNameForEvent:e=>e?.eventId()===2?'Companion':e?.event().name};open();sale();assert.equal(C.getCrimes().length,0);delete global.NPCSim;
console.log('PASS: native sight and heat, civilian probability boundaries, party/police/buyer exclusions, focused actor barter, bulk aggregation, purchases/rejections, walls/night/stealth and persona resolution.');
// Payment patch targets only the arrest payment branch, not pardon commands.
reset();C.addCrime('Drug Dealing',55000,'drugDealing');const it=new Game_Interpreter();it.setup($dataCommonEvents[124].list,2);
const payCommands=it._list.filter(c=>c.code===357&&c.parameters[1]==='payArrestFine');assert.equal(payCommands.length,2);
assert.equal($dataCommonEvents[124].list.filter(c=>c.code===357&&c.parameters[1]==='payArrestFine').length,0);
const before=money;PluginManager.callCommand(it,'ExoticSubstances','payArrestFine',{});assert.equal(before-money,55000);assert.equal(C.getTotalBounty(),0);assert.equal(C.getHeat(),0);
PluginManager.callCommand(it,'ExoticSubstances','payArrestFine',{});assert.equal(before-money,55000);
C.addCrime('Drug Dealing',55000,'drugDealing');money=10;PluginManager.callCommand(it,'ExoticSubstances','payArrestFine',{});assert.equal(money,10);assert.equal(C.getTotalBounty(),55000);assert.equal(it.jumped,'Restart');money=10000000;
// Existing upstream debit => do not introduce a second one.
const originalList=$dataCommonEvents[124].list;$dataCommonEvents[124].list=originalList.slice();$dataCommonEvents[124].list.splice(5,0,{code:125,indent:1,parameters:[1,1,66]});it.setup($dataCommonEvents[124].list,2);assert(!it._list.some(c=>c.parameters?.[1]==='payArrestFine'));$dataCommonEvents[124].list=originalList;
// Native prison manager gets fixed game-time terms and persistent deadlines.
assert.equal(M.crime.prisonMinutes(55000),360);assert.equal(M.crime.prisonMinutes(10000),60);assert.equal(M.crime.prisonMinutes(10001),120);assert.equal(M.crime.prisonMinutes(999999999),10080);
const originalMap=$gameMap.mapId;$gameMap.mapId=()=>1102;$gameVariables.setValue(114,1000);
prisonManager.startPrisonTime(55000,0);assert.equal(prisonManager._sentenceReleaseTime,1360);const saved=JSON.parse(JSON.stringify($gameSystem));
$gameVariables.setValue(114,1120);DataManager.extractSaveContents(saved);prisonManager.startPrisonTime(55000,0);assert.equal(prisonManager._sentenceReleaseTime,1360);
PluginManager.callCommand(it,trialPlugin,'autoServeSentence',{});assert.equal(advances.at(-1).n,240);assert.equal(advances.at(-1).opts.drain,false);assert.equal($gameVariables.value(114),1360);assert.equal(C.getTotalBounty(),0);assert(!prisonManager._isInPrison);assert(!$gameSystem._exoticSubstancesCrimeSentence);
// The async release guard prevents double-clicks from passing time twice.
const advancesBefore=advances.length;PluginManager.callCommand(it,trialPlugin,'autoServeSentence',{});assert.equal(advances.length,advancesBefore);
console.log('PASS: arrest deduction exactly once, insufficient funds, upstream-debit compatibility, sentence conversion/cap, save reload, elapsed-time credit and repeated serve guard.');
`);
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 run(`
 // Explicit trial term exceeds the conversion cap and must remain intact.
 $gameVariables.setValue(114,2000);C.addCrime('Drug Dealing',55000,'drugDealing');prisonManager.startPrisonTime(55000,43200);assert.equal(prisonManager._sentenceReleaseTime,45200);
 PluginManager.callCommand(new Game_Interpreter(),trialPlugin,'autoServeSentence',{});assert.equal(advances.at(-1).n,43200);assert.equal(C.getTotalBounty(),0);
 console.log('PASS: native fixed trial sentence retained (30 days), native release clears record.');
 // Simulated plugin rename and late registration must not skip or double time.
 global.testPrison={_isInPrison:true,_sentenceReleaseTime:$gameVariables.value(114)+90,_releasing:false};
 global.prisonManager=testPrison;global.releases=0;
 const renamed=function(args){assert.equal(this.marker,42);assert.equal(args.test,true);releases++;this.returned=true;testPrison._releasing=true;return 'released';};
 PluginManager.registerCommand('Future/Court','autoServeSentence',renamed);
 PluginManager.registerCommand('Alias/Court','autoServeSentence',renamed);
 const beforeCount=advances.length,caller={marker:42};
 assert.equal(PluginManager.callCommand(caller,'Future/Court','autoServeSentence',{test:true}),'released');
 assert(caller.returned);assert.equal(advances.at(-1).n,90);assert.equal(advances.length,beforeCount+1);
 PluginManager.callCommand(caller,'Alias/Court','autoServeSentence',{test:true});assert.equal(releases,1);assert.equal(advances.length,beforeCount+1);
 console.log('PASS: actual current prison event/handler, renamed and late-registered sentence commands, alias deduplication and callback context.');
 `);
})().catch(e=>{console.error(e);process.exitCode=1;});
