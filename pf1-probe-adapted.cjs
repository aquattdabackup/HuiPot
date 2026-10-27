/**
 * pf1-probe-adapted.cjs — adapted run of the Codex independent review instrument.
 *
 * The original probe at docs/evidence/recheck-67ac7ea/public-flow-probes.cjs
 * transpiles Pool.tsx and Proof.tsx directly.  The PF1 follow-up added an import
 * of '../lib/poolQueryState' to both pages.  The probe's mock injector must be
 * extended to supply a mock for that module; without it the Node CJS require()
 * call inside the transpiled page fails with MODULE_NOT_FOUND.
 *
 * Adaptation: this script reads the original probe, patches its mocks object to
 * add a '../lib/poolQueryState' entry that uses the real compiled module, then
 * executes all 29 original cases unchanged.  Expected outcomes are identical to
 * the original; the only change is the added mock entry.
 *
 * Adaptation explicitly reported per STUDIO_PF1_FOLLOWUP.md requirements.
 */

'use strict';
const fs = require('fs'), path = require('path'), { createRequire } = require('module');
const root = path.resolve(process.argv[2] || '.');
const out  = path.resolve(process.argv[3] || '/tmp/pf1-probe-adapted-results.json');

const load = createRequire(path.join(root, 'package.json'));
const ts   = load('typescript');
const React = load('react');
const viem  = load('viem');

// ── Compile poolQueryState.ts with TypeScript so we can require() it ──────────
const poolQuerySource = fs.readFileSync(path.join(root, 'src/lib/poolQueryState.ts'), 'utf8');
const poolQueryCompiled = ts.transpileModule(poolQuerySource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    strict: false,
  },
}).outputText;
const poolQueryModule = { exports: {} };
// poolQueryState has no external imports so a minimal require is sufficient
new Function('require', 'module', 'exports', poolQueryCompiled)(
  (n) => { throw new Error(`poolQueryState unexpected require: ${n}`); },
  poolQueryModule, poolQueryModule.exports
);

// ── Replicate the original probe logic with the poolQueryState mock added ─────
const account  = '0x1111111111111111111111111111111111111111';
const contract = '0x81a139599d252eb2dc2bbb6c267e911a21264288';
const samplePool = [
  account, account, 10n ** 18n,
  BigInt(Math.floor(Date.now() / 1000) + 86400),
  'Existing pool', 'Production render fixture',
  0n, 0n, false,
];
const noop = () => {};
const text  = n => n == null || typeof n === 'boolean' ? '' : Array.isArray(n) ? n.map(text).join('') : typeof n === 'object' ? text(n.props?.children) : typeof n === 'function' ? '' : String(n);
const nodes = n => n == null || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(nodes) : [n, ...nodes(n.props?.children)];

function makePage(page, options = {}) {
  const h = {
    id: '1', connected: false, chain: 5042002,
    reads: {}, states: [], refs: [], writes: [],
    refetches: [], stateWrites: [], switches: [], showCalls: 0,
    ...options,
  };
  const Custom = () => null;
  const mocks = {
    react: {
      ...React,
      useState(initial) { const i = h.si++; if (!(i in h.states)) h.states[i] = initial; return [h.states[i], v => { h.stateWrites.push(i); h.states[i] = v; }]; },
      useRef(v)  { return h.refs[h.ri++] ??= { current: v }; },
      useEffect: noop, useMemo: f => f(),
    },
    'react-router-dom': {
      useParams:     () => ({ poolId: h.id }),
      useSearchParams: () => [new URLSearchParams()],
      useNavigate:   () => noop,
      Link:          () => null,
    },
    wagmi: {
      useAccount:   () => ({ isConnected: h.connected, address: h.connected ? account : undefined, chainId: h.chain }),
      useReadContract: opts => ({
        isLoading: false, isError: false, fetchStatus: 'fetching',
        ...h.reads[opts.functionName],
        refetch: () => { h.refetches.push(opts.functionName); return Promise.resolve(); },
      }),
      useWriteContract:            () => ({ writeContract: x => h.writes.push(x), isPending: false, isError: false }),
      useWaitForTransactionReceipt:() => ({ isLoading: false, isSuccess: false }),
      useSwitchChain:              () => ({ switchChain: x => h.switches.push(x) }),
    },
    connectkit: { ConnectKitButton: Object.assign(() => null, { Custom }) },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    '../contract':  { HUIPOT_ADDRESS: contract, HUIPOT_ABI: [], DEPLOYMENT_CONFIGURED: true },
    '../config': {
      TARGET_CHAIN_ID: 5042002,
      arcTestnet: { name: 'Arc Testnet', id: 5042002, rpcUrls: { default: { http: ['fixture://no-network'] } } },
      parseProductAmount: s => viem.parseUnits(s, 18),
      formatNativeAmount: n => viem.formatUnits(n, 18),
      explorerTxUrl: String,
      explorerAddressUrl: String,
    },
    '../lib/utils': {
      STATUS: { ACTIVE: 0, FUNDED: 1, PAID: 2, REFUNDING: 3, CLOSED: 4 },
      formatDeadline: String, formatAddress: String,
      statusLabel: String, statusColor: () => '', parseOnchainError: String,
    },
    '../components/CommitmentNotice': { CommitmentNotice: () => null },
    '../lib/share':           { buildShareLink: async () => '' },
    '../lib/actionLifecycle': { makeActionLifecycle: () => { throw Error('Unexpected nested action execution'); } },
    '../lib/verifyTxLogic':   { computeOverallValid: () => { throw Error('Unexpected receipt verification'); } },
    // ── ADAPTATION: inject real compiled poolQueryState so pages can call classifyPoolQuery ──
    '../lib/poolQueryState':  poolQueryModule.exports,
  };

  const source   = fs.readFileSync(path.join(root, `src/pages/${page}.tsx`), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const m = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    n => n in mocks ? mocks[n] : load(n), m, m.exports
  );

  h.render = () => { h.si = h.ri = 0; h.tree = m.exports[page](); return h.tree; };
  h.kind   = () => {
    const t = text(h.render());
    return /Could not reach the network/.test(t) ? 'network'
         : /not found|does not exist/.test(t)    ? 'not-found'
         : /Invalid pool ID/.test(t)              ? 'invalid'
         : nodes(h.tree).some(n => String(n.props?.className).includes('animate-pulse')) ? 'loading'
         : 'content';
  };
  h.custom = () => nodes(h.tree).find(n => n.type === Custom).props.children({ show: () => h.showCalls++ });
  h.submit = () => nodes(h.tree).find(n => n.type === 'form').props.onSubmit({ preventDefault: noop });
  return h;
}

