import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, Pause, Play, ChevronDown, Copy, Check, ExternalLink,
  Target, Clock, Users, ShieldCheck, AlertCircle,
} from 'lucide-react'

const HUIPOT_ADDRESS = import.meta.env.VITE_HUIPOT_ADDRESS as string | undefined
const CONTRACT_ADDRESS = HUIPOT_ADDRESS && HUIPOT_ADDRESS !== '0x0000000000000000000000000000000000000000'
  ? HUIPOT_ADDRESS
  : '0x81a139599d252eb2dc2bbb6c267e911a21264288'

// ─── Hero Ring SVG ────────────────────────────────────────────────────────────
function RingHero({ progress, motionPaused }: { progress: number; motionPaused: boolean }) {
  const reduced = useReducedMotion()
  const pause = reduced || motionPaused
  const cx = 200; const cy = 200; const r = 140
  const circ = 2 * Math.PI * r
  const filled = circ * progress
  const t = performance.now()
  void t // used for animation frame reference

  return (
    <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
      <svg
        width="320" height="320"
        viewBox="0 0 400 400"
        aria-hidden="true"
        className="absolute inset-0"
        style={{ filter: 'drop-shadow(0 0 32px rgba(210,250,105,0.12))' }}
      >
        {/* Orbit lines */}
        {!pause && (
          <>
            <ellipse
              cx="200" cy="200" rx="170" ry="40"
              fill="none" stroke="rgba(210,250,105,0.07)" strokeWidth="1"
              style={{
                transformOrigin: '200px 200px',
                animation: 'orbit1 16s linear infinite',
              }}
            />
            <ellipse
              cx="200" cy="200" rx="170" ry="40"
              fill="none" stroke="rgba(210,250,105,0.05)" strokeWidth="1"
              style={{
                transformOrigin: '200px 200px',
                transform: 'rotateX(60deg) rotateZ(30deg)',
                animation: 'orbit2 20s linear infinite reverse',
              }}
            />
          </>
        )}
        {/* Track ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#2B3B30"
          strokeWidth="18"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#D2FA69"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - filled}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          transition={pause ? { duration: 0 } : { duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
        />
        {/* Particles along progress arc */}
        {!pause && progress > 0 && (
          <>
            <circle r="4" fill="rgba(210,250,105,0.6)"
              style={{ animation: 'particle1 3s ease-in-out infinite' }}>
              <animateMotion dur="3s" repeatCount="indefinite"
                path={`M ${cx + r} ${cy} A ${r} ${r} 0 ${progress > 0.5 ? 1 : 0} 1 ${cx + r * Math.cos(-Math.PI / 2 + progress * Math.PI * 2)} ${cy + r * Math.sin(-Math.PI / 2 + progress * Math.PI * 2)}`}
              />
            </circle>
          </>
        )}
      </svg>

      {/* Center content */}
      <div className="relative text-center z-10">
        <p className="text-xs mb-1" style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}>
          CONTRIBUTED
        </p>
        <p className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
          {(progress * 1).toFixed(2)}
        </p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          / 1.00 USDC
        </p>
        <div
          className="mt-2 mx-auto rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: 'rgba(210,250,105,0.12)', color: 'var(--accent)', width: 'fit-content' }}
        >
          Interactive demo · No funds moved
        </div>
      </div>

      <style>{`
        @keyframes orbit1 { from { transform: rotateX(75deg) rotateZ(0deg); } to { transform: rotateX(75deg) rotateZ(360deg); } }
        @keyframes orbit2 { from { transform: rotateX(60deg) rotateZ(30deg); } to { transform: rotateX(60deg) rotateZ(390deg); } }
      `}</style>
    </div>
  )
}

// ─── Walkthrough Section ──────────────────────────────────────────────────────
type WalkthroughTab = 'success' | 'failure'
type SuccessStep = 'start' | 'funded' | 'paid'
type FailureStep = 'start' | 'expired' | 'refunded'

