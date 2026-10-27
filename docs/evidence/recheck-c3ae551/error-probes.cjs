// Independent review harness: execute unchanged component callbacks/effects and validator.
// Synthetic hook state and RPC timing; not a browser, React renderer, wallet or production test.
const fs = require('fs'), path = require('path'), { createRequire } = require('module');
const root = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
const load = createRequire(path.join(root, 'package.json'));
const ts = load('typescript'), React = load('react'), viem = load('viem');
const source = fs.readFileSync(path.join(root, 'src/pages/Pool.tsx'), 'utf8');
const lifecycleSource = fs.readFileSync(path.join(root, 'src/lib/actionLifecycle.ts'), 'utf8');
const lib = fs.readFileSync(path.join(root, 'src/lib/validateReceipt.ts'), 'utf8');
const transpile = s => ts.transpileModule(s, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const contract = '0x81a139599d252eb2dc2bbb6c267e911a21264288', wallet = '0x2222222222222222222222222222222222222222', recipient = '0x1111111111111111111111111111111111111111';
const original = '0x' + 'a'.repeat(64), mined = '0x' + 'b'.repeat(64), target = 10n ** 18n, amount = 4n * 10n ** 17n;
const actions = ['contribute', 'payout', 'refund'];
const snap = action => ({ action, amount: action === 'payout' ? target : amount, recipient: action === 'payout' ? recipient : action === 'refund' ? wallet : contract, poolId: '1', contractAddress: contract, accountAddress: wallet });
const word = n => '0x' + n.toString(16).padStart(64, '0'), addr = a => '0x' + a.slice(2).padStart(64, '0');
const sigs = { contribute: 'Contributed(uint256,address,uint256,uint256)', payout: 'PaidOut(uint256,address,address,uint256)', refund: 'Refunded(uint256,address,uint256)' };
const rpc = (action, hash) => ({ result: { status: '0x1', to: contract, transactionHash: hash, logs: [{ address: contract, topics: [viem.toEventSelector(sigs[action]), word(1n), addr(wallet), ...(action === 'payout' ? [addr(recipient)] : [])], data: word(snap(action).amount) + (action === 'contribute' ? word(amount).slice(2) : '') }] } });
const tick = () => new Promise(resolve => setImmediate(resolve));
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const nodes = t => !t || typeof t !== 'object' ? [] : Array.isArray(t) ? t.flatMap(nodes) : typeof t.type === 'function' && t.type.name === 'ReceiptBanner' ? nodes(t.type(t.props)) : [t, ...nodes(t.props?.children)];
const text = t => t == null ? '' : Array.isArray(t) ? t.map(text).join('') : typeof t === 'object' ? text(t.props?.children) : String(t);
function harness(action) {
  const noop = () => {};
  const h = { states: ['', '', null, {}], refs: [], effects: [], callbacks: [], pendingEffects: [], pendingRpc: [], success: [], writes: [], options: [], wait: actions.map(() => ({ isLoading: false, isSuccess: false, isError: false })), write: actions.map(() => ({ data: undefined })) };
  const fakeReact = { ...React,
    useState(initial) { const i = h.si++; if (!(i in h.states)) h.states[i] = initial; return [h.states[i], v => { h.states[i] = typeof v === 'function' ? v(h.states[i]) : v; }]; },
    useRef(initial) { const i = h.ri++; return h.refs[i] ??= { current: initial }; },
    useEffect(fn, deps) { const i = h.ei++, old = h.effects[i]; if (!old || !same(old.deps, deps)) h.pendingEffects.push(() => { old?.cleanup?.(); h.effects[i] = { deps, cleanup: fn() }; }); },
    useMemo(factory, deps) { const i = h.ci++, old = h.callbacks[i]; if (!old || !same(old.deps, deps)) h.callbacks[i] = { deps, fn: factory() }; return h.callbacks[i].fn; },
    useCallback(fn, deps) { const i = h.ci++, old = h.callbacks[i]; if (!old || !same(old.deps, deps)) h.callbacks[i] = { deps, fn }; return h.callbacks[i].fn; },
  };
  const fetch = async (_url, init) => new Promise(resolve => h.pendingRpc.push({ hash: JSON.parse(init.body).params[0], resolve }));
  const lm = { exports: {} }; new Function('fetch', 'exports', transpile(lib))(fetch, lm.exports);
  const lifecycleModule = { exports: {} }; new Function('require', 'exports', transpile(lifecycleSource))(n => n === './validateReceipt' ? lm.exports : load(n), lifecycleModule.exports);
  const mocks = { react: fakeReact, '../lib/actionLifecycle': lifecycleModule.exports, '../lib/validateReceipt': lm.exports,
    'react-router-dom': { useParams: () => ({ poolId: '1' }), useNavigate: () => noop, Link: () => null },
    wagmi: { useSwitchChain: () => ({ switchChain: noop }), useWriteContract: () => { const i = h.wi++; return { ...h.write[i], writeContract: x => h.writes.push(x), reset: noop }; }, useWaitForTransactionReceipt: opts => { const i = h.qi++; h.options[i] = opts; return h.wait[i]; } },
    connectkit: { ConnectKitButton: () => null }, 'lucide-react': new Proxy({}, { get: () => () => null }),
    '../contract': { HUIPOT_ADDRESS: contract, HUIPOT_ABI: [], DEPLOYMENT_CONFIGURED: true },
    '../config': { TARGET_CHAIN_ID: 5042002, arcTestnet: { rpcUrls: { default: { http: ['fixture://no-network'] } } }, formatNativeAmount: String, explorerTxUrl: hash => 'fixture://explorer/' + hash, parseProductAmount: () => amount },
    '../components/CommitmentNotice': { CommitmentNotice: () => null },
    '../lib/utils': { STATUS: { ACTIVE: 0, FUNDED: 1, PAID: 2, REFUNDING: 3, CLOSED: 4 }, parseOnchainError: String }, '../lib/share': { buildShareLink: async () => '' },
  };
  const mod = { exports: {} }; new Function('require', 'module', 'exports', transpile(source) + '\nexports.ActionPanel=ActionPanel;')(n => n in mocks ? mocks[n] : load(n), mod, mod.exports);
  h.props = { poolId: '1', poolIdBig: 1n, status: { contribute: 0, payout: 1, refund: 3 }[action], target, remaining: target, recipient, myContribution: amount, myClaimable: amount, myClaimableLoading: false, myClaimableError: false, isConnected: true, currentChainId: 5042002, accountAddress: wallet, rpcUrl: 'fixture://no-network', onSuccess: (hash, a) => h.success.push({ hash, action: a }) };
  h.render = () => { h.si = h.ri = h.ei = h.ci = h.wi = h.qi = 0; h.tree = mod.exports.ActionPanel(h.props); return h.tree; };
  h.flush = () => { const q = h.pendingEffects.splice(0); q.forEach(fn => fn()); };
  h.complete = async (ok = true) => { const p = h.pendingRpc.shift(); if (!p) throw Error('No RPC in flight'); p.resolve({ ok, status: ok ? 200 : 500, json: async () => rpc(action, p.hash) }); await tick(); };
  h.replace = reason => h.options[actions.indexOf(action)].onReplaced({ reason, replacedTransaction: { hash: original }, transaction: { hash: mined } });
  h.succeed = () => { h.wait[actions.indexOf(action)] = { isLoading: false, isSuccess: true, isError: false, data: { transactionHash: mined } }; h.render(); h.flush(); };
  h.phase = () => h.states[3][action]?.phase ?? 'idle';
  h.unmount = () => h.effects.forEach(e => e?.cleanup?.());
  h.render(); h.flush();
  h.states[2] = snap(action);
  nodes(h.render()).find(n => n.type === 'button' && text(n).trim() === 'Confirm in wallet').props.onClick();
  h.write[actions.indexOf(action)].data = original;
  h.render(); h.flush();
  return h;
}

const results = [];
async function run() {
  for (const action of actions) {
    const i = actions.indexOf(action);
    const h = harness(action);
    h.states[2] = snap(action);
    nodes(h.render()).find(n => n.type === 'button' && text(n).trim() === 'Confirm in wallet').props.onClick();
    const before = h.phase();
    // A was registered under submission 1; a new submission exists, but its hash is not available yet.
    // Deliver a late wait-hook error for A, with unchanged A hash (registration effect does not rerun).
    h.wait[i] = { isLoading: false, isSuccess: false, isError: true, error: new Error('old transaction RPC error') };
    h.render(); h.flush();
    const after = h.phase();
    const retry = nodes(h.render()).find(n => n.type === 'button' && text(n).trim() === 'Retry');
    if (retry) retry.props.onClick();
    results.push({ name: action + ': obsolete wait error leaves current phase unchanged', pass: after === before, before, after, displayedHash: h.states[3][action]?.txHash, retryPresent: !!retry, retryRpcCalls: h.pendingRpc.length });
  }
  for (const action of actions) {
    const i = actions.indexOf(action), h = harness(action);
    h.wait[i] = { isLoading: false, isSuccess: false, isError: true, error: new Error('current transaction RPC error') };
    h.render(); h.flush();
    const errorShown = h.phase() === 'error';
    const retry = nodes(h.render()).find(n => n.type === 'button' && text(n).trim() === 'Retry');
    if (retry) retry.props.onClick();
    if (h.pendingRpc.length) await h.complete();
    results.push({ name: action + ': current wait error remains retryable', pass: errorShown && h.phase() === 'confirmed' && h.success.length === 1, phase: h.phase(), successCalls: h.success.length });
  }
  const summary = { sourceRevision: 'c3ae551f1ca541de415b75e4d2718b5b3cc73781', scope: 'Additional late-error component probes with synthetic hooks/RPC; not browser/mempool evidence', passed: results.filter(r=>r.pass).length, failed: results.filter(r=>!r.pass).length, results };
  fs.writeFileSync(output, JSON.stringify(summary,null,2)); console.log(JSON.stringify(summary,null,2)); process.exitCode=summary.failed?1:0;
}
run().catch(e=>{console.error(e);process.exitCode=2});
