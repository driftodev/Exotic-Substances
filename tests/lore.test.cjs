// Native topic matching/learning plus the mod's LLM entry points and app boot.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
global.Messages={DialogueTopics:JSON.parse(fs.readFileSync((process.env.HE_UPSTREAM||'upstream-083')+'/js/db/Messages/DialogueTopics.json','utf8'))};
global.MarkovLLM={reply:s=>s,generate:s=>s};
let vanillaCommands=0;global.PluginManager={parameters:()=>({}),registerCommand(){},callCommand(){vanillaCommands++;return 'vanilla';}};
require('./market.test.cjs');
const lore=ExoticSubstances.lore;
assert.equal(lore.entries.length,18);
for(const p of lore.entries){const page=Object.values(Messages.DialogueTopics).find(x=>x.keyword===p.key);assert(page&&page.raw&&page.description.length>150);}
const count=Object.keys(Messages.DialogueTopics).length;lore.register();assert.equal(Object.keys(Messages.DialogueTopics).length,count);
const original={npcName:'Officer Test',npcBio:'A police officer.',npcSheet:'Patient and observant.',world:'Existing world facts.',topics:'Existing topic.',startText:'What is Fractilized Cocaine?',history:[]};
const answer=MarkovLLM.reply(original);
assert(answer.npcBio.startsWith('CANON: Frack requires matured'));assert(answer.npcBio.includes('police officer'));assert(answer.topics.includes('never contradict canon'));assert(answer.topics.includes('Existing topic.'));assert(answer.world.includes('Existing world facts.'));
assert.equal(original.npcBio,'A police officer.');assert(!original.world.includes('Meld Resin'));
assert(MarkovLLM.generate({startText:'Tell me about Meld Resin'}).topics.includes('Riftflower'));
assert(!lore.context({startText:'I play synthesizers'}).topics);
assert(lore.context({startText:'What about its risks?',history:[{text:'Tell me about Synth'}]}).topics.includes('tolerance'));
const capsule=q=>lore.context({startText:q,npcBio:'Gruff CEO.',npcSheet:'Gruff.'}).npcBio;
assert(capsule('What do you know about illegal drugs?').startsWith('CANON: Illegal: Meld'));
assert(capsule('Is Meld legal around here?').includes('illegal everywhere'));
assert(capsule('How is Frack related to Red Cocaine?').includes('requires matured, completed Red Cocaine'));
assert(capsule('Is Red Cocaine illegal too?').includes('decriminalized'));
assert(capsule('What happened to psychedelic mushrooms after Y2K?').includes('gradually stopped fruiting reliably'));
assert(capsule('How is Nectar taken?').includes('amber vapor'));
assert(capsule('Does Lethe heal injuries?').includes('never heal'));
assert(capsule('Do you smoke Riftflower?').includes('nasal inhaler'));
assert(capsule('Can Meld be made from good flower?').includes('good flower works'));
assert(capsule('Are Vesper Wafers food?').includes('circuitry, not food'));
assert(capsule('Is Splice just another Bloomprint?').includes('derived from Continuity'));
assert(capsule('When do PharmaDrop prices change?').includes('every Monday'));
assert(capsule('Will every witness report a drug deal?').includes('Party members never report'));
assert(capsule('Would sugar help with Hush?').includes('reduce coordination penalties'));
const recipe=lore.context({startText:'What is your favorite preparation of Hush?',npcBio:'Gruff CEO.',npcSheet:'Gruff.'});
assert(recipe.npcBio.includes('invent a personal sweet recipe'));assert(recipe.topics.includes('fruit, juice, preserves'));
const native=fs.readFileSync((process.env.HE_UPSTREAM||'upstream-083')+'/js/plugins/NPC/DialogueSystem.js','utf8');
let section=native.slice(native.indexOf('    function announceKeywords('),native.indexOf('    // NPC Exchange: a two-line'));
// The unrelated message buffer renderer references helpers outside this section.
section=section.slice(0,section.indexOf('    Game_Message.prototype.processMessageBuffer'))+section.slice(section.indexOf('    // Rumors\n'));
global.ConfigManager={language:'en'};
global.HelpCodex={titleOf:key=>key};
$gameParty.members().forEach((a,i)=>{a.name=()=>i?'Companion':'Player';a._keywords=[];});
vm.runInThisContext('(function(){'+section+'})();');
const html=DialogueTopics.html('Meld Resin, Synth and Fractilized Cocaine are sold on PharmaDrop.');
for(const word of ['Meld Resin','Synth','Fractilized Cocaine','PharmaDrop'])assert(html.includes('<span class="msg-keyword">'+word+'</span>'));
assert.equal(DialogueTopics.resolve('synthetic psilocybin'),'Syntheogen');
assert.notEqual(DialogueTopics.resolve('Hexhash'),'Meld Resin');
for(const a of $gameParty.members())assert(a._keywords.includes('Syntheogen'));
const learned=$gameParty.leader()._keywords.length;DialogueTopics.mark('Synth');assert.equal($gameParty.leader()._keywords.length,learned);
assert(!DialogueTopics.html('dealer withdrawal synthesizer').includes('msg-keyword'));
const saved=JSON.parse(JSON.stringify($gameParty.leader()._keywords));assert(saved.includes('Meld Resin'));
assert.equal(HypernetOS.app.name,'PharmaDrop');
assert.equal(lore.rare.length,42);assert.equal(lore.chance,1/175);
assert(lore.rare.filter(f=>f.topic==='Preparing Hush').length>=3);
assert(lore.rare.filter(f=>f.topic==='Bloomprints').length>=8);
assert(!lore.rare.some(f=>/malicious prints announce/i.test(f.line)));
// Exercise the real two-phase intro with controllable timers and DOM events.
class El{constructor(){this.children=[];this.style={};this.listeners={};this.textContent='';}get firstChild(){return this.children[0];}appendChild(c){this.children.push(c);return c;}removeChild(c){this.children.splice(this.children.indexOf(c),1);}addEventListener(n,f){this.listeners[n]=f;}removeEventListener(n){delete this.listeners[n];}}
const root=new El();global.document={getElementById:()=>root,createElement:()=>new El()};
const oldSet=global.setTimeout,oldClear=global.clearTimeout;let tasks=[],cancelled=new Set();
global.setTimeout=f=>{tasks.push(f);return tasks.length;};global.clearTimeout=id=>cancelled.add(id);
HypernetOS.Net.hasUplink=()=>true;
HypernetOS.app.launchFn();assert(root.innerHTML.includes('Health &amp; wellbeing'));tasks[0]();assert(root.innerHTML.includes('0101'));tasks[1]();assert(root.children.some(e=>e.textContent==='PharmaDrop'));
root.children=[];HypernetOS.app.launchFn();assert(root.innerHTML.includes('Health &amp; wellbeing'));assert.equal(tasks.length,3);
global.setTimeout=oldSet;global.clearTimeout=oldClear;
// Eligible ordinary NPC chatter very rarely substitutes one authored fact,
// learns its full topic, and exhausts unseen lines before recycling them.
const spoken=[];global.$gameMessage={setBackground(){},setPositionType(){},add:s=>spoken.push(s)};
NPCEmpathize._helpers._getProfile=()=>({personalityIndex:0});NPCEmpathize.isNonSentientNPC=()=>false;
$gameMap.event=()=>({event:()=>({name:'Alice'}),turnTowardPlayer(){this.turned=true;}});SceneManager._scene={};
const it={_eventId:1,setWaitMode:m=>it.wait=m},oldRandom=Math.random;let rolls=[0,0];Math.random=()=>rolls.shift()??0;
assert(lore.tryDrop(it));assert.equal(spoken.length,1);assert.equal(it.wait,'message');assert.equal($gameSystem._exoticSubstancesLoreDrops.last,'meld-quality');assert($gameParty.leader()._keywords.includes('Meld Resin'));
rolls=[0,0];assert.equal(PluginManager.callCommand(it,'NPC/DialogueSystem','Rumors',{}),true);assert.equal($gameSystem._exoticSubstancesLoreDrops.last,'meld-circle');assert.equal(vanillaCommands,0);
Math.random=()=>1/175;assert.equal(PluginManager.callCommand(it,'NPC/DialogueSystem','Rumors',{}),'vanilla');assert.equal(spoken.length,2);assert.equal(vanillaCommands,1);Math.random=oldRandom;
console.log('PASS: eighteen codex pages, forty-two rare authored lore drops at 1/175, unseen-line rotation/topic learning, native gold highlighting/aliases/party discovery/save fields, bounded LLM lore and unchanged input context, pharmacy/glitch/store sequence and every-open boot.');
