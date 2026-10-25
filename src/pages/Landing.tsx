import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, Pause, Play, ChevronDown, Copy, Check, ExternalLink,
  ShieldCheck, AlertCircle,
} from 'lucide-react'

const HUIPOT_ADDRESS = import.meta.env.VITE_HUIPOT_ADDRESS as string | undefined
const CONTRACT_ADDRESS = HUIPOT_ADDRESS && HUIPOT_ADDRESS !== '0x0000000000000000000000000000000000000000'
  ? HUIPOT_ADDRESS
  : '0x81a139599d252eb2dc2bbb6c267e911a21264288'

// ─── Dimensional Torus ────────────────────────────────────────────────────────
// Layered SVG: graphite body, bevel highlights, dark inner cavity, lime segment
function RingTorus({
  progress,
  motionPaused,
  size = 480,
}: {
  progress: number
  motionPaused: boolean
  size?: number
}) {
  const reduced = useReducedMotion()
  const paused = reduced || motionPaused

  const cx = 240; const cy = 240
  const outerR = 170; const innerR = 100
  // Torus progress arc uses middle radius
  const midR = (outerR + innerR) / 2   // 135
  const strokeW = outerR - innerR       // 70
  const circ = 2 * Math.PI * midR
  const filled = circ * progress

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size} height={size}
        viewBox="0 0 480 480"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          {/* Graphite torus body gradient: lighter top-left, darker bottom-right */}
          <radialGradient id="torusBody" cx="38%" cy="30%" r="65%">
            <stop offset="0%"  stopColor="#3A4A3D" />
            <stop offset="40%" stopColor="#1E2B20" />
            <stop offset="100%" stopColor="#0D1410" />
          </radialGradient>

          {/* Lime segment glow */}
          <radialGradient id="limeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="#D2FA69" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#D2FA69" stopOpacity="0" />
          </radialGradient>

          {/* Top bevel highlight */}
          <linearGradient id="bevelTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"  stopColor="#6A8A6E" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3A5040" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1A2A1E" stopOpacity="0" />
          </linearGradient>

          {/* Inner rim shadow */}
          <radialGradient id="innerRim" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="transparent" />
            <stop offset="85%" stopColor="#000000" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
          </radialGradient>

          {/* Contact shadow under torus */}
          <radialGradient id="contactShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="#000000" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Atmospheric radial light behind torus */}
          <radialGradient id="atmosphereBg" cx="50%" cy="45%" r="55%">
            <stop offset="0%"  stopColor="#1C3022" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#0B100E" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0B100E" stopOpacity="0" />
          </radialGradient>

          {/* Clip for torus donut shape */}
          <mask id="torusMask">
            <circle cx={cx} cy={cy} r={outerR} fill="white" />
            <circle cx={cx} cy={cy} r={innerR} fill="black" />
          </mask>

          {/* Filter: subtle glow on lime segment */}
          <filter id="limeFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Soft outer glow */}
          <filter id="outerGlow" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="12" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Atmospheric background circle */}
        <circle cx={cx} cy={cy} r={220} fill="url(#atmosphereBg)" />

        {/* Contact shadow ellipse */}
        <ellipse cx={cx} cy={cy + outerR - 10} rx={outerR * 0.85} ry={18}
          fill="url(#contactShadow)" />

        {/* Orbit lines — quiet, only when not paused */}
        {!paused && (
          <>
            <ellipse
              cx={cx} cy={cy} rx={outerR + 28} ry={22}
              fill="none" stroke="rgba(210,250,105,0.08)" strokeWidth="1"
              style={{
                transformOrigin: `${cx}px ${cy}px`,
                animation: 'hp-orbit1 16s linear infinite',
              }}
            />
            <ellipse
              cx={cx} cy={cy} rx={outerR + 40} ry={16}
              fill="none" stroke="rgba(210,250,105,0.05)" strokeWidth="1"
              style={{
                transformOrigin: `${cx}px ${cy}px`,
                animation: 'hp-orbit2 22s linear infinite reverse',
              }}
            />
          </>
        )}

        {/* ── TORUS BODY ── */}
        <g mask="url(#torusMask)">
          {/* Base graphite fill */}
          <circle cx={cx} cy={cy} r={outerR} fill="url(#torusBody)" />
          {/* Top-left bevel highlight */}
          <circle cx={cx} cy={cy} r={outerR} fill="url(#bevelTop)" />
          {/* Inner rim darkening */}
          <circle cx={cx} cy={cy} r={outerR} fill="url(#innerRim)" />
        </g>

        {/* ── LIME PROGRESS SEGMENT ── */}
        {/* Glow halo behind lime segment */}
        {progress > 0 && (
          <circle
            cx={cx} cy={cy} r={midR}
            fill="none"
            stroke="#D2FA69"
            strokeWidth={strokeW + 14}
            strokeLinecap="butt"
            strokeDasharray={circ}
            strokeDashoffset={circ - filled}
            style={{
              transform: `rotate(-90deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              opacity: 0.18,
              filter: 'blur(8px)',
            }}
          />
        )}
        {/* Lime arc — core */}
        <motion.circle
          cx={cx} cy={cy} r={midR}
          fill="none"
          stroke="#D2FA69"
          strokeWidth={strokeW - 4}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - filled}
          style={{
            transform: `rotate(-90deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            filter: 'drop-shadow(0 0 6px rgba(210,250,105,0.5))',
          }}
          transition={paused ? { duration: 0 } : { duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
        />
        {/* Lime top surface bevel (lighter stripe along top edge) */}
        {progress > 0 && (
          <motion.circle
            cx={cx} cy={cy} r={outerR - 6}
            fill="none"
            stroke="rgba(240,255,180,0.5)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circ * (outerR - 6) / midR}
            strokeDashoffset={(circ * (outerR - 6) / midR) - (filled * (outerR - 6) / midR)}
            style={{
              transform: `rotate(-90deg)`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
            transition={paused ? { duration: 0 } : { duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
          />
        )}

        {/* Dark cavity circle (inner hole) */}
        <circle cx={cx} cy={cy} r={innerR - 2}
          fill="#080E0A"
          style={{ filter: 'drop-shadow(inset 0 4px 12px rgba(0,0,0,0.8))' }}
        />
        {/* Inner rim dark ring to emphasise depth */}
        <circle cx={cx} cy={cy} r={innerR + 2}
          fill="none"
          stroke="rgba(0,0,0,0.7)"
          strokeWidth={6}
        />
        {/* Inner cavity highlight arc — upper portion reflects a little light */}
        <path
          d={`M ${cx - innerR * 0.7} ${cy - innerR * 0.6} A ${innerR * 0.9} ${innerR * 0.5} 0 0 1 ${cx + innerR * 0.7} ${cy - innerR * 0.6}`}
          fill="none"
          stroke="rgba(100,140,110,0.15)"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Particles along lime arc */}
        {!paused && progress > 0 && (
          <>
            <circle r="3.5" fill="rgba(210,250,105,0.7)">
              <animateMotion dur="2.8s" repeatCount="indefinite"
                path={`M ${cx + midR * Math.cos(-Math.PI/2)} ${cy + midR * Math.sin(-Math.PI/2)} A ${midR} ${midR} 0 ${progress > 0.5 ? 1 : 0} 1 ${cx + midR * Math.cos(-Math.PI/2 + progress * 2 * Math.PI)} ${cy + midR * Math.sin(-Math.PI/2 + progress * 2 * Math.PI)}`}
              />
            </circle>
            <circle r="2" fill="rgba(210,250,105,0.45)">
              <animateMotion dur="4.2s" repeatCount="indefinite" begin="-1.4s"
                path={`M ${cx + midR * Math.cos(-Math.PI/2)} ${cy + midR * Math.sin(-Math.PI/2)} A ${midR} ${midR} 0 ${progress > 0.5 ? 1 : 0} 1 ${cx + midR * Math.cos(-Math.PI/2 + progress * 2 * Math.PI)} ${cy + midR * Math.sin(-Math.PI/2 + progress * 2 * Math.PI)}`}
              />
            </circle>
          </>
        )}
      </svg>

      {/* Center text — real DOM on top of SVG */}
      <div className="relative z-10 text-center" style={{ marginTop: -8 }}>
        <p className="text-xs mb-1 font-medium tracking-widest uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.1em' }}>
          Contributed
        </p>
        <p
          className="font-bold tabular-nums leading-none"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 38px)' }}
        >
          {(progress * 1).toFixed(2)}
          <span style={{ fontSize: '0.55em', color: 'var(--muted)', marginLeft: 2 }}>/ 1.00</span>
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>USDC</p>
        <div
          className="mt-2 mx-auto rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{
            background: 'rgba(210,250,105,0.10)',
            color: 'var(--accent)',
            border: '1px solid rgba(210,250,105,0.18)',
            width: 'fit-content',
            fontSize: 10,
          }}
        >
          Interactive demo · No funds moved
        </div>
      </div>

      <style>{`
        @keyframes hp-orbit1 {
          from { transform: rotateX(78deg) rotateZ(0deg); }
          to   { transform: rotateX(78deg) rotateZ(360deg); }
        }
        @keyframes hp-orbit2 {
          from { transform: rotateX(65deg) rotateZ(20deg); }
          to   { transform: rotateX(65deg) rotateZ(380deg); }
        }
      `}</style>
    </div>
  )
}

// ─── Walkthrough branching diagram ────────────────────────────────────────────
function OutcomeDiagram({ activeTab }: { activeTab: 'success' | 'failure' }) {
  return (
    <svg width="220" height="200" viewBox="0 0 220 200" aria-hidden="true">
      {/* Shared goal circle */}
      <circle cx="110" cy="28" r="22" fill="none" stroke="#D2FA69" strokeWidth="2" />
      <text x="110" y="24" textAnchor="middle" fill="#D2FA69" fontSize="9" fontFamily="var(--font-display)">Shared</text>
      <text x="110" y="36" textAnchor="middle" fill="#D2FA69" fontSize="9" fontFamily="var(--font-display)">goal</text>

      {/* Vertical stem */}
      <line x1="110" y1="50" x2="110" y2="85" stroke="rgba(210,250,105,0.4)" strokeWidth="1.5" />

      {/* Fork left to success */}
      <path d="M 110 85 Q 110 110 60 130" fill="none"
        stroke={activeTab === 'success' ? '#D2FA69' : 'rgba(210,250,105,0.25)'}
        strokeWidth={activeTab === 'success' ? 2 : 1.5} />
      {/* Fork right to failure */}
      <path d="M 110 85 Q 110 110 160 130" fill="none"
        stroke={activeTab === 'failure' ? '#FFD38B' : 'rgba(161,177,165,0.25)'}
        strokeWidth={activeTab === 'failure' ? 2 : 1.5} />

      {/* Goal reached circle */}
      <circle cx="60" cy="145" r="18"
        fill={activeTab === 'success' ? 'rgba(210,250,105,0.15)' : 'transparent'}
        stroke={activeTab === 'success' ? '#D2FA69' : 'rgba(210,250,105,0.3)'}
        strokeWidth="1.5" />
      <text x="60" y="143" textAnchor="middle" fill={activeTab === 'success' ? '#D2FA69' : '#6A7A6E'} fontSize="10">✓</text>
      <text x="60" y="172" textAnchor="middle" fill={activeTab === 'success' ? '#D2FA69' : '#6A7A6E'} fontSize="8" fontFamily="var(--font-display)">Goal</text>
      <text x="60" y="182" textAnchor="middle" fill={activeTab === 'success' ? '#D2FA69' : '#6A7A6E'} fontSize="8" fontFamily="var(--font-display)">reached</text>

      {/* Deadline missed circle */}
      <circle cx="160" cy="145" r="18"
        fill={activeTab === 'failure' ? 'rgba(255,211,139,0.12)' : 'transparent'}
        stroke={activeTab === 'failure' ? '#FFD38B' : 'rgba(161,177,165,0.3)'}
        strokeWidth="1.5" />
      <text x="160" y="143" textAnchor="middle" fill={activeTab === 'failure' ? '#FFD38B' : '#6A7A6E'} fontSize="10">✕</text>
      <text x="160" y="172" textAnchor="middle" fill={activeTab === 'failure' ? '#FFD38B' : '#6A7A6E'} fontSize="8" fontFamily="var(--font-display)">Deadline</text>
      <text x="160" y="182" textAnchor="middle" fill={activeTab === 'failure' ? '#FFD38B' : '#6A7A6E'} fontSize="8" fontFamily="var(--font-display)">missed</text>
    </svg>
  )
}

// ─── Walkthrough ──────────────────────────────────────────────────────────────
type WalkthroughTab = 'success' | 'failure'
type SuccessStep = 'start' | 'funded' | 'paid'
type FailureStep = 'start' | 'expired' | 'refunded'

function Walkthrough({ motionPaused }: { motionPaused: boolean }) {
  const [tab, setTab] = useState<WalkthroughTab>('success')
  const [successStep, setSuccessStep] = useState<SuccessStep>('start')
  const [failureStep, setFailureStep] = useState<FailureStep>('start')
  const reduced = useReducedMotion()

  const walkthroughProgress = tab === 'success'
    ? (successStep === 'start' ? 0.40 : 1.0)
    : 0.40

  function handleTabChange(t: WalkthroughTab) {
    setTab(t)
    setSuccessStep('start')
    setFailureStep('start')
  }

  return (
    <section id="walkthrough" className="py-24 px-4" style={{ background: 'var(--surface)' }}>
      <div className="mx-auto max-w-6xl">

        {/* Split: left editorial, right diagram */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-14">
          <div>
            <h2
              className="font-bold leading-tight mb-4"
              style={{
                color: 'var(--ink)',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(36px, 4vw, 52px)',
              }}
            >
              One goal.<br />Two clear outcomes.
            </h2>
            <p className="text-base mb-6" style={{ color: 'var(--muted)', maxWidth: '42ch' }}>
              See exactly what happens when a pool succeeds or misses its deadline.
              Every step is explicit — nothing moves automatically.
            </p>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium"
              style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid rgba(255,211,139,0.2)' }}
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Illustration only — no wallet, no funds moved.
            </div>
          </div>
          <div className="flex justify-center">
            <OutcomeDiagram activeTab={tab} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl p-1 mb-10" style={{ background: 'var(--raised)', maxWidth: 340 }}>
          {(['success', 'failure'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
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

        {/* Demo content: torus left, steps right */}
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div className="flex justify-center">
            <RingTorus
              progress={walkthroughProgress}
              motionPaused={motionPaused}
              size={320}
            />
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {tab === 'success' ? (
                <motion.div
                  key={`success-${successStep}`}
                  initial={reduced ? undefined : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.24 }}
                  className="space-y-4"
                >
                  {successStep === 'start' && (
                    <>
                      <div className="rounded-2xl p-5" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Progress</p>
                        <p className="font-bold tabular-nums text-2xl" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                          0.40 / 1.00 USDC
                        </p>
                        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>40% — goal not yet reached.</p>
                      </div>
                      <button
                        onClick={() => setSuccessStep('funded')}
                        className="w-full rounded-xl py-3.5 text-sm font-semibold transition-colors"
                        style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                      >
                        Add 0.60 demo USDC
                      </button>
                    </>
                  )}
                  {successStep === 'funded' && (
                    <>
                      <div className="rounded-2xl p-5" style={{ background: 'var(--raised)', border: '1px solid var(--accent)' }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent)' }}>
                          Goal reached — payout available
                        </p>
                        <p className="font-bold tabular-nums text-2xl" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
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
                    </>
                  )}
                  {successStep === 'paid' && (
                    <>
                      <div className="rounded-2xl p-5" style={{ background: 'var(--success-bg)', border: '1px solid rgba(200,244,170,0.3)' }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--success-text)' }}>Payout complete</p>
                        <p className="text-sm" style={{ color: 'var(--success-text)' }}>
                          1.00 USDC sent to <strong>Fixed recipient</strong>.
                        </p>
                      </div>
                      <div className="rounded-xl p-4" style={{ background: 'var(--raised)', border: '1px dashed var(--border)' }}>
                        <p className="text-xs font-semibold mb-2 tracking-widest" style={{ color: 'var(--accent)' }}>ILLUSTRATIVE RECEIPT</p>
                        <dl className="space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                          <div className="flex justify-between"><dt>Event</dt><dd style={{ color: 'var(--ink)' }}>PaidOut</dd></div>
                          <div className="flex justify-between"><dt>Amount</dt><dd style={{ color: 'var(--ink)' }}>1.000000 USDC</dd></div>
                          <div className="flex justify-between"><dt>Destination</dt><dd style={{ color: 'var(--ink)' }}>Fixed recipient</dd></div>
                        </dl>
                      </div>
                      <button
                        onClick={() => setSuccessStep('start')}
                        className="w-full rounded-xl py-3 text-sm font-medium transition-colors"
                        style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                      >
                        Reset and replay
                      </button>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key={`failure-${failureStep}`}
                  initial={reduced ? undefined : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.24 }}
                  className="space-y-4"
                >
                  {failureStep === 'start' && (
                    <>
                      <div className="rounded-2xl p-5" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
                        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Progress</p>
                        <p className="font-bold tabular-nums text-2xl" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                          0.40 / 1.00 USDC
                        </p>
                        <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>40% — deadline approaching.</p>
                      </div>
                      <button
                        onClick={() => setFailureStep('expired')}
                        className="w-full rounded-xl py-3.5 text-sm font-semibold transition-colors"
                        style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--border-strong)' }}
                      >
                        Advance demo deadline
                      </button>
                    </>
                  )}
                  {failureStep === 'expired' && (
                    <>
                      <div className="rounded-2xl p-5" style={{ background: 'var(--warning-bg)', border: '1px solid rgba(255,211,139,0.3)' }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--warning-text)' }}>
                          Goal not reached — refund available
                        </p>
                        <p className="text-sm" style={{ color: 'var(--warning-text)' }}>
                          Deadline passed at 0.40/1.00. Each contributor may claim their deposit back.
                        </p>
                      </div>
                      <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
                        Refunds must be claimed. Fees are not refunded.
                      </div>
                      <button
                        onClick={() => setFailureStep('refunded')}
                        className="w-full rounded-xl py-3.5 text-sm font-semibold transition-colors"
                        style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                      >
                        Simulate refund claim
                      </button>
                    </>
                  )}
                  {failureStep === 'refunded' && (
                    <>
                      <div className="rounded-2xl p-5" style={{ background: 'var(--success-bg)', border: '1px solid rgba(200,244,170,0.3)' }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--success-text)' }}>Refund confirmed</p>
                        <p className="text-sm" style={{ color: 'var(--success-text)' }}>
                          0.40 USDC returned to <strong>Contributor</strong>. Network fee charged.
                        </p>
                      </div>
                      <div className="rounded-xl p-4" style={{ background: 'var(--raised)', border: '1px dashed var(--border)' }}>
                        <p className="text-xs font-semibold mb-2 tracking-widest" style={{ color: 'var(--accent)' }}>ILLUSTRATIVE RECEIPT</p>
                        <dl className="space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                          <div className="flex justify-between"><dt>Event</dt><dd style={{ color: 'var(--ink)' }}>Refunded</dd></div>
                          <div className="flex justify-between"><dt>Amount</dt><dd style={{ color: 'var(--ink)' }}>0.400000 USDC</dd></div>
                          <div className="flex justify-between"><dt>Returned to</dt><dd style={{ color: 'var(--ink)' }}>Contributor</dd></div>
                        </dl>
                      </div>
                      <button
                        onClick={() => setFailureStep('start')}
                        className="w-full rounded-xl py-3 text-sm font-medium transition-colors"
                        style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                      >
                        Reset and replay
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CTA below demo */}
        <div className="mt-12 text-center">
          <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>Ready to try the app?</p>
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

// ─── FAQ ──────────────────────────────────────────────────────────────────────
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

// ─── Ring brand mark (circle outline, not square) ─────────────────────────────
export function RingMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="#D2FA69" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="7" fill="none" stroke="#D2FA69" strokeWidth="2" />
      {/* Lime arc 40% */}
      <circle cx="16" cy="16" r="10"
        fill="none" stroke="#D2FA69" strokeWidth="4"
        strokeDasharray={`${2 * Math.PI * 10 * 0.4} ${2 * Math.PI * 10 * 0.6}`}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '16px 16px' }}
      />
    </svg>
  )
}

// ─── Main Landing ─────────────────────────────────────────────────────────────
export function Landing() {
  const [motionPaused, setMotionPaused] = useState(false)
  const reduced = useReducedMotion()
  const heroRef = useRef<HTMLDivElement>(null)
  const [heroVisible, setHeroVisible] = useState(true)

  // Stop hero ring when scrolled offscreen
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0 })
    if (heroRef.current) obs.observe(heroRef.current)
    return () => obs.disconnect()
  }, [])

  // Stop animations when tab hidden
  useEffect(() => {
    const onVis = () => { if (document.hidden) setHeroVisible(false) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const handlePauseToggle = useCallback(() => setMotionPaused((p) => !p), [])
  const heroPaused = motionPaused || !heroVisible || !!reduced

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as const } },
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

      {/* Pause motion — fixed bottom right */}
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
      {/* NOTE: no <main> here — App.tsx wraps routes in <main id="main-content"> */}
      <section
        id="main-content"
        ref={heroRef}
        className="relative overflow-hidden px-4"
        style={{
          minHeight: 680,
          paddingTop: 80,
          paddingBottom: 80,
          /* Atmospheric directional light behind torus */
          background: `
            radial-gradient(ellipse 55% 60% at 72% 45%, rgba(28,48,34,0.55) 0%, transparent 70%),
            var(--canvas)
          `,
        }}
      >
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <div className="grid md:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">

            {/* Left: copy */}
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <p
                className="mb-5 text-xs font-semibold tracking-widest"
                style={{ color: 'var(--accent)', letterSpacing: '0.14em' }}
              >
                SHARED GOALS. CLEAR RULES.
              </p>
              <h1
                className="font-bold leading-[0.98] mb-6"
                style={{
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(48px, 6.5vw, 104px)',
                  maxWidth: '12ch',
                  /* Stable dark backing for text over atmospheric bg */
                  textShadow: '0 2px 24px rgba(0,0,0,0.4)',
                }}
              >
                Pool together.{' '}
                <br className="hidden sm:block" />
                Make it{' '}
                <span style={{ color: 'var(--accent)' }}>happen.</span>
              </h1>
              <p
                className="mb-8 text-lg leading-relaxed"
                style={{ color: 'var(--muted)', maxWidth: '50ch' }}
              >
                Pool USDC for one shared goal. Reach the target to make the funds payable
                to a fixed recipient. Miss the deadline and each contributor can claim
                their deposit back.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                {/* Pill-shaped primary CTA */}
                <Link
                  to="/create"
                  className="inline-flex items-center gap-2 px-7 py-4 text-sm font-semibold transition-colors hover:opacity-90"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--accent-ink)',
                    borderRadius: 9999,
                  }}
                >
                  Create a pool <ArrowRight className="h-4 w-4" />
                </Link>
                {/* Text/play secondary */}
                <a
                  href="#walkthrough"
                  className="inline-flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-colors hover:opacity-80"
                  style={{ color: 'var(--ink)' }}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full"
                    style={{ background: 'var(--raised)', border: '1px solid var(--border)', width: 28, height: 28 }}
                  >
                    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
                      <path d="M0 0L10 6L0 12Z" fill="currentColor" />
                    </svg>
                  </span>
                  Try the walkthrough
                </a>
              </div>
              <p className="text-xs" style={{ color: 'var(--subtle)' }}>
                No platform fee · Network fees apply
              </p>
            </motion.div>

            {/* Right: dimensional torus */}
            <motion.div
              initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              className="mx-auto md:mx-0 flex flex-col items-center gap-4"
            >
              <RingTorus progress={0.40} motionPaused={heroPaused} size={480} />
              {/* Chip row — fixed 0.40 remaining, arithmetic consistent */}
              <div className="flex gap-2 justify-center">
                <div
                  className="rounded-full px-3 py-1.5 text-xs font-medium"
                  style={{ background: 'rgba(210,250,105,0.13)', color: 'var(--accent)', border: '1px solid rgba(210,250,105,0.22)' }}
                >
                  +0.40 USDC
                </div>
                <div
                  className="rounded-full px-3 py-1.5 text-xs font-medium"
                  style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                >
                  0.60 to go
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── L2 How it works — editorial band with outlined numbers ── */}
      <motion.section
        id="how-it-works"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={reduced ? {} : sectionVariants}
        className="px-4"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ '--tw-divide-opacity': 1, borderColor: 'var(--border)' } as React.CSSProperties}>
            {[
              {
                n: '01', title: 'Set the terms.',
                body: 'Choose one target, deadline and fixed recipient.',
              },
              {
                n: '02', title: 'Pool your USDC.',
                body: 'Share the link and contribute toward the exact goal.',
              },
              {
                n: '03', title: 'Payout or refund.',
                body: 'Reach the goal to make payout available; otherwise contributors claim refunds after the deadline.',
              },
            ].map((step) => (
              <div key={step.n} className="px-8 py-10">
                {/* Outlined number circle */}
                <div
                  className="flex items-center justify-center mb-4"
                  style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    border: '1.5px solid var(--accent)',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-display)',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  {step.n}
                </div>
                <h3
                  className="font-semibold mb-2"
                  style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 17 }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
          <p className="py-4 text-xs text-center" style={{ color: 'var(--subtle)', borderTop: '1px solid var(--border)' }}>
            Terms cannot be changed after creation.
          </p>
        </div>
      </motion.section>

      {/* ── L3 Walkthrough ── */}
      <Walkthrough motionPaused={motionPaused} />

      {/* ── L4 Use cases (hairline rows) + commitment rules ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={reduced ? {} : sectionVariants}
        className="py-24 px-4"
      >
        <div className="mx-auto grid md:grid-cols-2 gap-16 items-start" style={{ maxWidth: 1200 }}>
          <div>
            <h2
              className="font-bold mb-8"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3vw,40px)' }}
            >
              For the things you do together.
            </h2>
            {/* Hairline-separated rows, not cards */}
            <div>
              {[
                {
                  title: 'Community workshop',
                  body: 'Pool for shared recording equipment. Funds reach the vendor once the target is met.',
                },
                {
                  title: 'Shared team tools',
                  body: 'Split software costs among remote collaborators with clear, auditable accountability.',
                },
                {
                  title: 'Creative collaboration',
                  body: 'Fund a joint project with transparent terms — every contributor knows exactly what they committed to.',
                },
              ].map((uc, i) => (
                <div
                  key={uc.title}
                  className="py-5"
                  style={{ borderTop: i === 0 ? '1px solid var(--border)' : '1px solid var(--border)', borderBottom: i === 2 ? '1px solid var(--border)' : 'none' }}
                >
                  <h3
                    className="font-semibold mb-1"
                    style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 15 }}
                  >
                    {uc.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>{uc.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs" style={{ color: 'var(--subtle)' }}>
              Illustrative examples only — not active or endorsed pools.
            </p>
          </div>

          <div>
            <h2
              className="font-bold mb-8"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3vw,40px)' }}
            >
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
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <div className="mb-12">
            <h2
              className="font-bold mb-3"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,4vw,52px)' }}
            >
              Built to be inspected.
            </h2>
            <p className="text-base" style={{ color: 'var(--muted)' }}>
              No platform fee · Unaudited · Arc Testnet only · No mainnet proof claimed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl p-6" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
              <p className="font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 16 }}>Try it</p>
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

            <div className="rounded-2xl p-6" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
              <p className="font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 16 }}>Inspect it</p>
              <div className="space-y-3">
                {[
                  { label: 'Source', href: 'https://github.com/aquattdabackup/HuiPot' },
                  { label: 'Specification', href: 'https://github.com/aquattdabackup/HuiPot/blob/main/docs/SPEC.md' },
                  { label: 'Contract on ArcScan', href: `https://explorer.testnet.arc.io/address/${CONTRACT_ADDRESS}` },
                ].map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent)' }}>
                    <ExternalLink className="h-3.5 w-3.5" /> {l.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-6" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
              <p className="font-semibold mb-3" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 16 }}>Status</p>
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
              <details className="mt-4">
                <summary className="cursor-pointer text-xs" style={{ color: 'var(--subtle)' }}>Contract address</summary>
                <div className="flex items-center gap-2 mt-2">
                  <span className="mono text-xs break-all" style={{ color: 'var(--muted)' }}>{CONTRACT_ADDRESS}</span>
                  <CopyButton value={CONTRACT_ADDRESS} />
                </div>
              </details>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── L6 FAQ + close ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={reduced ? {} : sectionVariants}
        className="py-24 px-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="mx-auto" style={{ maxWidth: 680 }}>
          <h2
            className="font-bold mb-10 text-center"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,3vw,36px)' }}
          >
            Questions
          </h2>
          <FaqItem q="Can I withdraw early?" a="No. Contributions are locked until the pool resolves — either by reaching the goal and payout, or by expiring past the deadline and entering refund mode." />
          <FaqItem q="What if the goal is not reached?" a="After the deadline passes with less than the full goal contributed, each contributor may claim their deposited principal back. Gas fees are not refunded." />
          <FaqItem q="Who receives the money?" a="The fixed recipient address set at pool creation. This address is immutable and cannot be changed after the pool is created." />
          <FaqItem q="Is payout automatic?" a="No. The contract rules determine eligibility. A wallet transaction explicitly triggers payout or refund. Anyone may trigger payout once the goal is met." />
          <FaqItem q="Is this mainnet?" a="The current deployment is on Arc Testnet. No mainnet proof is claimed. This is for testing and demonstration only." />

          <div className="mt-16 text-center">
            <p
              className="font-bold mb-6"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,2.5vw,28px)' }}
            >
              Your next shared goal starts here.
            </p>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 px-7 py-4 text-sm font-semibold transition-colors hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 9999 }}
            >
              Create a pool <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="px-4 py-8" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4" style={{ maxWidth: 1200 }}>
          <div className="flex items-center gap-2">
            <RingMark size={28} />
            <span className="font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 15 }}>HuiPot</span>
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
