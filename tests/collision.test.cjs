const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const fixture=fs.readFileSync(__dirname+'/market.test.cjs','utf8').split('vm.runInThisContext')[0];
const source=fs.readFileSync(__dirname+'/../source/ExoticSubstances.js','utf8');
function bootWith(type){
 const sandbox={require,console,process:{argv:[null,null,path.resolve(process.argv[2]||'hypernet-explorer-plugins/data/Items.json')]},__dirname};
 sandbox.global=sandbox;vm.createContext(sandbox);vm.runInContext(fixture,sandbox);
 sandbox.$dataStates=[];
 if(type==='divider')sandbox.$dataItems[9000]={id:9000,name:'Foreign Divider',itypeId:1};
 else if(type==='item')sandbox.$dataItems[9001]={id:9001,name:'Foreign Remedy',itypeId:1};
 else sandbox.$dataStates[9001]={id:9001,name:'Foreign Trance'};
 let shown=null;sandbox.Graphics={printError:(title,message)=>shown={title,message}};
 vm.runInContext(source,sandbox);
 let error;try{vm.runInContext('new Scene_Boot().create()',sandbox);}catch(e){error=e;}
 return {error,shown};
}
for(const [type,name,id] of [['divider','Foreign Divider',9000],['item','Foreign Remedy',9001],['state','Foreign Trance',9001]]){
 const {error,shown}=bootWith(type);assert(error);
 assert(error.message.includes((type==='state'?'state':'item')+' ID '+id));assert(error.message.includes(name));
 assert(error.message.includes('another installed mod'));assert(error.message.includes('prevent save corruption'));
 assert.equal(shown.title,'Exotic Substances conflict');assert.equal(shown.message,error.message);
}
console.log('PASS: occupied divider/item/state IDs stop loading with the ID, entry name, likely cause and safe resolution.');
