'use strict';
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=path.resolve(process.argv[2]||'.');
const output=path.resolve(process.argv[3]||'pf1-transition-new-results.json');
const load=createRequire(path.join(root,'package.json'));
const {QueryClient,QueryObserver}=load('@tanstack/react-query');
process.argv[2]=root;process.argv[3]=output;
const {makePage}=require(path.join(root,'docs/evidence/recheck-41c68bd/page-harness.cjs'));
const samplePool=['0x1111111111111111111111111111111111111111','0x1111111111111111111111111111111111111111',10n**18n,BigInt(Math.floor(Date.now()/1000)+86400),'Fixture','Review',0n,0n,false];
const results=[];
function record(name,expected,actual,query){results.push({name,expected,actual,pass:expected===actual,count:{data:String(query.data),status:query.status,fetchStatus:query.fetchStatus,isStale:query.isStale,isError:query.isError}});}
function assertPages(label,pool,count,expected){for(const page of ['Pool','Proof'])record(page+': '+label,expected,makePage(page,{reads:{getPool:pool,poolCount:count,getStatus:{data:0}}}).kind(),count);}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};}
(async()=>{
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
 client.setQueryData(['count'],0n,{updatedAt:Date.now()-60000});
 let next=deferred();
 const observer=new QueryObserver(client,{queryKey:['count'],queryFn:()=>next.promise,staleTime:0});
 const stop=observer.subscribe(()=>{});
 const pending={isLoading:true,isError:false,fetchStatus:'fetching'};
 const failed={isLoading:false,isError:true,error:new Error('transport'),fetchStatus:'idle'};
 const loaded={data:samplePool,isLoading:false,isError:false,fetchStatus:'idle'};
 assertPages('cached zero refetch begins, pool pending',pending,observer.getCurrentResult(),'loading');
 assertPages('cached zero refetch begins, pool error',failed,observer.getCurrentResult(),'network');
 next.resolve(1n);await observer.refetch();
 assertPages('refetch completes at one, pool still pending',pending,observer.getCurrentResult(),'loading');
 assertPages('refetch completes at one, pool loads',loaded,observer.getCurrentResult(),'content');
 next=deferred();let refetch=observer.refetch();
 assertPages('second poll in flight, loaded content remains',loaded,observer.getCurrentResult(),'content');
 next.reject(new Error('count transport'));await refetch;
 assertPages('poll fails retaining data, content remains',loaded,observer.getCurrentResult(),'content');
 assertPages('poll fails retaining data, pool error',failed,observer.getCurrentResult(),'network');
 // Separate fixtures for absence/contradictory pool data; do not model a decreasing on-chain count.
 const emptyClient=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
 const emptyRead=deferred();
 const emptyObserver=new QueryObserver(emptyClient,{queryKey:['count'],queryFn:()=>emptyRead.promise,staleTime:0});
 const stopEmpty=emptyObserver.subscribe(()=>{});emptyRead.resolve(0n);await emptyObserver.refetch();
 assertPages('completed lower count, no successful pool',failed,emptyObserver.getCurrentResult(),'not-found');
 assertPages('completed lower count cannot override successful pool',loaded,emptyObserver.getCurrentResult(),'content');
 stopEmpty();emptyClient.clear();
 stop();client.clear();
 const payload={scope:'Installed TanStack QueryObserver transitions supplied to unchanged production page functions through synthetic React/wagmi hooks; no mounted DOM or wallet',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,total:results.length,results};
 fs.writeFileSync(output,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({passed:payload.passed,failed:payload.failed,total:payload.total}));process.exitCode=payload.failed?1:0;
})().catch(e=>{console.error(e);process.exitCode=2});
