'use strict';
const fs = require('fs'), path = require('path'), {createRequire} = require('module');
const root = path.resolve(process.argv[2] || '.');
const output = path.resolve(process.argv[3] || 'pf1-additional-results.json');
const load = createRequire(path.join(root, 'package.json'));
const ts = load('typescript'), viem = load('viem');
function compile(source) {
  const m = {exports:{}};
  new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(load,m,m.exports);
  return m.exports;
}
const {classifyPoolQuery} = compile(fs.readFileSync(path.join(root,'src/lib/poolQueryState.ts'),'utf8'));
const contractSource=fs.readFileSync(path.join(root,'src/contract.ts'),'utf8');
const {HUIPOT_ABI}=compile(contractSource.slice(contractSource.indexOf('export const HUIPOT_ABI')));
const contractArtifact=JSON.parse(fs.readFileSync(path.join(root,'contracts/out/HuiPotGoalPool.sol/HuiPotGoalPool.json'),'utf8'));
const errorAbi=contractArtifact.abi.find(x=>x.type==='error'&&x.name==='InvalidPoolId');
if(!errorAbi) throw new Error('Contract artifact lacks error');
const revertData=viem.encodeErrorResult({abi:[errorAbi],errorName:'InvalidPoolId'});
const base={poolData:undefined,poolIsLoading:false,poolIsError:true,poolError:undefined,poolFetchStatus:'idle',countData:undefined,countIsError:true,countFetchStatus:'idle',poolIdBig:1n};
const results=[];
function record(name,expected,actual,details={}) {results.push({name,expected,actual,pass:expected===actual,...details});}
async function realError(abi) {
  const client=viem.createPublicClient({transport:viem.custom({request:async()=>{throw new viem.RpcRequestError({body:{method:'eth_call'},error:{code:3,message:'execution reverted',data:revertData},url:'fixture://no-network'});}},{retryCount:0})});
  try {await client.readContract({address:'0x81a139599d252eb2dc2bbb6c267e911a21264288',abi,functionName:'getPool',args:[1n]});throw new Error('Unexpected success');}
  catch(error){return error;}
}
function chain(error) {const result=[];for(let e=error;e;e=e.cause)result.push({name:e.name,errorName:e.data?.errorName,signature:e.signature,raw:e.raw});return result;}
(async()=>{
  process.argv[2]=root;process.argv[3]=path.join(__dirname,'unused-output.json');
  const {makePage}=require('./page-harness.cjs');
  const error=await realError(HUIPOT_ABI);
  record('actual application ABI + actual viem readContract InvalidPoolId + unavailable count','not-found',classifyPoolQuery({...base,poolError:error}),{errorChain:chain(error),revertData,abiHasError:HUIPOT_ABI.some(x=>x.type==='error'&&x.name==='InvalidPoolId')});
  const control=await realError([...HUIPOT_ABI,errorAbi]);
  record('probe-only positive control adding contract artifact error ABI','not-found',classifyPoolQuery({...base,poolError:control}),{errorChain:chain(control)});
  record('stale cached count zero refetching; requested pool still loading','loading',classifyPoolQuery({...base,poolIsError:false,poolIsLoading:true,poolFetchStatus:'fetching',countData:0n,countIsError:false,countFetchStatus:'fetching'}));
  record('stale cached count zero refetching; requested pool transport failure','network',classifyPoolQuery({...base,poolError:new Error('transport'),countData:0n,countIsError:false,countFetchStatus:'fetching'}));
  const {QueryClient,QueryObserver}=load('@tanstack/react-query');
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  client.setQueryData(['count'],0n,{updatedAt:Date.now()-60000});
  const countObserver=new QueryObserver(client,{queryKey:['count'],queryFn:()=>new Promise(()=>{}),staleTime:0});
  const poolObserver=new QueryObserver(client,{queryKey:['pool',1],queryFn:()=>new Promise(()=>{}),staleTime:0});
  const stopCount=countObserver.subscribe(()=>{}),stopPool=poolObserver.subscribe(()=>{});
  const countResult=countObserver.getCurrentResult(),poolResult=poolObserver.getCurrentResult();
  const queryEvidence={count:{data:String(countResult.data),status:countResult.status,isStale:countResult.isStale,isError:countResult.isError,fetchStatus:countResult.fetchStatus},pool:{status:poolResult.status,isLoading:poolResult.isLoading,fetchStatus:poolResult.fetchStatus}};
  for(const page of ['Pool','Proof']) {
    record(`${page}: real viem error through production page`,'not-found',makePage(page,{reads:{getPool:{isError:true,error},poolCount:{isError:true}}}).kind());
    record(`${page}: real TanStack stale refetch state through production page`,'loading',makePage(page,{reads:{getPool:poolResult,poolCount:countResult}}).kind(),{queryEvidence});
  }
  stopCount();stopPool();client.clear();
  const payload={scope:'Real installed viem readContract with deterministic local transport; production ABI and classifier. No RPC or wallet used.',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
  fs.writeFileSync(output,JSON.stringify(payload,null,2)+'\n');
  console.log(JSON.stringify(payload,null,2));process.exitCode=payload.failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=2});
