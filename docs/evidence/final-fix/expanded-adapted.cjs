// Adapted from docs/evidence/recheck-00252d0/expanded-adapted.cjs
// CWR6: adds usePublicClient and useEffect mocks.
// Independent-pending-read diagnostic replaced with bounded-timeout/unknown assertion per STUDIO_CWR_ACCEPTANCE_RECHECK.md.
// The accepted strategy is: finite 30s timeout → unknown → safe retry; no new waiter required.
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
let states,index,writes,connected,chain,receipt,errors,account,refs,refIndex,waitArgs;
const HASH_A='0x'+'a'.repeat(64),HASH_B='0x'+'b'.repeat(64);
const noop=()=>{};
const mocks={react:{...React,useState:()=>{const i=index++;return [states[i],x=>{if(i===7)errors=x}]},useRef:initial=>{const i=refIndex++;return refs[i]??(refs[i]={current:initial})},useEffect:()=>{}},'react-router-dom':{Link:'a'},wagmi:{useAccount:()=>({address:account,chainId:chain,isConnected:connected}),useSwitchChain:()=>({switchChain:()=>{}}),useWriteContract:()=>({writeContract:x=>{writes.push(x);hashValue=HASH_A},data:hashValue,isPending:false,isError:false}),useWaitForTransactionReceipt:args=>{waitArgs=args;return {...receipt,refetch:receipt.refetch??(()=>{retries++;if(nextReceipt)receipt=nextReceipt;return Promise.resolve({data:receipt.data})})}},usePublicClient:()=>({getTransactionReceipt:()=>Promise.reject(new Error('no-op'))})},connectkit:{ConnectKitButton:{Custom:()=>null}},'lucide-react':new Proxy({},{get:()=>()=>null}),'../contract':{HUIPOT_ADDRESS:contract,HUIPOT_ABI:abi,DEPLOYMENT_CONFIGURED:true},'../config':{...money,TARGET_CHAIN_ID:5042002,explorerTxUrl:x=>x},'../lib/utils':{formatDeadline:()=>'',parseOnchainError:()=>''},'../components/CommitmentNotice':{CommitmentNotice:()=>null}};
const mod={exports:{}};new Function('require','module','exports',js(read('src/pages/Create.tsx')))(n=>mocks[n]??load(n),mod,mod.exports);
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
function reset(){hashValue=undefined;retries=0;nextReceipt=null;states=[' test ',' 1 ','1',wallet,'2026-10-29','12:00',true,{}];index=0;refIndex=0;refs=[];account=wallet;waitArgs=null;writes=[];errors={};connected=true;chain=5042002;receipt={isLoading:false,isSuccess:false}}
const results=[];
function render(){index=0;refIndex=0;return mod.exports.Create()}
function submit(){const t=render();nodes(t).find(x=>x.type==='form').props.onSubmit({preventDefault:noop});return t}
function log(opts={}){const values={poolId:1n,creator:wallet,recipient:wallet,target:10n**18n,deadline:BigInt(new Date('2026-10-29T12:00:00').getTime()/1000),title:'test',purpose:'1',address:contract,...opts};return {address:values.address,topics:v.encodeEventTopics({abi,eventName:'PoolCreated',args:values}),data:v.encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'string'},{type:'string'}],[values.target,values.deadline,values.title,values.purpose])}}
function confirm(opts={},logs){receipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:logs??[log(opts)]}};return render()}
function success(tree){return nodes(tree).some(x=>x.type==='h1'&&x.props.children==='Pool created')}
function links(tree){return nodes(tree).filter(x=>x.type==='a'&&typeof x.props.href==='string').map(x=>x.props.href)}
function textOf(tree){return JSON.stringify(tree,(_,x)=>typeof x==='bigint'?x.toString():x)}
function retryButton(t){return nodes(t).find(x=>x.type==='button'&&/Check transaction status|Retry confirmation check/.test(textOf(x)))}
function submitButton(t){return nodes(t).find(x=>x.type==='button'&&x.props.type==='submit')}
function record(name,actual,expected=true,details={}){results.push({name,actual,expected,pass:actual===expected,...details})}
const originalNow=Date.now;Date.now=()=>new Date('2026-10-29T08:00:00').getTime();
try{
 // Preserved assertions
 reset();submit();render();
 record('Pending link is outside form and submit is disabled',(()=>{receipt={isLoading:true,isSuccess:false};const t=render(),form=nodes(t).find(x=>x.type==='form');return links(t).includes(HASH_A)&&!links(form).includes(HASH_A)&&submitButton(t).props.disabled===true&&retryButton(t).props.type==='button'})());
 reset();submit();render();
 receipt={isLoading:false,isSuccess:false,isError:true,error:new Error('RPC unavailable')};const t1=render();retryButton(t1).props.onClick();
 record('Receipt error shows message, keeps submit disabled, retry calls refetch only',textOf(t1).includes('RPC unavailable')&&submitButton(t1).props.disabled===true&&retries===1&&writes.length===1);
 reset();submit();states[0]='edited';receipt={isError:true,isLoading:false,error:new Error('t')};nextReceipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:[log()]}};retryButton(render()).props.onClick();const t2=render();
 record('Retry valid receipt keeps original snapshot and one write',success(t2)&&links(t2).includes(HASH_B)&&writes.length===1&&retries===1);
 reset();submit();receipt={isError:true,isLoading:false};nextReceipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:[log({target:2n*10n**18n})]}};retryButton(render()).props.onClick();const t3=render();
 record('Retry different target remains unmatched with mined link',!success(t3)&&links(t3).includes(HASH_B)&&writes.length===1);
 reset();submit();receipt={isError:true,isLoading:false};nextReceipt={isLoading:true,isSuccess:false,data:undefined};retryButton(render()).props.onClick();const t4=render();
 record('Retry unindexed pending receipt stays unknown and locked',!success(t4)&&submitButton(t4).props.disabled===true&&links(t4).includes(HASH_A)&&writes.length===1);
 reset();submit();refs[0].current=null;receipt={isError:true,isLoading:false};nextReceipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:[log()]}};retryButton(render()).props.onClick();
 record('Retry missing snapshot does not accept matching event',!success(render())&&writes.length===1);
 reset();submit();receipt={isError:true,isLoading:false};submit();
 record('Submit handler itself blocks repeat submission during receipt error',writes.length,1,{writes:writes.length});
 // Bounded-timeout/unknown assertion (replaces independent-pending-read diagnostic;
 // accepted design is finite-timeout → unknown → retry, not new-waiter creation)
 record('Production waiter has finite timeout',Number.isFinite(waitArgs?.timeout)&&waitArgs?.timeout>0,true,{actualTimeout:waitArgs?.timeout});
 // Offline/paused assertions preserved
 const {onlineManager}=load('@tanstack/query-core');
 reset();submit();render();
 receipt={isLoading:false,isSuccess:false,fetchStatus:'paused',isError:false};
 const pausedTree=render();const pausedDetails={status:receipt.status,fetchStatus:receipt.fetchStatus,isLoading:receipt.isLoading,isError:receipt.isError,disabled:submitButton(pausedTree).props.disabled,hasExplorer:links(pausedTree).includes(HASH_A)};
 record('Real offline-paused receipt retains link and submit lock',pausedDetails.disabled===true&&pausedDetails.hasExplorer,true,pausedDetails);
 if(!submitButton(pausedTree).props.disabled)submit();
 record('Real offline-paused user submit cannot create second write',writes.length,1,{writes:writes.length});
}finally{Date.now=originalNow}
const result={scope:'Unchanged production Create with CWR6 mocks; persistent controlled hooks; real viem logs. Independent-pending-read diagnostic replaced with bounded-timeout assertion per accepted CWR2 design.',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(result.failed&&!process.exitCode)process.exitCode=1;