function Walkthrough() {
  const [tab, setTab] = useState<WalkthroughTab>('success')
  const [successStep, setSuccessStep] = useState<SuccessStep>('start')
  const [failureStep, setFailureStep] = useState<FailureStep>('start')
  const reduced = useReducedMotion()

  function resetSuccess() { setSuccessStep('start') }
  function resetFailure() { setFailureStep('start') }

  const successProgress = successStep === 'start' ? 0.40 : 1.0
  const failureProgress = 0.40

  return (
    <section id="walkthrough" className="py-24 px-4" style={{ background: 'var(--surface)' }}>
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="display text-4xl font-bold mb-4" style={{ color: 'var(--ink)' }}>
            One goal. Two clear outcomes.
          </h2>
          <p className="text-base" style={{ color: 'var(--muted)' }}>
            See exactly what happens when a pool succeeds or misses its deadline.
          </p>
        </div>

        {/* Demo isolation notice */}
        <div
          className="mb-8 mx-auto max-w-xl rounded-xl px-4 py-3 text-sm text-center"
          style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}
        >
          <AlertCircle className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Illustration only — no wallet, no funds moved.
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl p-1 mx-auto mb-10" style={{ background: 'var(--raised)', maxWidth: 340 }}>
          {(['success', 'failure'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === 'success') resetSuccess(); else resetFailure() }}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors"
              style={tab === t
                ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
                : { color: 'var(--muted)' }
              }
            >
              {t === 'success' ? 'Goal reached' : 'Deadline missed'}
            </button>
          ))}
        </div>

        {/* Demo content */}
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Ring */}
          <div className="flex justify-center">
            <RingHero
              progress={tab === 'success' ? successProgress : failureProgress}
              motionPaused={false}
            />
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {tab === 'success' ? (
              <>
                {successStep === 'start' && (
                  <motion.div
                    key="s-start"
                    initial={reduced ? undefined : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl p-5" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Progress</p>
                      <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                        0.40 / 1.00 USDC
                      </p>
                      <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                        40% — goal not yet reached.
                      </p>
                    </div>
                    <button
                      onClick={() => setSuccessStep('funded')}
                      className="w-full rounded-xl py-3.5 text-sm font-semibold transition-colors"
                      style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                    >
                      Add 0.60 demo USDC
                    </button>
                  </motion.div>
                )}
                {successStep === 'funded' && (
                  <motion.div
                    key="s-funded"
                    initial={reduced ? undefined : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl p-5" style={{ background: 'var(--raised)', border: '1px solid var(--accent)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>
                        Goal reached — payout available
                      </p>
                      <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                        1.00 / 1.00 USDC
                      </p>
                      <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                        Contract rules allow payout. Anyone may trigger it.
                      </p>
                    </div>
                    <button
                      onClick={() => setSuccessStep('paid')}
                      className="w-full rounded-xl py-3.5 text-sm font-semibold transition-colors"
                      style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                    >
                      Simulate payout
                    </button>
                  </motion.div>
                )}
                {successStep === 'paid' && (
                  <motion.div
                    key="s-paid"
                    initial={reduced ? undefined : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl p-5" style={{ background: 'var(--success-bg)', border: '1px solid rgba(200,244,170,0.3)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--success-text)' }}>
                        Payout complete
                      </p>
                      <p className="text-sm" style={{ color: 'var(--success-text)' }}>
                        1.00 USDC sent to <strong>Fixed recipient</strong>.
                      </p>
                    </div>
                    {/* Illustrative receipt — clearly labeled */}
                    <div className="rounded-xl p-4" style={{ background: 'var(--raised)', border: '1px dashed var(--border)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)', letterSpacing: '0.06em' }}>
                        ILLUSTRATIVE RECEIPT
                      </p>
                      <dl className="space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                        <div className="flex justify-between">
                          <dt>Event</dt><dd style={{ color: 'var(--ink)' }}>PaidOut</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Amount</dt><dd style={{ color: 'var(--ink)' }}>1.000000 USDC</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Destination</dt><dd style={{ color: 'var(--ink)' }}>Fixed recipient</dd>
                        </div>
                      </dl>
                    </div>
                    <button
                      onClick={resetSuccess}
                      className="w-full rounded-xl py-3 text-sm font-medium transition-colors"
                      style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                    >
                      Reset and replay
                    </button>
                  </motion.div>
                )}
              </>
            ) : (
              <>
                {failureStep === 'start' && (
                  <motion.div
                    key="f-start"
                    initial={reduced ? undefined : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl p-5" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Progress</p>
                      <p className="display text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                        0.40 / 1.00 USDC
                      </p>
                      <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                        40% — deadline approaching.
                      </p>
                    </div>
                    <button
                      onClick={() => setFailureStep('expired')}
                      className="w-full rounded-xl py-3.5 text-sm font-semibold transition-colors"
                      style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--border-strong)' }}
                    >
                      Advance demo deadline
                    </button>
                  </motion.div>
                )}
                {failureStep === 'expired' && (
                  <motion.div
                    key="f-expired"
                    initial={reduced ? undefined : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl p-5" style={{ background: 'var(--warning-bg)', border: '1px solid rgba(255,211,139,0.3)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--warning-text)' }}>
                        Goal not reached — refund available
                      </p>
                      <p className="text-sm" style={{ color: 'var(--warning-text)' }}>
                        Deadline passed at 0.40/1.00. Each contributor may claim their deposit back.
                      </p>
                    </div>
                    <div
                      className="rounded-xl px-4 py-3 text-xs"
                      style={{ background: 'var(--raised)', color: 'var(--muted)' }}
                    >
                      Refunds must be claimed. Fees are not refunded.
                    </div>
                    <button
                      onClick={() => setFailureStep('refunded')}
                      className="w-full rounded-xl py-3.5 text-sm font-semibold transition-colors"
                      style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                    >
                      Simulate refund claim
                    </button>
                  </motion.div>
                )}
                {failureStep === 'refunded' && (
                  <motion.div
                    key="f-refunded"
                    initial={reduced ? undefined : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl p-5" style={{ background: 'var(--success-bg)', border: '1px solid rgba(200,244,170,0.3)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--success-text)' }}>
                        Refund confirmed
                      </p>
                      <p className="text-sm" style={{ color: 'var(--success-text)' }}>
                        0.40 USDC returned to <strong>Contributor</strong>. Network fee charged.
                      </p>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'var(--raised)', border: '1px dashed var(--border)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)', letterSpacing: '0.06em' }}>
                        ILLUSTRATIVE RECEIPT
                      </p>
                      <dl className="space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                        <div className="flex justify-between">
                          <dt>Event</dt><dd style={{ color: 'var(--ink)' }}>Refunded</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Amount</dt><dd style={{ color: 'var(--ink)' }}>0.400000 USDC</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Returned to</dt><dd style={{ color: 'var(--ink)' }}>Contributor</dd>
                        </div>
                      </dl>
                    </div>
                    <button
                      onClick={resetFailure}
                      className="w-full rounded-xl py-3 text-sm font-medium transition-colors"
                      style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                    >
                      Reset and replay
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>

        {/* CTA below demo */}
        <div className="mt-12 text-center">
          <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
            Ready to try the app?
          </p>
          <Link
            to="/pools"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors"
            style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-strong)' }}
          >
            Explore testnet pools <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs" style={{ color: 'var(--subtle)' }}>
            Real writes require a supported wallet, Arc Testnet connection, and test USDC.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium"
        style={{ color: 'var(--ink)' }}
        aria-expanded={open}
      >
        {q}
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--muted)' }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm" style={{ color: 'var(--muted)' }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="shrink-0 rounded-lg p-1.5"
      style={{ color: 'var(--muted)' }}
      aria-label="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5" style={{ color: 'var(--success-text)' }} /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ─── Main Landing ─────────────────────────────────────────────────────────────
export function Landing() {
  const [motionPaused, setMotionPaused] = useState(false)
  const [heroProgress, setHeroProgress] = useState(0.40)
  const reduced = useReducedMotion()
  const heroRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [heroVisible, setHeroVisible] = useState(true)

  // Stop hero animation when offscreen
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    if (heroRef.current) observerRef.current.observe(heroRef.current)
    return () => observerRef.current?.disconnect()
  }, [])

  const handlePauseToggle = useCallback(() => setMotionPaused((p) => !p), [])

  // Section reveal
  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } },
  }

  return (
    <div style={{ background: 'var(--canvas)' }}>

      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 rounded-xl px-4 py-2 text-sm font-semibold"
        style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
      >
        Skip to content
      </a>

      {/* Pause motion control — visible */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handlePauseToggle}
          className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          aria-label={motionPaused ? 'Resume motion' : 'Pause motion'}
        >
          {motionPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {motionPaused ? 'Resume' : 'Pause'} motion
        </button>
      </div>

      {/* ── L1 Hero ── */}
      <main id="main-content">
        <section
          ref={heroRef}
          className="relative overflow-hidden py-20 px-4"
          style={{ minHeight: 620 }}
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid md:grid-cols-[1fr_auto] gap-12 items-center">
              {/* Copy */}
              <motion.div
                initial={reduced ? undefined : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <p
                  className="mb-4 text-xs font-semibold tracking-widest"
                  style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}
                >
                  SHARED GOALS. CLEAR RULES.
                </p>
                <h1
                  className="display font-bold leading-[1.02] mb-6"
                  style={{
                    color: 'var(--ink)',
                    fontSize: 'clamp(40px, 6vw, 80px)',
                    maxWidth: '14ch',
                  }}
                >
                  Pool together.{' '}
                  <br className="hidden md:block" />
                  Make it{' '}
                  <span style={{ color: 'var(--accent)' }}>happen.</span>
                </h1>
                <p
                  className="mb-8 text-lg leading-relaxed"
                  style={{ color: 'var(--muted)', maxWidth: '52ch' }}
                >
                  Pool USDC for one shared goal. Reach the target to make the funds payable
                  to a fixed recipient. Miss the deadline and each contributor can claim
                  their deposit back.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <Link
                    to="/create"
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-colors hover:opacity-90"
                    style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                  >
                    Create a pool <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#walkthrough"
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-colors"
                    style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-strong)' }}
                  >
                    Try the walkthrough
                  </a>
                </div>
                <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                  No platform fee · Network fees apply
                </p>
              </motion.div>

              {/* Ring */}
              <motion.div
                initial={reduced ? undefined : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                className="mx-auto md:mx-0"
              >
                <RingHero
                  progress={heroProgress}
                  motionPaused={motionPaused || !heroVisible || !!reduced}
                />
                {/* Demo chip */}
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={() => setHeroProgress(Math.min(1, heroProgress + 0.4))}
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{ background: 'rgba(210,250,105,0.15)', color: 'var(--accent)', border: '1px solid rgba(210,250,105,0.25)' }}
                  >
                    +0.40 demo
                  </button>
                  <button
                    onClick={() => setHeroProgress(0.40)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                  >
                    Reset
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── L2 How it works ── */}
        <motion.section
          id="how-it-works"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={reduced ? {} : sectionVariants}
          className="py-20 px-4"
          style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="mx-auto max-w-5xl">
            <div className="grid md:grid-cols-3 gap-0">
              {[
                {
                  n: '1', icon: Target, title: 'Set the terms.',
                  body: 'Choose one target, deadline and fixed recipient.',
                },
                {
                  n: '2', icon: Users, title: 'Pool your USDC.',
                  body: 'Share the link and contribute toward the exact goal.',
                },
                {
                  n: '3', icon: Clock, title: 'Payout or refund.',
                  body: 'Reach the goal to make payout available; otherwise contributors claim refunds after the deadline.',
                },
              ].map((step, i) => (
                <div
                  key={step.n}
                  className="px-8 py-6"
                  style={{
                    borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                    borderRight: 'none',
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="display text-4xl font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                      {step.n}
                    </span>
                  </div>
                  <h3 className="display text-lg font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-center" style={{ color: 'var(--subtle)' }}>
              Terms cannot be changed after creation.
            </p>
          </div>
        </motion.section>

        {/* ── L3 Walkthrough ── */}
        <Walkthrough />

        {/* ── L4 Use cases + commitment ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={reduced ? {} : sectionVariants}
          className="py-24 px-4"
        >
          <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-16 items-start">
            {/* Use cases */}
            <div>
              <h2 className="display text-3xl font-bold mb-8" style={{ color: 'var(--ink)' }}>
                For the things you do together.
              </h2>
              <div className="space-y-5">
                {[
                  { title: 'Community workshop', body: 'Pool for shared recording equipment. Funds reach the vendor only when everyone has contributed.' },
                  { title: 'Shared team tools', body: 'Split software costs among remote collaborators with clear, auditable accountability.' },
                  { title: 'Creative collaboration', body: 'Fund a joint project with transparent terms — every contributor knows exactly what they committed to.' },
                ].map((uc) => (
                  <div key={uc.title} className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <h3 className="display font-semibold mb-1" style={{ color: 'var(--ink)' }}>{uc.title}</h3>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{uc.body}</p>
                  </div>
                ))}
                <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                  These are illustrative examples, not active or endorsed pools.
                </p>
              </div>
            </div>

            {/* Commitment rules */}
            <div>
              <h2 className="display text-3xl font-bold mb-8" style={{ color: 'var(--ink)' }}>
                Know the commitment.
              </h2>
              <div
                className="rounded-2xl p-6 space-y-4"
                style={{ background: 'var(--warning-bg)', border: '1px solid rgba(255,211,139,0.2)' }}
              >
                {[
                  'Fixed recipient and terms are set once at creation and cannot be changed.',
                  'No early withdrawal or cancellation for contributors.',
                  'Reaching the funding goal makes payout available immediately — it is not automatic.',
                  'Refunds are only claimable after the deadline if the goal was not reached. Principal only; gas fees are not refunded.',
                  'The contract does not guarantee the stated real-world outcome of the pool.',
                ].map((rule, i) => (
                  <div key={i} className="flex gap-3 text-sm" style={{ color: 'var(--warning-text)' }}>
                    <span className="shrink-0 font-bold mt-0.5">{i + 1}.</span>
                    <p>{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── L5 Judge evidence ── */}
        <motion.section
          id="for-judges"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={reduced ? {} : sectionVariants}
          className="py-24 px-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-12">
              <h2 className="display text-4xl font-bold mb-3" style={{ color: 'var(--ink)' }}>
                Built to be inspected.
              </h2>
              <p className="text-base" style={{ color: 'var(--muted)' }}>
                No platform fee · Unaudited · Arc Testnet only · No mainnet proof claimed.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Try it */}
              <div className="rounded-2xl p-6" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                <p className="display text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>Try it</p>
                <div className="space-y-3">
                  <a href="#walkthrough" className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent)' }}>
                    <ArrowRight className="h-3.5 w-3.5" /> Walkthrough
                  </a>
                  <Link to="/pools" className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent)' }}>
                    <ArrowRight className="h-3.5 w-3.5" /> Real pool lookup
                  </Link>
                  <p className="text-xs mt-2" style={{ color: 'var(--subtle)' }}>No wallet required for reads.</p>
                </div>
              </div>

              {/* Inspect it */}
              <div className="rounded-2xl p-6" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                <p className="display text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>Inspect it</p>
                <div className="space-y-3">
                  {[
                    { label: 'Source', href: 'https://github.com/aquattdabackup/HuiPot' },
                    { label: 'Specification', href: 'https://github.com/aquattdabackup/HuiPot/blob/main/docs/SPEC.md' },
                    { label: 'Contract on ArcScan', href: `https://explorer.testnet.arc.io/address/${CONTRACT_ADDRESS}` },
                  ].map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm"
                      style={{ color: 'var(--accent)' }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {l.label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="rounded-2xl p-6" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                <p className="display text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>Status</p>
                <dl className="space-y-2 text-sm">
                  {[
                    { k: 'Network', v: 'Arc Testnet', ok: true },
                    { k: 'Audit', v: 'Unaudited', ok: false },
                    { k: 'Mainnet tx', v: 'Not recorded', ok: false },
                    { k: 'Live-app URL', v: 'Not recorded', ok: false },
                  ].map(({ k, v, ok }) => (
                    <div key={k} className="flex items-center justify-between gap-2">
                      <dt style={{ color: 'var(--muted)' }}>{k}</dt>
                      <dd className="flex items-center gap-1">
                        {ok
                          ? <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--success-text)' }} />
                          : <AlertCircle className="h-3.5 w-3.5" style={{ color: 'var(--warning-text)' }} />
                        }
                        <span style={{ color: ok ? 'var(--success-text)' : 'var(--warning-text)' }}>{v}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                {/* Contract address with copy */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs" style={{ color: 'var(--subtle)' }}>
                    Contract address
                  </summary>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="mono text-xs break-all" style={{ color: 'var(--muted)' }}>{CONTRACT_ADDRESS}</span>
                    <CopyButton value={CONTRACT_ADDRESS} />
                  </div>
                </details>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── L6 FAQ + footer ── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={reduced ? {} : sectionVariants}
          className="py-24 px-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="mx-auto max-w-2xl">
            <h2 className="display text-3xl font-bold mb-10 text-center" style={{ color: 'var(--ink)' }}>
              Questions
            </h2>
            <div>
              <FaqItem q="Can I withdraw early?" a="No. Contributions are locked until the pool resolves — either by reaching the goal and payout, or by expiring past the deadline and entering refund mode." />
              <FaqItem q="What if the goal is not reached?" a="After the deadline passes with less than the full goal contributed, each contributor may claim their deposited principal back. Gas fees are not refunded." />
              <FaqItem q="Who receives the money?" a="The fixed recipient address set at pool creation. This address is immutable and cannot be changed after the pool is created." />
              <FaqItem q="Is payout automatic?" a="No. The contract rules determine eligibility. A wallet transaction explicitly triggers payout or refund. Anyone may trigger payout once the goal is met." />
              <FaqItem q="Is this mainnet?" a="The current deployment is on Arc Testnet. No mainnet proof is claimed. This is for testing and demonstration only." />
            </div>

            {/* Closing CTA */}
            <div className="mt-16 text-center">
              <p className="display text-2xl font-bold mb-6" style={{ color: 'var(--ink)' }}>
                Your next shared goal starts here.
              </p>
              <Link
                to="/create"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-colors hover:opacity-90"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                Create a pool <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer
        className="px-4 py-8"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="display flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              HP
            </div>
            <span className="display text-sm font-semibold" style={{ color: 'var(--ink)' }}>HuiPot</span>
          </div>
          <div className="flex flex-wrap gap-5 text-xs" style={{ color: 'var(--subtle)' }}>
            <a href="https://github.com/aquattdabackup/HuiPot" target="_blank" rel="noopener noreferrer" className="hover:underline">Source</a>
            <a href={`https://explorer.testnet.arc.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="hover:underline">Contract</a>
          </div>
          <p className="text-xs w-full md:w-auto" style={{ color: 'var(--subtle)' }}>
            Unaudited contracts · Testnet only · No platform fee · Network fees apply
          </p>
        </div>
      </footer>
    </div>
  )
}
