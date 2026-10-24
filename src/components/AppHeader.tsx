import { ConnectKitButton } from 'connectkit'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { arcTestnet } from '../config'

export function AppHeader() {
  const { chainId } = useAccount()
  const wrongChain = chainId !== undefined && chainId !== arcTestnet.id

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div
            className="display flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            HP
          </div>
          <div>
            <span className="display text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              HuiPot
            </span>
            <span className="ml-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              Goal Pool
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {wrongChain && (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}
            >
              Wrong network
            </span>
          )}
          {!wrongChain && chainId === arcTestnet.id && (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}
            >
              Arc Testnet
            </span>
          )}
          <ConnectKitButton />
        </div>
      </div>
    </header>
  )
}
