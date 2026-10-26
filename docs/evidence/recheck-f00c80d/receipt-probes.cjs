// Codex review instrument: unchanged production code, synthetic hooks/receipts, no network or signing.
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]);const load=createRequire(path.join(root,'package.json'));
const ts=load('typescript'),React=load('react'),v=load('viem');const src=fs.readFileSync(path.join(root,'src/pages/Pool.tsx'),'utf8');
const transpile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const contract='0x81a139599d252eb2dc2bbb6c267e911a21264288',wallet='0x2222222222222222222222222222222222222222',recipient='0x1111111111111111111111111111111111111111',other='0x3333333333333333333333333333333333333333',hash='0x'+'a'.repeat(64),target=10n**18n,amount=4n*10n**17n;
const names={contribute:'CONTRIBUTED_TOPIC',payout:'PAID_OUT_TOPIC',refund:'REFUNDED_TOPIC'},sigs={contribute:'Contributed(uint256,address,uint256,uint256)',payout:'PaidOut(uint256,address,address,uint256)',refund:'Refunded(uint256,address,uint256)'};
const libsrc=fs.readFileSync(path.join(root,'src/lib/validateReceipt.ts'),'utf8');
const topic=Object.fromEntries(Object.entries(names).map(([a,n])=>[a,libsrc.match(new RegExp('const '+n+"\\s*=\\s*'([^']+)'"))[1]]));
const word=n=>'0x'+n.toString(16).padStart(64,'0'),addr=a=>'0x'+a.slice(2).padStart(64,'0');
const snap=a=>({action:a,amount:a==='payout'?target:amount,recipient:a==='payout'?recipient:a==='refund'?wallet:contract,poolId:'1',contractAddress:contract,accountAddress:wallet});
const log=(a,actor=wallet,n=a==='payout'?target:amount)=>({address:contract,topics:[v.toEventSelector(sigs[a]),word(1n),addr(actor),...(a==='payout'?[addr(recipient)]:[])],data:word(n)+(a==='contribute'?word(n).slice(2):'')});
const receipt=(logs,status='0x1',to=contract)=>({status,to,transactionHash:hash,logs});
const loadValidator=fetch=>{const mod={exports:{}};new Function('fetch','exports',transpile(libsrc))(fetch,mod.exports);return mod.exports.validateReceipt};
const cases=[
 ...['contribute','payout','refund'].map(a=>['valid '+a,a,receipt([log(a)]),'confirmed']),
 ['contribution wrong contributor','contribute',receipt([log('contribute',other)]),'replaced'],
 ['payout wrong submitting caller','payout',receipt([log('payout',other)]),'replaced'],
 ['refund wrong contributor','refund',receipt([log('refund',other)]),'replaced'],
 ['contribution wrong amount','contribute',receipt([log('contribute',wallet,1n)]),'replaced'],
 ['different target','contribute',receipt([log('contribute')],'0x1',other),'replaced'],
 ['no action event','contribute',receipt([]),'replaced'],
 ['reverted receipt','contribute',receipt([],'0x0'),'error'],
 ['missing receipt','contribute',null,'error'],
 ['RPC failure','contribute','throw','error'],
 ['HTTP 500 with receipt-shaped body','contribute',receipt([log('contribute')]),'error',false],
 ['JSON-RPC error with receipt-shaped result','contribute',receipt([log('contribute')]),'error',true,true],
];
const results=[];
async function run(){
 for(const [name,action,data,expected,ok=true,rpcError=false] of cases){
  const fetch=async()=>{if(data==='throw')throw Error('fixture network failure');return {ok,status:ok?200:500,json:async()=>({result:data,...(rpcError?{error:{code:-32000,message:"fixture RPC error"}}:{})})}};
  const validate=loadValidator(fetch);
  const actual=await validate(hash,snap(action),'fixture://no-network');results.push({name,expected,actual:actual.outcome,pass:actual.outcome===expected,note:actual.note});
 }
 let states=[],stateIndex=0,writes=[],refs=[],refIndex=0;const noop=()=>{};
 const fakeReact={...React,useState:()=>[states[stateIndex++],noop],useEffect:noop,useRef:x=>({current:refs[refIndex++] ?? x}),useCallback:f=>f};
 const mocks={'../lib/validateReceipt':{validateReceipt:loadValidator(()=>{throw Error('Unexpected fetch in render-only probe')})},react:fakeReact,'react-router-dom':{useParams:()=>({poolId:'1'}),useNavigate:()=>noop,Link:()=>null},wagmi:{useSwitchChain:()=>({switchChain:noop}),useWriteContract:()=>({writeContract:x=>writes.push(x),reset:noop}),useWaitForTransactionReceipt:()=>({isLoading:false,isSuccess:false})},connectkit:{ConnectKitButton:()=>null},'lucide-react':new Proxy({},{get:()=>()=>null}),'../contract':{HUIPOT_ADDRESS:contract,HUIPOT_ABI:[],DEPLOYMENT_CONFIGURED:true},'../config':{TARGET_CHAIN_ID:5042002,arcTestnet:{rpcUrls:{default:{http:['fixture://no-network']}}},formatNativeAmount:String,explorerTxUrl:h=>'fixture://explorer/'+h,parseProductAmount:()=>amount},'../components/CommitmentNotice':{CommitmentNotice:()=>null},'../lib/utils':{STATUS:{ACTIVE:0,FUNDED:1,PAID:2,REFUNDING:3,CLOSED:4}},'../lib/share':{buildShareLink:async()=>''}};
 const mod={exports:{}};new Function('require','module','exports',transpile(src)+'\nexports.ActionPanel=ActionPanel;')(n=>n in mocks?mocks[n]:load(n),mod,mod.exports);
 const panel={poolId:'1',poolIdBig:1n,status:1,target,remaining:0n,recipient,myContribution:amount,myClaimable:amount,myClaimableLoading:false,myClaimableError:false,isConnected:true,currentChainId:5042002,accountAddress:wallet,rpcUrl:'fixture://no-network',onSuccess:noop};
 const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
 const text=t=>t==null?'':Array.isArray(t)?t.map(text).join(''):typeof t==='object'?text(t.props?.children):String(t);
 function render(review,validation,props={},confirmed=null){states=['','',review,validation];stateIndex=0;refIndex=0;refs=[confirmed,null,0,new Set(),null,null];writes=[];return mod.exports.ActionPanel({...panel,...props})}
 for(const [name,validation] of [['payout initially enabled',{}],['payout enabled after final contribution confirmed',{contribute:{phase:'confirmed',action:'contribute',txHash:hash}}]]){
  const tree=render(null,validation);const button=nodes(tree).find(n=>n.type==='button'&&text(n)==='Review payout');if(!button)throw Error('Payout button absent');const actual=!button.props.disabled;results.push({name,expected:true,actual,pass:actual===true});
 }
 // Execute actual confirmAction handlers with fresh/stale props, including controls.
 for(const [name,action,props,expected] of [
  ['confirm blocks live wrong chain','contribute',{status:0,remaining:target,currentChainId:1},0],
  ['confirm accepts valid contribution','contribute',{status:0,remaining:target},1],
  ['confirm blocks contribution after state change','contribute',{status:1,remaining:target},0],
  ['confirm blocks contribution exceeding capacity','contribute',{status:0,remaining:1n},0],
  ['confirm accepts valid payout','payout',{status:1},1],
  ['confirm blocks payout after state change','payout',{status:2},0],
  ['confirm accepts valid refund','refund',{status:3},1],
  ['confirm blocks refund after state change','refund',{status:4},0],
  ['confirm blocks exhausted refund','refund',{status:3,myClaimable:0n},0],
 ]){
  const tree=render(snap(action),{},props);const button=nodes(tree).find(n=>n.type==='button'&&text(n).trim()==='Confirm in wallet');if(!button)throw Error('Confirm absent');button.props.onClick();results.push({name,expectedWrites:expected,actualWrites:writes.length,pass:writes.length===expected});
 }
 const deep=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(deep):typeof t.type==='function'&&t.type.name==='ReceiptBanner'?deep(t.type(t.props)):[t,...deep(t.props?.children)];
 const confirmed=a=>({phase:'confirmed',action:a,txHash:hash});
 {
  const tree=render(null,{contribute:confirmed('contribute')},{status:0,remaining:target-amount},{action:'contribute',txHash:hash});
  const button=nodes(tree).find(n=>n.type==='button'&&n.props.type==='submit');if(!button)throw Error('Contribute button absent');const actual=!button.props.disabled;results.push({name:'another contribution enabled after a confirmed partial contribution',expected:true,actual,pass:actual});
 }
 for(const [name,action,status,claimable,phases] of [
  ['contribution idle fallback retains hash while ACTIVE','contribute',0,amount,{}],
  ['final contribution retains hash after FUNDED','contribute',1,amount,{contribute:confirmed('contribute')}],
  ['payout retains hash after PAID','payout',2,amount,{payout:confirmed('payout')}],
  ['refund retains hash with zero claimable while REFUNDING','refund',3,0n,{refund:confirmed('refund')}],
  ['refund retains hash after CLOSED','refund',4,0n,{refund:confirmed('refund')}],
 ]){
  const tree=render(null,phases,{status,remaining:target,myClaimable:claimable},{action,txHash:hash});const actual=deep(tree).some(n=>n.type==='a'&&n.props.href?.includes(hash));results.push({name,expected:true,actual,pass:actual});
 }
 const result={sourceRevision:'f00c80da0168afacd136b1c8f0cf44e077952888',scope:'Unchanged validateReceipt and ActionPanel executed with synthetic inputs; no network/browser/wallet',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));process.exitCode=result.failed?1:0;
}
run().catch(e=>{console.error(e);process.exitCode=2});
