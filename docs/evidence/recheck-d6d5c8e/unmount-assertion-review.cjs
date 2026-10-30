// Review-only negative control: mutate the transpiled source in memory, never files.
const fs=require('fs'),path=require('path'),{createRequire}=require('module'),{pathToFileURL,fileURLToPath}=require('url');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),load=createRequire(path.join(root,'package.json'));
const ts=load('typescript'),testPath=path.join(root,'src/lib/__tests__/createSafety.test.ts');
const test=fs.readFileSync(testPath,'utf8');
const fn=test.slice(test.indexOf('function makeCreateRunner()'),test.indexOf("describe('CWR/CW1/CW2"));
const compiled=ts.transpileModule(fn.replaceAll('import.meta.url',JSON.stringify(pathToFileURL(testPath).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function make(mutant){
 const req=file=>{const actual=createRequire(file);return name=>{if(name!=='fs')return actual(name);return {...fs,readFileSync:(p,...args)=>{const val=fs.readFileSync(p,...args);if(mutant&&String(p).endsWith('Create.tsx'))return val.replace("}).catch(() => {\n      if (cancelled) return", "}).catch(() => {\n      /* review negative control: no catch cancellation */").replace("}).catch(() => {\r\n      if (cancelled) return", "}).catch(() => {\r\n      /* review negative control: no catch cancellation */");return val}}}};
 return new Function('createRequire','fileURLToPath','transpileModule','ModuleKind','ScriptTarget','JsxEmit',compiled+';return makeCreateRunner()')(req,fileURLToPath,ts.transpileModule,ts.ModuleKind,ts.ScriptTarget,ts.JsxEmit);
}
const saved=Date.now;Date.now=()=>new Date('2026-10-29T08:00:00').getTime();
(async()=>{const rows=[];for(const mutant of [false,true]){const r=make(mutant);r.reset();r.doSubmit();r.receipt={isLoading:false,isSuccess:false,isError:true,error:Error('revert'),fetchStatus:'idle'};let reject;r.publicClientGetReceipt=()=>new Promise((_,rej)=>{reject=rej});r.render();await r.runEffects();r.unmount();reject(Error('late rejection'));await Promise.resolve();const atMaintainedAssertion=r.lateSets;for(let i=0;i<8;i++)await Promise.resolve();rows.push({mutant,atMaintainedAssertion,afterCatchSettles:r.lateSets,maintainedAssertionPasses:atMaintainedAssertion===0});}fs.writeFileSync(out,JSON.stringify({scope:'Exact maintained runner/unmount sequence; virtual source mutation removes only catch cancellation guard. No file/source edits.',rows},null,2));console.log(JSON.stringify(rows));})().finally(()=>{Date.now=saved});
