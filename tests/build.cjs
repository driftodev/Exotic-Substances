const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const upstream=path.resolve(process.argv[2]||process.env.HE_UPSTREAM||'upstream-083');
const source=['uninstall-cleanup.js','ExoticSubstances.js'].map(name=>fs.readFileSync(path.join(root,'source',name),'utf8').trimEnd()).join('\n\n')+'\n';
const bundlePath=path.join(root,'mods','ExoticSubstances','js','plugins','Economy','MoneyFormatter.js');
fs.mkdirSync(path.dirname(bundlePath),{recursive:true});
const moneyBase=fs.readFileSync(path.join(upstream,'js','plugins','Economy','MoneyFormatter.js'),'utf8').trimEnd();
fs.writeFileSync(bundlePath,moneyBase+'\n\n'+source);

// No RandomLootSystem replacement. Loot integration lives in the runtime hooks.
const manifest={title:'Exotic Substances',description:'Nine underground substances and a regional drug trading economy. Includes Hyperdeck app PharmaDrop, supply and demand variance, crime and discoverable lore.',version:'0.4.0',tags:['Gameplay','Economy']};
fs.writeFileSync(path.join(root,'mods','ExoticSubstances','mod.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Rebased MoneyFormatter.js on '+upstream+'; native random loot is untouched.');
console.log('Injected '+path.relative(root,path.join(root,'source','ExoticSubstances.js')));
