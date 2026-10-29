// Independent diagnostic of Studio's exact runner; filesystem adapter ONLY for Windows URL pathname defect.
const fs=require('fs'),path=require('path'),{createRequire}=require('module'),{pathToFileURL}=require('url');
const root=path.resolve(process.argv[2]),out=process.argv[3],load=createRequire(path.join(root,'package.json')),ts=load('typescript');
const file=path.join(root,'src/lib/__tests__/createSafety.test.ts'),src=fs.readFileSync(file,'utf8');
const body=src.slice(src.indexOf('function makeCreateRunner()'),src.indexOf("describe('CWR/CW1/CW2"));
const patchedFs={...fs,readFileSync:(p,...args)=>fs.readFileSync(typeof p==='string'&&/^\/[A-Za-z]:\//.test(p)?p.slice(1):p,...args)};
function adaptedRequire(url){const req=createRequire(url);return n=>n==='fs'?patchedFs:req(n)}
const code=ts.transpileModule(body.replaceAll('import.meta.url',JSON.stringify(pathToFileURL(file).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const make=new Function('createRequire','transpileModule','ModuleKind','ScriptTarget','JsxEmit',code+';return makeCreateRunner')(adaptedRequire,ts.transpileModule,ts.ModuleKind,ts.ScriptTarget,ts.JsxEmit);
const now=Date.now,results=[];
try{for(const clock of ['2026-10-29T08:00:00','2026-10-29T13:00:00']){Date.now=()=>new Date(clock).getTime();const r=make();r.reset();r.doSubmit();results.push({clock,expectedWrites:1,actualWrites:r.writes.length,errors:r.errors,pass:r.writes.length===1})}}finally{Date.now=now}
const result={scope:'Studio runner extracted unchanged, import.meta URL supplied; fs adapter repairs /C:/ read path only. Same runner and production Create exercised before/after fixed fixture deadline.',results};fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));process.exitCode=results.every(x=>x.pass)?0:1;
