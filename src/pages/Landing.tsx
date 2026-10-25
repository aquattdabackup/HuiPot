import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, Pause, Play, ChevronDown, Copy, Check, ExternalLink,
  CirclePlay, ShieldCheck, AlertCircle,
} from 'lucide-react'

import { HUIPOT_ADDRESS as _CONTRACT_ADDR, DEPLOYMENT_CONFIGURED } from '../contract'
const CONTRACT_ADDRESS =
  DEPLOYMENT_CONFIGURED
    ? _CONTRACT_ADDR
    : '0x81a139599d252eb2dc2bbb6c267e911a21264288'

// ─── RingMark (exported for AppHeader) ───────────────────────────────────────
export function RingMark({ size = 28 }: { size?: number }) {
  const r = size * 0.42
  const cx = size / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#2B3B30" strokeWidth={size * 0.1} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke="#D2FA69" strokeWidth={size * 0.1}
        strokeDasharray={circ} strokeDashoffset={circ * 0.6}
        strokeLinecap="round"
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cx}px` }}
      />
    </svg>
  )
}

// ─── Orbit SVG overlay (behind torus) ────────────────────────────────────────
function OrbitLines({ paused, uid }: { paused: boolean; uid: string }) {
  if (paused) return null
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 560 560"
      aria-hidden="true"
      style={{ zIndex: 2 }}
    >
      <ellipse
        cx="280" cy="280" rx="230" ry="55" fill="none"
        stroke="rgba(210,250,105,0.08)" strokeWidth="1"
        style={{
          transformOrigin: '280px 280px',
          animation: paused ? 'none' : `orbit-${uid}-a 18s linear infinite`,
        }}
      />
      <ellipse
        cx="280" cy="280" rx="200" ry="45" fill="none"
        stroke="rgba(210,250,105,0.05)" strokeWidth="1"
        style={{
          transformOrigin: '280px 280px',
          transform: 'rotateX(65deg) rotateZ(45deg)',
          animation: paused ? 'none' : `orbit-${uid}-b 24s linear infinite reverse`,
        }}
      />
      <style>{`
        @keyframes orbit-${uid}-a { from { transform: rotateX(72deg) rotateZ(0deg); } to { transform: rotateX(72deg) rotateZ(360deg); } }
        @keyframes orbit-${uid}-b { from { transform: rotateX(65deg) rotateZ(45deg); } to { transform: rotateX(65deg) rotateZ(405deg); } }
      `}</style>
    </svg>
  )
}

// ─── Torus scene (raster image + HTML labels in hole) ────────────────────────
function TorusScene({
  size,
  motionPaused,
  showChips = true,
}: {
  size: number
  motionPaused: boolean
  showChips?: boolean
}) {
  const reduced = useReducedMotion()
  const pause = reduced || motionPaused
  const uid = useId().replace(/:/g, '')

  // Float animation: 6px vertical over 8s
  const floatStyle: React.CSSProperties = pause ? {} : {
    animation: `float-${uid} 8s ease-in-out infinite`,
  }

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      aria-label="Illustrative torus showing 40% of goal reached"
    >
      <style>{`
        @keyframes float-${uid} {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Orbit lines behind torus */}
      <OrbitLines paused={pause} uid={uid + 'o'} />

      {/* Torus image */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 3, ...floatStyle }}
      >
        <img
          src="/art/huipot/torus.png"
          alt=""
          width={size}
          height={size}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            // Drop shadow for environmental grounding
            filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.7)) drop-shadow(0 0 32px rgba(210,250,105,0.08))',
          }}
          draggable={false}
        />

        {/* Center hole label — positioned inside the hole (~middle third) */}
        <div
          className="absolute flex flex-col items-center justify-center"
          style={{
            // hole is approx 35-65% of the image square
            top: '36%', left: '36%', right: '36%', bottom: '36%',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <p
            className="tabular-nums font-bold leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: size > 400 ? '1.5rem' : '1rem',
              color: '#F2F5EA',
              textShadow: '0 1px 8px rgba(0,0,0,0.8)',
            }}
          >
            0.40<span style={{ color: '#A1B1A5', fontWeight: 400 }}> / 1.00</span>
          </p>
          <p
            className="mt-0.5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: size > 400 ? '0.75rem' : '0.6rem',
              color: '#A1B1A5',
              letterSpacing: '0.06em',
            }}
          >
            USDC
          </p>
          {size > 300 && (
            <div
              className="mt-2 rounded-full"
              style={{
                width: '60%', height: 3,
                background: '#2B3B30',
                overflow: 'hidden',
              }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: '40%', background: '#D2FA69' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Chips — only in hero */}
      {showChips && (
        <>
          {/* +0.40 USDC chip — upper left of scene */}
          <div
            className="absolute flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
            style={{
              top: '8%', left: '-4%',
              background: 'rgba(20,29,23,0.88)',
              border: '1px solid rgba(210,250,105,0.25)',
              backdropFilter: 'blur(8px)',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D2FA69', display: 'inline-block' }} />
            <span className="tabular-nums text-xs font-semibold" style={{ color: '#D2FA69' }}>+0.40 USDC</span>
          </div>
          {/* 0.60 to go chip — upper right */}
          <div
            className="absolute flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
            style={{
              top: '16%', right: '-4%',
              background: 'rgba(20,29,23,0.88)',
              border: '1px solid rgba(43,59,48,0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <span className="text-xs" style={{ color: '#A1B1A5' }}>0.60 to go</span>
          </div>
        </>
      )}

      {/* Illustrative notice below scene */}
      {showChips && (
        <p
          className="absolute text-center"
          style={{
            bottom: '-24px', left: 0, right: 0,
            fontSize: '0.65rem',
            color: 'rgba(115,135,122,0.8)',
            pointerEvents: 'none',
          }}
        >
          Illustrative demo · No funds moved
        </p>
      )}
    </div>
  )
}

// ─── Outcome Diagram ──────────────────────────────────────────────────────────
function OutcomeDiagram({ activeTab }: { activeTab: 'success' | 'failure' }) {
  return (
    <svg
      viewBox="0 0 260 200"
      className="w-full max-w-xs mx-auto"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* Top ring node */}
      <circle cx="130" cy="24" r="18" fill="none" stroke="#2B3B30" strokeWidth="2" />
      <circle cx="130" cy="24" r="18" fill="none" stroke="#D2FA69" strokeWidth="2"
        strokeDasharray={`${2 * Math.PI * 18 * 0.4} ${2 * Math.PI * 18 * 0.6}`}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '130px 24px' }}
      />
      <text x="130" y="29" textAnchor="middle" fontSize="9" fill="#A1B1A5" fontFamily="sans-serif">pool</text>

      {/* Stem */}
      <line x1="130" y1="42" x2="130" y2="70" stroke="#2B3B30" strokeWidth="1.5" />

      {/* Fork */}
      <line x1="130" y1="70" x2="60" y2="108"
        stroke={activeTab === 'success' ? '#D2FA69' : '#2B3B30'} strokeWidth="1.5" />
      <line x1="130" y1="70" x2="200" y2="108"
        stroke={activeTab === 'failure' ? '#FFD38B' : '#2B3B30'} strokeWidth="1.5" />

      {/* Goal reached node */}
      <circle cx="60" cy="120" r="16"
        fill={activeTab === 'success' ? 'rgba(210,250,105,0.12)' : 'none'}
        stroke={activeTab === 'success' ? '#D2FA69' : '#2B3B30'} strokeWidth="1.5" />
      <text x="60" y="123" textAnchor="middle" fontSize="11"
        fill={activeTab === 'success' ? '#D2FA69' : '#73877A'} fontFamily="sans-serif">✓</text>

      {/* Deadline missed node */}
      <circle cx="200" cy="120" r="16"
        fill={activeTab === 'failure' ? 'rgba(255,211,139,0.1)' : 'none'}
        stroke={activeTab === 'failure' ? '#FFD38B' : '#2B3B30'} strokeWidth="1.5" />
      <text x="200" y="123" textAnchor="middle" fontSize="11"
        fill={activeTab === 'failure' ? '#FFD38B' : '#73877A'} fontFamily="sans-serif">×</text>

      {/* Labels */}
      <text x="60" y="148" textAnchor="middle" fontSize="9"
        fill={activeTab === 'success' ? '#D2FA69' : '#73877A'} fontFamily="sans-serif">Goal reached</text>
      <text x="60" y="160" textAnchor="middle" fontSize="8" fill="#73877A" fontFamily="sans-serif">payout available</text>
      <text x="200" y="148" textAnchor="middle" fontSize="9"
        fill={activeTab === 'failure' ? '#FFD38B' : '#73877A'} fontFamily="sans-serif">Deadline missed</text>
      <text x="200" y="160" textAnchor="middle" fontSize="8" fill="#73877A" fontFamily="sans-serif">refund available</text>

      {/* Fine print */}
      <text x="130" y="190" textAnchor="middle" fontSize="7.5" fill="#73877A" fontFamily="sans-serif">
        Refunds claimed, not automatic · No early withdrawal
      </text>
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
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 })
    if (sectionRef.current) obs.observe(sectionRef.current)
    return () => obs.disconnect()
  }, [])

  function switchTab(t: WalkthroughTab) {
    setTab(t)
    setSuccessStep('start')
    setFailureStep('start')
  }

  // Stop any decorative animation when section is offscreen
  const sectionPaused = motionPaused || !visible || !!reduced

  return (
    <section
      id="walkthrough"
      ref={sectionRef}
      className="relative overflow-hidden py-24 px-4"
      style={{ minHeight: 480 }}
    >
      {/* Outcomes atmosphere background */}
      <img
        src="/art/huipot/outcomes-atmosphere.png"
        alt=""
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', objectPosition: 'center bottom', zIndex: 0, opacity: 0.85 }}
        loading="lazy"
        draggable={false}
      />
      {/* Top fade blending into previous section */}
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, var(--canvas), transparent)', zIndex: 1 }}
      />
      {/* Bottom fade */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--canvas), transparent)', zIndex: 1 }}
      />

      <div className="relative mx-auto max-w-5xl" style={{ zIndex: 2 }}>
        {/* Heading — left aligned per concept */}
        <div className="mb-10 max-w-md">
          <h2
            className="display font-bold leading-tight mb-3"
            style={{ color: 'var(--ink)', fontSize: 'clamp(32px, 4vw, 52px)' }}
          >
            One goal.<br />Two clear outcomes.
          </h2>
          <p className="text-sm" style={{ color: 'rgba(255,211,139,0.9)', background: 'rgba(48,36,20,0.7)', display: 'inline-block', padding: '4px 10px', borderRadius: 6 }}>
            Illustration only — no wallet, no funds moved.
          </p>
        </div>

        {/* Split: left tabs+controls, right outcome diagram */}
        <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
          {/* Left: tabs + active step */}
          <div>
            {/* Tabs */}
            <div className="flex gap-1 rounded-xl p-1 mb-6" style={{ background: 'rgba(28,41,32,0.85)', maxWidth: 320, backdropFilter: 'blur(8px)' }}>
              {(['success', 'failure'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
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

            {/* Steps */}
            <div className="space-y-4 max-w-sm">
              <AnimatePresence mode="wait" initial={!sectionPaused}>
                {tab === 'success' ? (
                  <motion.div
                    key={`success-${successStep}`}
                    initial={reduced ? undefined : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-3"
                  >
                    {successStep === 'start' && (
                      <>
                        <div className="rounded-xl p-4" style={{ background: 'rgba(28,41,32,0.88)', border: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>
                          <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>Progress</p>
                          <p className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>0.40 / 1.00 USDC</p>
                          <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>40% — goal not yet reached.</p>
                        </div>
                        <button
                          onClick={() => setSuccessStep('funded')}
                          className="w-full rounded-xl py-3 text-sm font-semibold"
                          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                        >Add 0.60 demo USDC</button>
                      </>
                    )}
                    {successStep === 'funded' && (
                      <>
                        <div className="rounded-xl p-4" style={{ background: 'rgba(28,41,32,0.88)', border: '1px solid var(--accent)', backdropFilter: 'blur(8px)' }}>
                          <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent)' }}>Goal reached — payout available</p>
                          <p className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>1.00 / 1.00 USDC</p>
                          <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>Anyone may trigger payout.</p>
                        </div>
                        <button onClick={() => setSuccessStep('paid')} className="w-full rounded-xl py-3 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>Simulate payout</button>
                      </>
                    )}
                    {successStep === 'paid' && (
                      <>
                        <div className="rounded-xl p-4" style={{ background: 'rgba(29,48,32,0.9)', border: '1px solid rgba(200,244,170,0.3)', backdropFilter: 'blur(8px)' }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--success-text)' }}>Payout complete</p>
                          <p className="text-sm" style={{ color: 'var(--success-text)' }}>1.00 USDC → <strong>Fixed recipient</strong></p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: 'rgba(28,41,32,0.75)', border: '1px dashed var(--border)', backdropFilter: 'blur(8px)' }}>
                          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--accent)', letterSpacing: '0.06em' }}>ILLUSTRATIVE RECEIPT</p>
                          <dl className="space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                            <div className="flex justify-between"><dt>Event</dt><dd style={{ color: 'var(--ink)' }}>PaidOut</dd></div>
                            <div className="flex justify-between"><dt>Amount</dt><dd style={{ color: 'var(--ink)' }}>1.000000 USDC</dd></div>
                            <div className="flex justify-between"><dt>To</dt><dd style={{ color: 'var(--ink)' }}>Fixed recipient</dd></div>
                          </dl>
                        </div>
                        <button onClick={() => setSuccessStep('start')} className="w-full rounded-xl py-2.5 text-sm" style={{ background: 'rgba(28,41,32,0.8)', color: 'var(--muted)', border: '1px solid var(--border)' }}>Reset and replay</button>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`failure-${failureStep}`}
                    initial={reduced ? undefined : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-3"
                  >
                    {failureStep === 'start' && (
                      <>
                        <div className="rounded-xl p-4" style={{ background: 'rgba(28,41,32,0.88)', border: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>
                          <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>Progress</p>
                          <p className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>0.40 / 1.00 USDC</p>
                          <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>40% — deadline approaching.</p>
                        </div>
                        <button onClick={() => setFailureStep('expired')} className="w-full rounded-xl py-3 text-sm font-semibold" style={{ background: 'rgba(28,41,32,0.88)', color: 'var(--muted)', border: '1px solid var(--border-strong)', backdropFilter: 'blur(8px)' }}>Advance demo deadline</button>
                      </>
                    )}
                    {failureStep === 'expired' && (
                      <>
                        <div className="rounded-xl p-4" style={{ background: 'rgba(48,36,20,0.88)', border: '1px solid rgba(255,211,139,0.3)', backdropFilter: 'blur(8px)' }}>
                          <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--warning-text)' }}>Goal not reached — refund available</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--warning-text)' }}>Deadline passed at 0.40/1.00. Claim your deposit back.</p>
                        </div>
                        <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(28,41,32,0.75)', color: 'var(--muted)' }}>Refunds must be claimed. Fees are not refunded.</div>
                        <button onClick={() => setFailureStep('refunded')} className="w-full rounded-xl py-3 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>Simulate refund claim</button>
                      </>
                    )}
                    {failureStep === 'refunded' && (
                      <>
                        <div className="rounded-xl p-4" style={{ background: 'rgba(29,48,32,0.9)', border: '1px solid rgba(200,244,170,0.3)', backdropFilter: 'blur(8px)' }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--success-text)' }}>Refund confirmed</p>
                          <p className="text-sm" style={{ color: 'var(--success-text)' }}>0.40 USDC → <strong>Contributor</strong>. Network fee charged.</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: 'rgba(28,41,32,0.75)', border: '1px dashed var(--border)', backdropFilter: 'blur(8px)' }}>
                          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--accent)', letterSpacing: '0.06em' }}>ILLUSTRATIVE RECEIPT</p>
                          <dl className="space-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                            <div className="flex justify-between"><dt>Event</dt><dd style={{ color: 'var(--ink)' }}>Refunded</dd></div>
                            <div className="flex justify-between"><dt>Amount</dt><dd style={{ color: 'var(--ink)' }}>0.400000 USDC</dd></div>
                            <div className="flex justify-between"><dt>To</dt><dd style={{ color: 'var(--ink)' }}>Contributor</dd></div>
                          </dl>
                        </div>
                        <button onClick={() => setFailureStep('start')} className="w-full rounded-xl py-2.5 text-sm" style={{ background: 'rgba(28,41,32,0.8)', color: 'var(--muted)', border: '1px solid var(--border)' }}>Reset and replay</button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: outcome diagram */}
          <div className="hidden md:flex flex-col items-center justify-start pt-10">
            <OutcomeDiagram activeTab={tab} />
          </div>
        </div>

        {/* CTA below */}
        <div className="mt-12">
          <Link
            to="/pools"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
            style={{ background: 'rgba(28,41,32,0.9)', color: 'var(--ink)', border: '1px solid var(--border-strong)', backdropFilter: 'blur(8px)' }}
          >
            Explore testnet pools <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-xs" style={{ color: 'var(--subtle)' }}>
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
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--muted)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
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
      className="shrink-0 rounded-lg p-1.5" style={{ color: 'var(--muted)' }}
      aria-label="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5" style={{ color: 'var(--success-text)' }} /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ─── Main Landing ─────────────────────────────────────────────────────────────
export function Landing() {
  const [motionPaused, setMotionPaused] = useState(false)
  const reduced = useReducedMotion()
  const heroRef = useRef<HTMLDivElement>(null)
  const [heroVisible, setHeroVisible] = useState(true)

  // Stop hero when offscreen or tab hidden
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0 })
    if (heroRef.current) obs.observe(heroRef.current)
    const onVis = () => { if (document.hidden) setHeroVisible(false); else setHeroVisible(true) }
    document.addEventListener('visibilitychange', onVis)
    return () => { obs.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  const handlePauseToggle = useCallback(() => setMotionPaused((p) => !p), [])
  const heroPaused = motionPaused || !heroVisible || !!reduced

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } },
  }

  return (
    <div style={{ background: 'var(--canvas)' }}>
      {/* Skip link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
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
      <section
        id="main-content"
        ref={heroRef}
        className="relative overflow-hidden"
        style={{ minHeight: 'clamp(580px, 65vh, 720px)', background: '#0B100E' }}
        aria-label="Hero"
      >
        {/* Background atmosphere */}
        <img
          src="/art/huipot/hero-atmosphere.png"
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center bottom', zIndex: 0 }}
          fetchPriority="high"
          draggable={false}
        />
        {/* Left scrim — protect copy legibility */}
        <div
          className="absolute inset-y-0 left-0 pointer-events-none"
          style={{
            width: '55%',
            background: 'linear-gradient(to right, rgba(11,16,14,0.92) 0%, rgba(11,16,14,0.70) 60%, transparent 100%)',
            zIndex: 1,
          }}
        />
        {/* Bottom fade into How-it-works band */}
        <div
          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--canvas), transparent)', zIndex: 1 }}
        />

        {/* Content */}
        <div className="relative mx-auto px-8 h-full flex items-center" style={{ maxWidth: 1200, zIndex: 2 }}>
          <div className="grid w-full items-center gap-10"
            style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,auto)' }}>

            {/* ── Copy column ── */}
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ maxWidth: 560, paddingTop: 80, paddingBottom: 80 }}
            >
              <p className="mb-4 text-xs font-semibold tracking-widest" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>
                SHARED GOALS. CLEAR RULES.
              </p>
              <h1
                className="display font-bold mb-6"
                style={{
                  color: 'var(--ink)',
                  fontSize: 'clamp(48px, 6.5vw, 100px)',
                  lineHeight: 1.01,
                  maxWidth: '12ch',
                  textShadow: '0 2px 16px rgba(0,0,0,0.5)',
                }}
              >
                Pool together.{' '}
                <br />
                Make it{' '}
                <span style={{ color: 'var(--accent)' }}>happen.</span>
              </h1>
              <p className="mb-8 text-lg leading-relaxed" style={{ color: '#C4D4C8', maxWidth: '48ch', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
                Pool USDC for one shared goal. Reach the target to make the funds payable
                to a fixed recipient. Miss the deadline and each contributor can claim
                their deposit back.
              </p>
              <div className="flex flex-wrap gap-3 mb-5">
                <Link
                  to="/create"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-colors hover:opacity-90"
                  style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
                >
                  Create a pool <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#walkthrough"
                  className="inline-flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-colors"
                  style={{ color: 'var(--ink)' }}
                >
                  <CirclePlay className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  Try the walkthrough
                </a>
              </div>
              <p className="text-xs" style={{ color: 'rgba(115,135,122,0.9)' }}>
                No platform fee · Network fees apply
              </p>
            </motion.div>

            {/* ── Scene column ── */}
            <motion.div
              initial={reduced ? undefined : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="hidden md:flex justify-center items-center"
              style={{ paddingTop: 40, paddingBottom: 40 }}
            >
              <TorusScene
                size={520}
                motionPaused={heroPaused}
                showChips={true}
              />
            </motion.div>
          </div>
        </div>

        {/* Mobile scene — below copy */}
        <div
          className="md:hidden relative mx-auto px-4 pb-10 flex justify-center"
          style={{ zIndex: 2 }}
        >
          <TorusScene
            size={Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 40 : 320)}
            motionPaused={heroPaused}
            showChips={true}
          />
        </div>
      </section>

      {/* ── L2 How it works ── */}
      <motion.section
        id="how-it-works"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={reduced ? {} : sectionVariants}
        className="py-16 px-4"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-0">
            {[
              { n: '01', title: 'Set the terms.', body: 'Choose one target, deadline and fixed recipient.' },
              { n: '02', title: 'Pool your USDC.', body: 'Share the link and contribute toward the exact goal.' },
              { n: '03', title: 'Payout or refund.', body: 'Reach the goal to make payout available; otherwise contributors claim refunds after the deadline.' },
            ].map((step, i) => (
              <div
                key={step.n}
                className="flex gap-5 px-8 py-7"
                style={{ borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}
              >
                {/* Outlined circle number */}
                <div
                  className="shrink-0 flex items-center justify-center rounded-full"
                  style={{
                    width: 36, height: 36,
                    border: '1.5px solid var(--accent)',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  {step.n}
                </div>
                <div>
                  <h3 className="display text-base font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-center" style={{ color: 'var(--subtle)' }}>
            Terms cannot be changed after creation.
          </p>
        </div>
      </motion.section>

      {/* ── L3 Walkthrough ── */}
      <Walkthrough motionPaused={motionPaused} />

      {/* ── L4 Use cases + commitment ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={reduced ? {} : sectionVariants}
        className="py-24 px-4"
      >
        <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-16 items-start">
          {/* Use cases — hairline rows */}
          <div>
            <h2 className="display text-3xl font-bold mb-8" style={{ color: 'var(--ink)' }}>
              For the things you do together.
            </h2>
            <div>
              {[
                { title: 'Community workshop', body: 'Pool for shared recording equipment. Funds reach the vendor once the target is met.' },
                { title: 'Shared team tools', body: 'Split software costs among remote collaborators with clear, auditable accountability.' },
                { title: 'Creative collaboration', body: 'Fund a joint project with transparent terms — every contributor knows exactly what they committed to.' },
              ].map((uc, i) => (
                <div
                  key={uc.title}
                  className="py-5"
                  style={{ borderTop: i === 0 ? '1px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)' }}
                >
                  <h3 className="display text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>{uc.title}</h3>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>{uc.body}</p>
                </div>
              ))}
              <p className="mt-4 text-xs" style={{ color: 'var(--subtle)' }}>
                Illustrative examples, not active or endorsed pools.
              </p>
            </div>
          </div>

          {/* Commitment rules */}
          <div>
            <h2 className="display text-3xl font-bold mb-8" style={{ color: 'var(--ink)' }}>
              Know the commitment.
            </h2>
            <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--warning-bg)', border: '1px solid rgba(255,211,139,0.2)' }}>
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
            <h2 className="display text-4xl font-bold mb-3" style={{ color: 'var(--ink)' }}>Built to be inspected.</h2>
            <p className="text-base" style={{ color: 'var(--muted)' }}>No platform fee · Unaudited · Arc Testnet only · No mainnet proof claimed.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl p-6" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
              <p className="display text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>Try it</p>
              <div className="space-y-3">
                <a href="#walkthrough" className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent)' }}><ArrowRight className="h-3.5 w-3.5" /> Walkthrough</a>
                <Link to="/pools" className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent)' }}><ArrowRight className="h-3.5 w-3.5" /> Real pool lookup</Link>
                <p className="text-xs mt-2" style={{ color: 'var(--subtle)' }}>No wallet required for reads.</p>
              </div>
            </div>
            <div className="rounded-2xl p-6" style={{ background: 'var(--raised)', border: '1px solid var(--border)' }}>
              <p className="display text-lg font-semibold mb-3" style={{ color: 'var(--ink)' }}>Inspect it</p>
              <div className="space-y-3">
                {[
                  { label: 'Source', href: 'https://github.com/aquattdabackup/HuiPot' },
                  { label: 'Specification', href: 'https://github.com/aquattdabackup/HuiPot/blob/main/docs/SPEC.md' },
                  { label: 'Contract on ArcScan', href: `https://explorer.testnet.arc.io/address/${CONTRACT_ADDRESS}` },
                ].map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent)' }}>
                    <ExternalLink className="h-3.5 w-3.5" /> {l.label}
                  </a>
                ))}
              </div>
            </div>
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
                      {ok ? <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--success-text)' }} /> : <AlertCircle className="h-3.5 w-3.5" style={{ color: 'var(--warning-text)' }} />}
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
        <div className="mx-auto max-w-2xl">
          <h2 className="display text-3xl font-bold mb-10 text-center" style={{ color: 'var(--ink)' }}>Questions</h2>
          <div>
            <FaqItem q="Can I withdraw early?" a="No. Contributions are locked until the pool resolves — either by reaching the goal and payout, or by expiring past the deadline and entering refund mode." />
            <FaqItem q="What if the goal is not reached?" a="After the deadline passes with less than the full goal contributed, each contributor may claim their deposited principal back. Gas fees are not refunded." />
            <FaqItem q="Who receives the money?" a="The fixed recipient address set at pool creation. This address is immutable and cannot be changed after the pool is created." />
            <FaqItem q="Is payout automatic?" a="No. The contract rules determine eligibility. A wallet transaction explicitly triggers payout or refund. Anyone may trigger payout once the goal is met." />
            <FaqItem q="Is this mainnet?" a="The current deployment is on Arc Testnet. No mainnet proof is claimed. This is for testing and demonstration only." />
          </div>
          <div className="mt-16 text-center">
            <p className="display text-2xl font-bold mb-6" style={{ color: 'var(--ink)' }}>Your next shared goal starts here.</p>
            <Link to="/create" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold hover:opacity-90" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              Create a pool <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="px-4 py-8" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <RingMark size={24} />
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
