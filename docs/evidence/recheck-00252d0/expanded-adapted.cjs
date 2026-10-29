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
 test('Pending link is outside form and submit is disabled',()=>{submit();receipt={isLoading:true,isSuccess:false};const t=render(),form=nodes(t).find(x=>x.type==='form');return {expected:true,actual:links(t).includes(HASH_A)&&!links(form).includes(HASH_A)&&submitButton(t).props.disabled===true&&retryButton(t).props.type==='button'}});
 test('Receipt error shows message, keeps submit disabled, retry calls refetch only',()=>{submit();receipt={isLoading:false,isSuccess:false,isError:true,error:new Error('RPC unavailable')};const t=render();retryButton(t).props.onClick();return {expected:true,actual:textOf(t).includes('RPC unavailable')&&submitButton(t).props.disabled===true&&retries===1&&writes.length===1}});
 test('Retry valid receipt keeps original snapshot and one write',()=>{submit();states[0]='edited after write';receipt={isError:true,isLoading:false,error:new Error('timeout')};nextReceipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:[log()]}};retryButton(render()).props.onClick();const t=render();return {expected:true,actual:success(t)&&links(t).includes(HASH_B)&&writes.length===1&&retries===1}});
 test('Retry different target remains unmatched with mined link',()=>{submit();receipt={isError:true,isLoading:false};nextReceipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:[log({target:2n*10n**18n})]}};retryButton(render()).props.onClick();const t=render();return {expected:true,actual:!success(t)&&links(t).includes(HASH_B)&&writes.length===1}});
 test('Retry unindexed pending receipt stays unknown and locked',()=>{submit();receipt={isError:true,isLoading:false};nextReceipt={isLoading:true,isSuccess:false,data:undefined};retryButton(render()).props.onClick();const t=render();return {expected:true,actual:!success(t)&&submitButton(t).props.disabled===true&&links(t).includes(HASH_A)&&writes.length===1}});
 test('Retry missing snapshot does not accept matching event',()=>{submit();refs[0].current=null;receipt={isError:true,isLoading:false};nextReceipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:[log()]}};retryButton(render()).props.onClick();return {expected:true,actual:!success(render())&&writes.length===1}});
 test('Submit handler itself blocks repeat submission during receipt error',()=>{submit();receipt={isError:true,isLoading:false};submit();return {expected:1,actual:writes.length}});

 const {QueryClient,QueryObserver,onlineManager}=load('@tanstack/query-core');
 const {waitForTransactionReceiptQueryOptions}=load('@wagmi/core/query');
 // Real query observer and real wagmi query/action; only the final client waiter is controlled.
 reset();submit();render();let waiterCalls=0,resolveWait,seenTimeout;
 const client={chain:{id:5042002},waitForTransactionReceipt:args=>{waiterCalls++;seenTimeout=args.timeout;return new Promise(r=>{resolveWait=r})}};
 const config={getClient:()=>client};
 const qc=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const observer=new QueryObserver(qc,{...waitForTransactionReceiptQueryOptions(config,waitArgs),enabled:true});
 const unsubscribe=observer.subscribe(()=>{});
 await Promise.resolve();receipt=observer.getCurrentResult();
 const pendingTree=render();const again=retryButton(pendingTree).props.onClick();await Promise.resolve();
 record('Real pending refetch starts independent receipt recovery',waiterCalls>1,true,{waiterCalls,actualTimeout:seenTimeout,status:receipt.status,fetchStatus:receipt.fetchStatus});
 record('Production waiter has finite timeout',Number.isFinite(seenTimeout)&&seenTimeout>0,true,{actualTimeout:seenTimeout});
 resolveWait({status:'success',transactionHash:HASH_B,logs:[log()]});await again;await settle(observer);
 receipt=observer.getCurrentResult();record('Real query completion validates original receipt',success(render())&&writes.length===1);
 unsubscribe();qc.clear();

 reset();submit();render();let retryCalls=0;
 const retryClient={chain:{id:5042002},waitForTransactionReceipt:async()=>{retryCalls++;if(retryCalls===1)throw new Error('RPC temporary failure');return {status:'success',transactionHash:HASH_B,logs:[log()]}}};
 const retryQC=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const retryObserver=new QueryObserver(retryQC,{...waitForTransactionReceiptQueryOptions({getClient:()=>retryClient},waitArgs),enabled:false});
 const retryUnsub=retryObserver.subscribe(()=>{});
 await retryObserver.refetch();receipt=retryObserver.getCurrentResult();
 const failedTree=render();await retryButton(failedTree).props.onClick();await settle(retryObserver);receipt=retryObserver.getCurrentResult();
 record('Real errored query retries a read and validates success without another write',success(render())&&writes.length===1&&retryCalls===2,true,{waiterCalls:retryCalls,writes:writes.length});
 retryUnsub();retryQC.clear();

 reset();submit();render();onlineManager.setOnline(false);
 const offlineQC=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const offlineObserver=new QueryObserver(offlineQC,{...waitForTransactionReceiptQueryOptions(config,waitArgs),enabled:true});
 const offlineUnsub=offlineObserver.subscribe(()=>{});receipt=offlineObserver.getCurrentResult();
 const pausedTree=render();
 const details={status:receipt.status,fetchStatus:receipt.fetchStatus,isLoading:receipt.isLoading,isError:receipt.isError,disabled:submitButton(pausedTree).props.disabled,hasExplorer:links(pausedTree).includes(HASH_A)};
 record('Real offline-paused receipt retains link and submit lock',details.disabled===true&&details.hasExplorer,true,details);
 if(!submitButton(pausedTree).props.disabled)submit();
 record('Real offline-paused user submit cannot create second write',writes.length,1,{writes:writes.length});
 offlineUnsub();offlineQC.clear();onlineManager.setOnline(true);
}
main().catch(e=>{record('Instrument error',String(e),'no error');process.exitCode=2}).finally(()=>{
 Date.now=originalNow;
 const result={scope:'Unchanged production Create with persistent controlled hooks; actual TanStack QueryObserver and wagmi query/action for pending/refetch/paused cases. Final waiter controlled; no DOM, RPC, wallet or transaction.',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 if(result.failed&&!process.exitCode)process.exitCode=1;
});
