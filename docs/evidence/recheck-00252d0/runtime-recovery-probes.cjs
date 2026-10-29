// Independent review instrument; unchanged production Create component, controlled hooks.
// Not mounted browser or real wallet coverage.
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]),load=createRequire(path.join(root,'package.json'));
const ts=load('typescript'),React=load('react'),v=load('viem');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const js=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const c=read('src/config.ts');
const money=new Function('PRODUCT_DECIMALS','QUANTUM','UINT256_MAX',js(c.slice(c.indexOf('export function parseProductAmount'),c.indexOf('export function explorerTxUrl')).replaceAll('export function','function'))+';return {parseProductAmount,formatNativeAmount}')(6,10n**12n,(1n<<256n)-1n);
const a=read('src/contract.ts');
const abi=new Function(js(a.slice(a.indexOf('export const HUIPOT_ABI')).replace('export const','const'))+';return HUIPOT_ABI')();
const contract='0x81a139599d252eb2dc2bbb6c267e911a21264288',wallet='0x1111111111111111111111111111111111111111';
let hashValue,retries,nextReceipt;
let states,index,writes,switches,connected,chain,receipt,errors,account,refs,refIndex,waitArgs;
const HASH_A='0x'+'a'.repeat(64),HASH_B='0x'+'b'.repeat(64);
const noop=()=>{};
const mocks={react:{...React,useState:()=>{const i=index++;return [states[i],x=>{if(i===7)errors=x}]},useRef:initial=>{const i=refIndex++;return refs[i]??(refs[i]={current:initial})}},'react-router-dom':{Link:'a'},wagmi:{useAccount:()=>({address:account,chainId:chain,isConnected:connected}),useSwitchChain:()=>({switchChain:x=>switches.push(x)}),useWriteContract:()=>({writeContract:x=>{writes.push(x);hashValue=HASH_A},data:hashValue,isPending:false,isError:false}),useWaitForTransactionReceipt:args=>{waitArgs=args;return {...receipt,refetch:receipt.refetch??(()=>{retries++;if(nextReceipt)receipt=nextReceipt;return Promise.resolve({data:receipt.data})})}}},connectkit:{ConnectKitButton:{Custom:()=>null}},'lucide-react':new Proxy({},{get:()=>()=>null}),'../contract':{HUIPOT_ADDRESS:contract,HUIPOT_ABI:abi,DEPLOYMENT_CONFIGURED:true},'../config':{...money,TARGET_CHAIN_ID:5042002,explorerTxUrl:x=>x},'../lib/utils':{formatDeadline:()=>'',parseOnchainError:()=>''},'../components/CommitmentNotice':{CommitmentNotice:()=>null}};
const mod={exports:{}};new Function('require','module','exports',js(read('src/pages/Create.tsx')))(n=>mocks[n]??load(n),mod,mod.exports);
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
function reset(){hashValue=undefined;retries=0;nextReceipt=null;states=[' test ',' 1 ','1',wallet,'2026-10-29','12:00',true,{}];index=0;refIndex=0;refs=[];account=wallet;waitArgs=null;writes=[];switches=[];errors={};connected=true;chain=5042002;receipt={isLoading:false,isSuccess:false}}
const results=[];
function render(){index=0;refIndex=0;return mod.exports.Create()}
function submit(){const t=render();nodes(t).find(x=>x.type==='form').props.onSubmit({preventDefault:noop});return t}
function log(opts={}){const values={poolId:1n,creator:wallet,recipient:wallet,target:10n**18n,deadline:BigInt(new Date('2026-10-29T12:00:00').getTime()/1000),title:'test',purpose:'1',address:contract,...opts};return {address:values.address,topics:v.encodeEventTopics({abi,eventName:'PoolCreated',args:values}),data:v.encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'string'},{type:'string'}],[values.target,values.deadline,values.title,values.purpose])}}
function confirm(opts={},logs){receipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:logs??[log(opts)]}};return render()}
function success(tree){return nodes(tree).some(x=>x.type==='h1'&&x.props.children==='Pool created')}
function links(tree){return nodes(tree).filter(x=>x.type==='a'&&typeof x.props.href==='string').map(x=>x.props.href)}
function test(name,fn){reset();try{const r=fn();results.push({name,...r,pass:r.actual===r.expected})}catch(e){results.push({name,pass:false,error:String(e)})}}
const originalNow=Date.now;Date.now=()=>new Date('2026-10-29T08:00:00').getTime();
function textOf(tree){return JSON.stringify(tree,(_,x)=>typeof x==='bigint'?x.toString():x)}
function retryButton(t){return nodes(t).find(x=>x.type==='button'&&/Check transaction status|Retry confirmation check/.test(textOf(x)))}
function submitButton(t){return nodes(t).find(x=>x.type==='button'&&x.props.type==='submit')}
function record(name,actual,expected=true,details={}){results.push({name,actual,expected,pass:actual===expected,...details})}
async function settle(observer){
 for(let i=0;i<200;i++){const r=observer.getCurrentResult();if(r.status!=='pending'&&r.fetchStatus==='idle')return;await new Promise(r=>setTimeout(r,5));}
 throw new Error('query did not settle within the instrumentation bound');
}
async function main(){
 const {QueryClient,QueryObserver}=load('@tanstack/query-core');
 const {waitForTransactionReceiptQueryOptions}=load('@wagmi/core/query');
 reset();submit();render();
 const revertedReceipt={status:'reverted',transactionHash:HASH_B,logs:[]};
 const revertClient={chain:{id:5042002},waitForTransactionReceipt:async()=>revertedReceipt,getTransaction:async()=>({from:wallet,to:contract,input:'0x',type:'eip1559'}),call:async()=>({})};
 const qc=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const ro=new QueryObserver(qc,{...waitForTransactionReceiptQueryOptions({getClient:()=>revertClient},waitArgs),enabled:false});
 const unsub=ro.subscribe(()=>{});await ro.refetch();receipt=ro.getCurrentResult();
 const tree=render();
 const revertedHeading=nodes(tree).some(x=>x.type==='h1'&&String(x.props.children).includes('Transaction reverted'));
 record('Actual wagmi reverted path reaches distinct reverted presentation',revertedHeading,true,{queryStatus:receipt.status,isSuccess:receipt.isSuccess,isError:receipt.isError,hasData:!!receipt.data,message:receipt.error?.message,hasGenericError:textOf(tree).includes('Could not confirm the transaction'),hasRetry:!!retryButton(tree)});
 unsub();qc.clear();

 reset();submit();render();let ready=false,reads=0;
 const timerClient={uid:'review-00252d0-bounded',chain:{id:5042002},pollingInterval:1000,getTransactionReceipt:async()=>{reads++;return ready?{status:'success',transactionHash:HASH_B,logs:[log()]}:null},watchBlockNumber:()=>()=>{}};
 const tq=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const to=new QueryObserver(tq,{...waitForTransactionReceiptQueryOptions({getClient:()=>timerClient},waitArgs),enabled:false});
 const tunsub=to.subscribe(()=>{}),start=performance.now();
 await to.refetch();receipt=to.getCurrentResult();const timeoutTree=render();
 record('Real viem 30000ms timeout shows unknown and preserves submission lock',receipt.error?.name==='WaitForTransactionReceiptTimeoutError'&&textOf(timeoutTree).includes('Confirmation timed out')&&submitButton(timeoutTree)?.props.disabled===true&&links(timeoutTree).includes(HASH_A),true,{elapsedMs:Math.round(performance.now()-start),timeout:waitArgs.timeout,errorName:receipt.error?.name,reads,queryRetry:false});
 ready=true;retryButton(timeoutTree).props.onClick();await settle(to);receipt=to.getCurrentResult();
 record('After actual timeout retry confirms with original snapshot and one write',success(render())&&writes.length===1,true,{writes:writes.length,reads});
 tunsub();tq.clear();
}
main().catch(e=>{record('Instrument error',String(e),'no error');process.exitCode=2}).finally(()=>{
 Date.now=originalNow;
 const result={scope:'Unchanged Create; actual wagmi query/action, QueryObserver and actual viem 30-second timer; client receipt and block watcher controlled, retry:false for one-attempt diagnostic. No network or wallet.',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(result.failed&&!process.exitCode)process.exitCode=1;
});
