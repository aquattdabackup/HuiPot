// Independent review instrument; unchanged production Create component, controlled hooks.
// Not mounted browser or real wallet coverage.
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=process.cwd(),load=createRequire(path.join(root,'.review/recheck-53c8190/snapshot/package.json'));
const ts=load('typescript'),React=load('react'),v=load('viem');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const js=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const c=read('src/config.ts');
const money=new Function('PRODUCT_DECIMALS','QUANTUM','UINT256_MAX',js(c.slice(c.indexOf('export function parseProductAmount'),c.indexOf('export function explorerTxUrl')).replaceAll('export function','function'))+';return {parseProductAmount,formatNativeAmount}')(6,10n**12n,(1n<<256n)-1n);
const a=read('src/contract.ts');
const abi=new Function(js(a.slice(a.indexOf('export const HUIPOT_ABI')).replace('export const','const'))+';return HUIPOT_ABI')();
const contract='0x81a139599d252eb2dc2bbb6c267e911a21264288',wallet='0x1111111111111111111111111111111111111111';
let states,index,writes,switches,connected,chain,receipt,errors;
const noop=()=>{};
const mocks={react:{...React,useState:()=>{const i=index++;return [states[i],x=>{if(i===7)errors=x}]},useRef:()=>({current:{account:wallet,chainId:5042002}})},'react-router-dom':{Link:'a'},wagmi:{useAccount:()=>({address:wallet,chainId:chain,isConnected:connected}),useSwitchChain:()=>({switchChain:x=>switches.push(x)}),useWriteContract:()=>({writeContract:x=>writes.push(x),isPending:false,isError:false}),useWaitForTransactionReceipt:()=>receipt},connectkit:{ConnectKitButton:{Custom:()=>null}},'lucide-react':new Proxy({},{get:()=>()=>null}),'../contract':{HUIPOT_ADDRESS:contract,HUIPOT_ABI:abi,DEPLOYMENT_CONFIGURED:true},'../config':{...money,TARGET_CHAIN_ID:5042002,explorerTxUrl:x=>x},'../lib/utils':{formatDeadline:()=>'',parseOnchainError:()=>''},'../components/CommitmentNotice':{CommitmentNotice:()=>null}};
const mod={exports:{}};new Function('require','module','exports',js(read('src/pages/Create.tsx')))(n=>mocks[n]??load(n),mod,mod.exports);
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
function reset(){states=['test','1','1',wallet,'2026-10-29','12:00',true,{}];index=0;writes=[];switches=[];errors={};connected=true;chain=5042002;receipt={isLoading:false,isSuccess:false}}
const results=[];
function check(name,setup,assert){reset();setup();const tree=mod.exports.Create();const f=nodes(tree).find(x=>x.type==='form');if(f)f.props.onSubmit({preventDefault:noop});results.push({name,pass:assert(tree),writes:writes.length,errors})}
const old=Date.now;Date.now=()=>Date.parse('2026-10-29T00:00:00Z');
try{
 check('Valid production submit: exact target, chain, 1-USDC goal and no deposit',noop,()=>writes.length===1&&writes[0].address===contract&&writes[0].chainId===5042002&&writes[0].args[1]===10n**18n&&writes[0].value===undefined&&writes[0].functionName==='createPool');
 check('Disconnected blocks write',()=>{connected=false},()=>writes.length===0);
 check('Wrong chain requests switch without write',()=>{chain=1},()=>writes.length===0&&switches.length===1);
 check('Missing acknowledgement blocks write',()=>{states[6]=false},()=>writes.length===0);
 check('Expired deadline blocks write',()=>{states[4]='2026-10-28'},()=>writes.length===0);
 check('Contract recipient blocks write',()=>{states[3]=contract},()=>writes.length===0);
 check('Zero recipient should be rejected before wallet request',()=>{states[3]='0x'+'0'.repeat(40)},()=>writes.length===0);
 check('Different target in receipt must not confirm original request',()=>{const topics=v.encodeEventTopics({abi,eventName:'PoolCreated',args:{poolId:1n,creator:wallet,recipient:wallet}});const data=v.encodeAbiParameters([{type:'uint256'},{type:'uint256'},{type:'string'},{type:'string'}],[2n*10n**18n,1793250000n,'test','1']);receipt={isSuccess:true,data:{logs:[{address:contract,topics,data}]}}},tree=>!JSON.stringify(tree,(_,x)=>typeof x==='bigint'?x.toString():x).includes('Pool created'));
}finally{Date.now=old}
const result={scope:'Production component executed with controlled hooks; no DOM/wallet; expected acceptance assertions, not Studio regression suite',passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
fs.writeFileSync('.review/metamask-alert/create-path-probes.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