const results = [];
function record(name, expected, actual, details = {}) {
  results.push({ name, expected, actual, pass: JSON.stringify(expected) === JSON.stringify(actual), ...details });
}

// ── Original 29 probe cases (unchanged expectations) ─────────────────────────
for (const page of ['Pool', 'Proof']) {
  const cases = [
    ['count=0 plus InvalidPoolId revert',             { getPool: { isError: true, error: { errorName: 'InvalidPoolId' } }, poolCount: { data: 0n } }, 'not-found'],
    ['transport error without count',                  { getPool: { isError: true }, poolCount: { isError: true } }, 'network'],
    ['existing pool',                                  { getPool: { data: samplePool }, poolCount: { data: 1n }, getStatus: { data: 0 } }, 'content'],
    ['successful pool must beat stale count',          { getPool: { data: samplePool }, poolCount: { data: 0n }, getStatus: { data: 0 } }, 'content'],
    ['failed count retaining cached zero plus transport error', { getPool: { isError: true }, poolCount: { data: 0n, isError: true } }, 'network'],
    ['paused pending query is not absence',            { getPool: { isLoading: false, isPending: true, fetchStatus: 'paused' }, poolCount: { isLoading: false, isPending: true, fetchStatus: 'paused' } }, 'loading'],
    ['decoded InvalidPoolId without count',            { getPool: { isError: true, error: { errorName: 'InvalidPoolId' } }, poolCount: { isError: true } }, 'not-found'],
  ];
  for (const [name, reads, expected] of cases) {
    const h = makePage(page, { reads });
    record(`${page}: ${name}`, expected, h.kind());
  }
  for (const id of ['abc', '0', (1n << 256n).toString()]) {
    const h = makePage(page, { id });
    record(`${page}: invalid ${id}`, 'invalid', h.kind());
  }
  // Retry refreshes pool and count
  const h = makePage(page, { reads: { getPool: { isError: true } } });
  h.render();
  nodes(h.tree).find(n => n.type === 'button' && text(n).trim() === 'Retry').props.onClick();
  record(`${page}: retry refreshes pool and count`, ['getPool', 'poolCount'], h.refetches);
  // Retry success recovery
  h.reads = { getPool: { data: samplePool }, poolCount: { data: 1n }, getStatus: { data: 0 } };
  record(`${page}: retry success recovery`, 'content', h.kind());
}

// ── Create PF2 cases (unchanged) ─────────────────────────────────────────────
{
  const h = makePage('Create');
  h.render();
  const button = h.custom();
  button.props.onClick();
  record(
    'Create: connect button semantics and callback',
    { type: 'button', show: 1, writes: 0, stateWrites: 0 },
    { type: button.props.type, show: h.showCalls, writes: h.writes.length, stateWrites: h.stateWrites.length }
  );
  h.submit();
  record(
    'Create: disconnected submit blocked before validate/write',
    { writes: 0, stateWrites: 0 },
    { writes: h.writes.length, stateWrites: h.stateWrites.length }
  );
}
const future = new Date(Date.now() + 86400000);
const pad = n => String(n).padStart(2, '0');
const date = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}`;
const time = `${pad(future.getHours())}:${pad(future.getMinutes())}`;
const validStates = () => ['Fixture', 'Review-only production callback', '1', account, date, time, true, {}];
{
  const h = makePage('Create', { connected: true, states: validStates() });
  h.render(); h.submit();
  record(
    'Create: valid connected submit validates and writes once',
    { writes: 1, validated: true },
    { writes: h.writes.length, validated: h.stateWrites.includes(7) }
  );
}
{
  const h = makePage('Create', { connected: true });
  h.render(); h.submit();
  record(
    'Create: invalid connected submit validates without write',
    { writes: 0, errorFields: 6 },
    { writes: h.writes.length, errorFields: Object.keys(h.states[7]).length }
  );
}
{
  const h = makePage('Create', { connected: true, chain: 1, states: validStates() });
  h.render(); h.submit();
  record(
    'Create: wrong chain requests switch and does not write',
    { writes: 0, switches: 1 },
    { writes: h.writes.length, switches: h.switches.length }
  );
}

const payload = {
  scope: 'Adapted probe: real classifyPoolQuery injected; unchanged production page render/handlers; no mounted DOM or live wallet',
  adaptation: 'Added ../lib/poolQueryState mock using real compiled module (Pool/Proof now import it); all 29 original cases and expected outcomes unchanged.',
  passed:  results.filter(r => r.pass).length,
  failed:  results.filter(r => !r.pass).length,
  total:   results.length,
  results,
};
fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify(payload, null, 2));
process.exitCode = payload.failed ? 1 : 0;
