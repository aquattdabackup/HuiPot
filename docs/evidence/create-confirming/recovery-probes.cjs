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
let states,index,writes,switches,connected,chain,receipt,errors,account,refs,refIndex,waitArgs;
const HASH_A='0x'+'a'.repeat(64),HASH_B='0x'+'b'.repeat(64);
const noop=()=>{};
const mocks={react:{...React,useState:()=>{const i=index++;return [states[i],x=>{if(i===7)errors=x}]},useRef:initial=>{const i=refIndex++;return refs[i]??(refs[i]={current:initial})}},'react-router-dom':{Link:'a'},wagmi:{useAccount:()=>({address:account,chainId:chain,isConnected:connected}),useSwitchChain:()=>({switchChain:x=>switches.push(x)}),useWriteContract:()=>({writeContract:x=>writes.push(x),data:HASH_A,isPending:false,isError:false}),useWaitForTransactionReceipt:args=>{waitArgs=args;return receipt}},connectkit:{ConnectKitButton:{Custom:()=>null}},'lucide-react':new Proxy({},{get:()=>()=>null}),'../contract':{HUIPOT_ADDRESS:contract,HUIPOT_ABI:abi,DEPLOYMENT_CONFIGURED:true},'../config':{...money,TARGET_CHAIN_ID:5042002,explorerTxUrl:x=>x},'../lib/utils':{formatDeadline:()=>'',parseOnchainError:()=>''},'../components/CommitmentNotice':{CommitmentNotice:()=>null}};
const mod={exports:{}};new Function('require','module','exports',js(read('src/pages/Create.tsx')))(n=>mocks[n]??load(n),mod,mod.exports);
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
function reset(){states=[' test ',' 1 ','1',wallet,'2026-10-29','12:00',true,{}];index=0;refIndex=0;refs=[];account=wallet;waitArgs=null;writes=[];switches=[];errors={};connected=true;chain=5042002;receipt={isLoading:false,isSuccess:false}}
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
try{
 test('Pending receipt exposes read-only recovery or explorer link',()=>{submit();receipt={isLoading:true,isSuccess:false};const t=render();return {expected:true,actual:links(t).includes(HASH_A)||/retry|check.*status/i.test(textOf(t))}});
 test('Receipt RPC failure is shown rather than silently re-enabling create',()=>{submit();receipt={isLoading:false,isSuccess:false,isError:true,error:new Error('RPC receipt lookup failed')};const t=render();const button=nodes(t).find(x=>x.type==='button'&&x.props.type==='submit');return {expected:true,actual:textOf(t).includes('RPC receipt lookup failed')||button?.props.disabled===true}});
 test('Confirmed receipt still shows correct success',()=>{submit();return {expected:true,actual:success(confirm())}});
}finally{Date.now=originalNow}
const result={scope:'Unchanged production Create component; persistent mocked refs across submit/receipt renders; real viem logs. No DOM, wallet, RPC or copied predicate.',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
