export function shortAddr(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 3) return addr
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`
}

/** Format a raw integer token amount (bigint, as returned by RPC) using its decimals. */
export function fmtAmount(raw: bigint, decimals: number, compact = false): string {
  const negative = raw < 0n
  const abs = negative ? -raw : raw
  const divisor = 10n ** BigInt(decimals)
  const whole = abs / divisor
  const frac = abs % divisor

  let out: string
  if (compact) {
    if (whole >= 1000n) {
      // Large values: format the exact integer part via BigInt, no sub-unit precision.
      // Converting straight to Number here would silently lose precision once the raw
      // amount exceeds Number.MAX_SAFE_INTEGER — routine for high-supply meme tokens.
      out = whole.toLocaleString()
    } else {
      const asNumber = Number(whole) + Number(frac) / Number(divisor)
      out = asNumber.toLocaleString(undefined, { maximumFractionDigits: 4 })
    }
  } else {
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
    out = fracStr ? `${whole}.${fracStr}` : whole.toString()
  }
  return negative ? `-${out}` : out
}

export function fmtUsd(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '—'
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: value < 1 ? 6 : 2 })
}

/** Parse a UI amount string (what a person types, e.g. "1.5") into a raw integer amount string. */
export function uiToRaw(ui: string, decimals: number): string {
  const trimmed = ui.trim()
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '' || trimmed === '.') throw new Error('invalid amount')
  if (Number(trimmed) <= 0) throw new Error('amount must be greater than zero')
  const [whole, frac = ''] = trimmed.split('.')
  if (frac.length > decimals) throw new Error(`too many decimal places (max ${decimals})`)
  const paddedFrac = frac.padEnd(decimals, '0')
  const raw = `${whole || '0'}${paddedFrac}`.replace(/^0+(?=\d)/, '')
  return raw || '0'
}

/** Raw integer amount string -> human decimal string. */
export function rawToUi(raw: string, decimals: number): string {
  return fmtAmount(BigInt(raw), decimals)
}
