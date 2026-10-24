import { useAccount, useSwitchChain } from 'wagmi'
import { arcTestnet } from '../config'
import { AlertTriangle } from 'lucide-react'

export function WrongChainBanner() {
  const { chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  if (!isConnected || chainId === arcTestnet.id) return null

  return (
    <div
      className="mx-auto mt-4 flex max-w-5xl items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm"
      style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          You are connected to the wrong network. Please switch to <strong>Arc Testnet</strong>.
        </span>
      </div>
      <button
        onClick={() => switchChain({ chainId: arcTestnet.id })}
        disabled={isPending}
        className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ background: 'var(--warning-text)', color: '#fff' }}
      >
        {isPending ? 'Switching…' : 'Switch Network'}
      </button>
    </div>
  )
}
