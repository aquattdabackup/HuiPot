/**
 * validateReceipt — pure async function, no React dependencies.
 * Extracted from Pool.tsx so it can be unit-tested without a browser/wagmi environment.
 *
 * Validates a confirmed on-chain transaction receipt against a review snapshot:
 *   confirmed — receipt matches expected action/pool/amount/identity
 *   replaced  — tx confirmed but no matching event (replacement/cancel)
 *   error     — revert, transport failure, or RPC error (retryable)
 *
 * RC2: validates submitting identity (contributor/caller) from event log topics.
 * RC5: checks resp.ok and JSON-RPC error field before accepting any receipt data.
 */

export type ActionType = 'contribute' | 'payout' | 'refund'

export interface ReceiptSnapshot {
  action: ActionType
  amount: bigint          // native 18-dec
  recipient: string       // for payout: fixed recipient; for refund/contribute: caller wallet
  poolId: string
  contractAddress: string
  accountAddress: string
}

// ABI event topics for receipt validation — verified against deployed bytecode at
// 0x81a139599d252eb2dc2bbb6c267e911a21264288 (see docs/STUDIO_RECEIPT_RECHECK.md)
export const PAID_OUT_TOPIC    = '0x648ae074e8c7e2b5c75fc82672c363a1b0fa293a1ce08cba5e9dbeec37eb8ae8'
export const REFUNDED_TOPIC    = '0x7ca5472b7ea78c2c0141c5a12ee6d170cf4ce8ed06be3d22c8252ddfc7a6a2c4'
export const CONTRIBUTED_TOPIC = '0xdcfa71ee125a676f843733d9d39dce2c918ecf9e92f96db4f24bdb5244ed68a0'

// JSON-RPC receipt shape
interface RpcReceiptLog { address: string; topics: string[]; data: string }
interface RpcReceipt { status: string; to: string | null; logs: RpcReceiptLog[] }
interface RpcResponse { result?: RpcReceipt | null; error?: { code: number; message: string } }

export type ReceiptOutcome = 'confirmed' | 'replaced' | 'error'

export async function validateReceipt(
  txHash: string,
  snap: ReceiptSnapshot,
  rpcUrl: string,
): Promise<{ outcome: ReceiptOutcome; note: string }> {
  try {
    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionReceipt', params: [txHash], id: 1 }),
    })

    // RC5: reject non-2xx transport responses
    if (!resp.ok) {
      return { outcome: 'error', note: `HTTP ${resp.status} from RPC endpoint.` }
    }

    const json = await resp.json() as RpcResponse

    // RC5: reject JSON-RPC level errors
    if (json.error) {
      return { outcome: 'error', note: `RPC error ${json.error.code}: ${json.error.message}` }
    }

    const receipt = json.result
    if (!receipt) return { outcome: 'error', note: 'Receipt not found — transaction may still be pending.' }

    // RC3: surface revert
    if (receipt.status !== '0x1') return { outcome: 'error', note: 'Transaction reverted (status 0x0).' }

    // Check contract target
    const contractMatch = (receipt.to ?? '').toLowerCase() === snap.contractAddress.toLowerCase()
    if (!contractMatch) {
      return { outcome: 'replaced', note: `Transaction reached a different contract (${receipt.to ?? '–'}) — not this deployment.` }
    }

    const contractLogs = receipt.logs.filter(
      (l) => l.address.toLowerCase() === snap.contractAddress.toLowerCase()
    )

    if (snap.action === 'contribute') {
      const log = contractLogs.find((l) => l.topics[0] === CONTRIBUTED_TOPIC)
      if (!log) return { outcome: 'replaced', note: 'No Contributed event from this contract — transaction may have been replaced or cancelled.' }
      const logPoolId = BigInt(log.topics[1] ?? '0x0').toString()
      // RC2: contributor address is topics[2] (indexed address param)
      const logContributor = '0x' + (log.topics[2] ?? '').slice(-40)
      const logAmount = BigInt('0x' + log.data.slice(2, 66))
      if (logPoolId !== snap.poolId) {
        return { outcome: 'replaced', note: `Contributed event is for pool #${logPoolId}, not pool #${snap.poolId}.` }
      }
      if (logAmount !== snap.amount) {
        return { outcome: 'replaced', note: `Contributed amount (${logAmount}) does not match review amount (${snap.amount}).` }
      }
      // RC2: submitting identity — contributor in event must match the wallet that submitted
      if (logContributor.toLowerCase() !== snap.accountAddress.toLowerCase()) {
        return { outcome: 'replaced', note: `Contributed event contributor (${logContributor}) does not match submitting wallet (${snap.accountAddress}).` }
      }
      return { outcome: 'confirmed', note: '' }

    } else if (snap.action === 'payout') {
      const log = contractLogs.find((l) => l.topics[0] === PAID_OUT_TOPIC)
      if (!log) return { outcome: 'replaced', note: 'No PaidOut event from this contract — transaction may have been replaced or cancelled.' }
      const logPoolId = BigInt(log.topics[1] ?? '0x0').toString()
      // RC2: PaidOut topics: [topic0, poolId, caller, recipient]; bind caller to snap.accountAddress
      const logCaller = '0x' + (log.topics[2] ?? '').slice(-40)
      const logRecipient = '0x' + (log.topics[3] ?? '').slice(-40)
      const logAmount = BigInt(log.data || '0x0')
      if (logPoolId !== snap.poolId) {
        return { outcome: 'replaced', note: `PaidOut event is for pool #${logPoolId}, not pool #${snap.poolId}.` }
      }
      // RC2: caller in event must match the wallet that submitted this review
      if (logCaller.toLowerCase() !== snap.accountAddress.toLowerCase()) {
        return { outcome: 'replaced', note: `PaidOut caller (${logCaller}) does not match submitting wallet (${snap.accountAddress}).` }
      }
      if (logRecipient.toLowerCase() !== snap.recipient.toLowerCase()) {
        return { outcome: 'replaced', note: `PaidOut recipient (${logRecipient}) does not match expected (${snap.recipient}).` }
      }
      if (logAmount !== snap.amount) {
        return { outcome: 'replaced', note: `PaidOut amount (${logAmount}) does not match pool target (${snap.amount}).` }
      }
      return { outcome: 'confirmed', note: '' }

    } else if (snap.action === 'refund') {
      const log = contractLogs.find((l) => l.topics[0] === REFUNDED_TOPIC)
      if (!log) return { outcome: 'replaced', note: 'No Refunded event from this contract — transaction may have been replaced or cancelled.' }
      const logPoolId = BigInt(log.topics[1] ?? '0x0').toString()
      const logContributor = '0x' + (log.topics[2] ?? '').slice(-40)
      const logAmount = BigInt(log.data || '0x0')
      if (logPoolId !== snap.poolId) {
        return { outcome: 'replaced', note: `Refunded event is for pool #${logPoolId}, not pool #${snap.poolId}.` }
      }
      // RC2: contributor identity must match submitting wallet
      if (logContributor.toLowerCase() !== snap.accountAddress.toLowerCase()) {
        return { outcome: 'replaced', note: `Refunded contributor (${logContributor}) does not match submitting wallet (${snap.accountAddress}).` }
      }
      if (logAmount !== snap.amount) {
        return { outcome: 'replaced', note: `Refunded amount (${logAmount}) does not match claimed amount (${snap.amount}).` }
      }
      return { outcome: 'confirmed', note: '' }
    }

    return { outcome: 'error', note: 'Unknown action type.' }
  } catch (err) {
    return { outcome: 'error', note: `RPC error: ${err instanceof Error ? err.message : String(err)}` }
  }
}
