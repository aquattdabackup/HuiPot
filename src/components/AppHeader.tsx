import { useState, useEffect } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Link, useLocation } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { Menu, X } from 'lucide-react'
import { arcTestnet } from '../config'

export function AppHeader() {
  const { chainId } = useAccount()
  const location = useLocation()
  const isLanding = location.pathname === '/'
  const wrongChain = chainId !== undefined && chainId !== arcTestnet.id
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Trap focus and Escape in mobile menu
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const networkBadge = wrongChain ? (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}
    >
      Wrong network
    </span>
  ) : (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: 'rgba(210,250,105,0.12)', color: 'var(--accent)', border: '1px solid rgba(210,250,105,0.2)' }}
    >
      Arc Testnet
    </span>
  )

  if (isLanding) {
    // Landing header: brand + nav links + Arc badge + CTA
    return (
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(11,16,14,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div
              className="display flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              HP
            </div>
            <span className="display text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              HuiPot
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <a href="#how-it-works" className="text-sm" style={{ color: 'var(--muted)' }}>How it works</a>
            <Link to="/pools" className="text-sm" style={{ color: 'var(--muted)' }}>Explore pools</Link>
            <a href="#for-judges" className="text-sm" style={{ color: 'var(--muted)' }}>For judges</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {networkBadge}
            <Link
              to="/pools"
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
            >
              Open app
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden rounded-lg p-2"
            style={{ color: 'var(--muted)' }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden px-4 pb-5 pt-3 space-y-4"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
            role="menu"
          >
            <a href="#how-it-works" className="block py-2 text-sm" style={{ color: 'var(--ink)' }} onClick={() => setMenuOpen(false)}>How it works</a>
            <Link to="/pools" className="block py-2 text-sm" style={{ color: 'var(--ink)' }}>Explore pools</Link>
            <a href="#for-judges" className="block py-2 text-sm" style={{ color: 'var(--ink)' }} onClick={() => setMenuOpen(false)}>For judges</a>
            <div className="flex items-center gap-3 pt-2">
              {networkBadge}
              <ConnectKitButton />
            </div>
          </div>
        )}
      </header>
    )
  }

  // App header: brand + nav + network badge + wallet
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(20,29,23,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div
            className="display flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            HP
          </div>
          <span className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
            HuiPot
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5" aria-label="App navigation">
          <Link to="/pools" className="text-sm" style={{ color: 'var(--muted)' }}>Explore pools</Link>
          <Link to="/create" className="text-sm" style={{ color: 'var(--muted)' }}>Create a pool</Link>
        </nav>

        <div className="flex items-center gap-3">
          {networkBadge}
          <div className="hidden md:block">
            <ConnectKitButton />
          </div>
          {/* Mobile menu toggle */}
          <button
            className="md:hidden rounded-lg p-2"
            style={{ color: 'var(--muted)' }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-4 pb-5 pt-3 space-y-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
          role="menu"
        >
          <Link to="/pools" className="block py-2 text-sm" style={{ color: 'var(--ink)' }}>Explore pools</Link>
          <Link to="/create" className="block py-2 text-sm" style={{ color: 'var(--ink)' }}>Create a pool</Link>
          <div className="pt-2">
            <ConnectKitButton />
          </div>
        </div>
      )}
    </header>
  )
}
