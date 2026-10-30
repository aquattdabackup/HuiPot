// Adapted from docs/evidence/recheck-00252d0/production-adapted.cjs
// CWR6: adds usePublicClient and useEffect mocks required after CWR6 source changes.
// All 23 CS1/CS2/CSF assertions preserved unchanged; no predicate was weakened.
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
let hashValue;
let states,index,writes,connected,chain,receipt,errors,account,refs,refIndex,waitArgs;
const HASH_A='0x'+'a'.repeat(64),HASH_B='0x'+'b'.repeat(64);
const noop=()=>{};
// CWR6: usePublicClient returns a no-op client (revert check never resolves in these sync tests)
const mocks={react:{...React,useState:()=>{const i=index++;return [states[i],x=>{if(i===7)errors=x}]},useRef:initial=>{const i=refIndex++;return refs[i]??(refs[i]={current:initial})},useEffect:()=>{}},'react-router-dom':{Link:'a'},wagmi:{useAccount:()=>({address:account,chainId:chain,isConnected:connected}),useSwitchChain:()=>({switchChain:()=>{}}),useWriteContract:()=>({writeContract:x=>{writes.push(x);hashValue=HASH_A},data:hashValue,isPending:false,isError:false}),useWaitForTransactionReceipt:args=>{waitArgs=args;return receipt},usePublicClient:()=>({getTransactionReceipt:()=>Promise.reject(new Error('no-op in sync test'))})},connectkit:{ConnectKitButton:{Custom:()=>null}},'lucide-react':new Proxy({},{get:()=>()=>null}),'../contract':{HUIPOT_ADDRESS:contract,HUIPOT_ABI:abi,DEPLOYMENT_CONFIGURED:true},'../config':{...money,TARGET_CHAIN_ID:5042002,explorerTxUrl:x=>x},'../lib/utils':{formatDeadline:()=>'',parseOnchainError:()=>''},'../components/CommitmentNotice':{CommitmentNotice:()=>null}};
const mod={exports:{}};new Function('require','module','exports',js(read('src/pages/Create.tsx')))(n=>mocks[n]??load(n),mod,mod.exports);
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
function reset(){hashValue=undefined;states=[' test ',' 1 ','1',wallet,'2026-10-29','12:00',true,{}];index=0;refIndex=0;refs=[];account=wallet;waitArgs=null;writes=[];errors={};connected=true;chain=5042002;receipt={isLoading:false,isSuccess:false}}
const results=[];
function render(){index=0;refIndex=0;return mod.exports.Create()}
function submit(){const t=render();nodes(t).find(x=>x.type==='form').props.onSubmit({preventDefault:noop});return t}
function log(opts={}){const values={poolId:1n,creator:wallet,recipient:wallet,target:10n**18n,deadline:BigInt(new Date('2026-10-29T12:00:00').getTime()/1000),title:'test',purpose:'1',address:contract,...opts};return {address:values.address,topics:v.encodeEventTopics({abi,eventName:'PoolCreated',args:values}),data:v.encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'string'},{type:'string'}],[values.target,values.deadline,values.title,values.purpose])}}
function confirm(opts={},logs){receipt={isSuccess:true,data:{status:'success',transactionHash:HASH_B,logs:logs??[log(opts)]}};return render()}
function success(tree){return nodes(tree).some(x=>x.type==='h1'&&x.props.children==='Pool created')}
function links(tree){return nodes(tree).filter(x=>x.type==='a'&&typeof x.props.href==='string').map(x=>x.props.href)}
function test(name,fn){reset();try{const r=fn();results.push({name,...r,pass:r.actual===r.expected})}catch(e){results.push({name,pass:false,error:String(e)})}}
const originalNow=Date.now;Date.now=()=>new Date('2026-10-29T08:00:00').getTime();
try{
 test('CS1 valid submission captures every trimmed snapshot field',()=>{submit();const s=refs[0].current;return {expected:true,actual:writes.length===1&&s.account===wallet&&s.chainId===5042002&&s.contractAddress===contract&&s.recipient===wallet&&s.targetNative===10n**18n&&s.deadlineUnix===new Date('2026-10-29T12:00:00').getTime()/1000&&s.title==='test'&&s.purpose==='1'&&writes[0].value===undefined}});
 for(const [name,val,msg] of [['zero','0x'+'0'.repeat(40),'Recipient cannot be the zero address.'],['self',contract,'Recipient cannot be this contract.'],['malformed','0xBAD','Enter a valid 0x Ethereum address.']])test('CS1 '+name+' blocks write with expected error',()=>{states[3]=val;submit();return {expected:true,actual:writes.length===0&&errors.recipient===msg}});
 test('Disconnected blocks submission',()=>{connected=false;submit();return {expected:0,actual:writes.length}});
 test('Wrong chain blocks submission',()=>{chain=1;submit();return {expected:0,actual:writes.length}});
 test('Missing acknowledgement blocks submission',()=>{states[6]=false;submit();return {expected:0,actual:writes.length}});
 test('CS2 valid matching receipt succeeds after actual submit',()=>{submit();return {expected:true,actual:success(confirm())}});
 for(const [field,value] of [['target',2n*10n**18n],['deadline',1n],['title','other'],['purpose','other'],['creator','0x'+'2'.repeat(40)],['recipient','0x'+'2'.repeat(40)],['address','0x'+'2'.repeat(40)]])test('CS2 different '+field+' rejected with full actual snapshot',()=>{submit();return {expected:false,actual:success(confirm({[field]:value}))}});
 test('CS2 original receipt still matches after form edits',()=>{submit();states[0]='changed';states[1]='changed';states[2]='7';states[3]='0x'+'2'.repeat(40);return {expected:true,actual:success(confirm())}});
 test('CS2 account switch does not rebind original receipt',()=>{submit();account='0x'+'2'.repeat(40);return {expected:true,actual:success(confirm())}});
 test('CS2 missing snapshot must reject foreign creator and different terms',()=>{return {expected:false,actual:success(confirm({creator:'0x'+'2'.repeat(40),target:2n*10n**18n,title:'other'}))}});
 test('CS2 empty snapshot account must not skip creator check',()=>{submit();refs[0].current.account='';return {expected:false,actual:success(confirm({creator:'0x'+'2'.repeat(40)}))}});
 test('CS2 cancellation without event does not confirm pool',()=>{submit();return {expected:false,actual:success(confirm({},[]))}});
 test('CS2 success explorer link uses mined replacement hash',()=>{submit();return {expected:HASH_B,actual:links(confirm())[0]}});
 test('CS2 cancellation explorer link uses mined replacement hash',()=>{submit();return {expected:HASH_B,actual:links(confirm({},[]))[0]}});
 test('CS2 receipt watcher remains pinned to submitted chain after switch',()=>{submit();chain=1;render();return {expected:5042002,actual:waitArgs.chainId??null}});
}finally{Date.now=originalNow}
const result={scope:'Unchanged production Create component with CWR6 mocks (usePublicClient/useEffect); persistent mocked refs across submit/receipt renders; real viem logs. No DOM, wallet, RPC or copied predicate.',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(result.failed&&!process.exitCode)process.exitCode=1;
