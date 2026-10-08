const fs=require('fs');
const path=require('path');
const assert=require('assert');

const root=path.resolve(__dirname,'..');
const upstream=path.resolve(process.argv[2]||process.env.HE_UPSTREAM||'upstream-083');
const modRoot=path.join(root,'mods','ExoticSubstances','js','plugins');
const source=fs.readFileSync(path.join(root,'source','ExoticSubstances.js'),'utf8');
const money=fs.readFileSync(path.join(modRoot,'Economy','MoneyFormatter.js'),'utf8');
const moneyBase=fs.readFileSync(path.join(upstream,'js','plugins','Economy','MoneyFormatter.js'),'utf8').trimEnd();
const lootBase=fs.readFileSync(path.join(upstream,'js','plugins','Crafting','RandomLootSystem.js'),'utf8');

assert(money.startsWith(moneyBase+'\n\n/* Exotic Substances save cleanup.'));
assert(money.includes('/* Exotic Substances 0.4.0'));
assert(!fs.existsSync(path.join(modRoot,'Crafting','RandomLootSystem.js')),'Never ship a RandomLootSystem override');
assert(lootBase.includes('const EXPRESSION_SEED_CHANCE = 0.01;'));
assert(source.includes('<Restricted>'));
assert(source.includes('installDrugLoot()'));

const transaction=source.slice(source.indexOf('function transact('),source.indexOf('const MENU_TEXT'));
assert(transaction.includes('Illicit trust is its own progression'));
assert(!transaction.includes('NPCSim.noteShopPurchase('),'Drug transactions must not advance legal shop loyalty');
assert(source.includes("const VERSION='0.4.0'"));
console.log('PASS: 0.8.3 MoneyFormatter base preserved, no loot-system override, and drugs remain outside legal shop loyalty.');
