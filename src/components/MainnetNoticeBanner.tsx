import { IS_MAINNET } from '../config'
import { AlertTriangle } from 'lucide-react'

/**
 * MainnetNoticeBanner — shown on every page in mainnet builds.
 *
 * Discloses that transactions use real funds. Does NOT claim the contract
 * has been audited or that MetaMask/any tool has cleared the site.
 */
export function MainnetNoticeBanner() {
  if (!IS_MAINNET) return null
  return (
    <div
      className="w-full px-4 py-2.5 text-center text-xs"
      style={{ background: 'rgba(255,180,0,0.12)', color: '#b38000', borderBottom: '1px solid rgba(255,180,0,0.25)' }}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Arc mainnet — transactions use real USDC. This application has not been independently
        audited. Use at your own risk and only with funds you can afford to lose.
      </span>
    </div>
  )
}
