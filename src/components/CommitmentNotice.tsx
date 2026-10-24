import { AlertTriangle } from 'lucide-react'

export function CommitmentNotice() {
  return (
    <div
      className="rounded-xl p-4 text-sm leading-relaxed"
      style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}
    >
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p>
            Contributions are locked. If the goal is reached before the deadline, anyone can send
            the full pool to the fixed recipient immediately. If the goal is not reached, you can
            claim your deposit after the deadline. Network fees are not refunded. The pool does not
            guarantee delivery of the stated purpose.
          </p>
          <p className="text-xs opacity-80">
            If the fixed recipient cannot accept native USDC transfers, payout may fail and funds
            may be locked indefinitely. Verify the recipient address before contributing.
          </p>
        </div>
      </div>
    </div>
  )
}
