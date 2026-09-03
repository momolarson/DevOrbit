const UNIT_MS = {
  d: 86_400_000,
  w: 7 * 86_400_000,
  m: 30 * 86_400_000,
  y: 365 * 86_400_000,
}

/**
 * Parse a window like "7d", "2w", "3m" relative to `until`, or an ISO date.
 * Returns a Date.
 */
export function parseSince(value, until = new Date()) {
  const rel = /^(\d+)([dwmy])$/.exec(value)
  if (rel) return new Date(until.getTime() - Number(rel[1]) * UNIT_MS[rel[2]])
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new Error(`cannot parse --since "${value}"; use 7d, 2w, 3m, or an ISO date`)
  }
  return d
}

export function hoursBetween(a, b) {
  if (!a || !b) return null
  return Math.round(((new Date(b) - new Date(a)) / 3_600_000) * 10) / 10
}

export function median(values) {
  const xs = values.filter((v) => v != null && !Number.isNaN(v)).sort((a, b) => a - b)
  if (xs.length === 0) return null
  const mid = Math.floor(xs.length / 2)
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2
}

export function inWindow(iso, since, until) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= since.getTime() && t <= until.getTime()
}

export function windowLabel(since, until) {
  const days = Math.round((until - since) / 86_400_000)
  if (days % 7 === 0 && days >= 14) return `${days / 7}w`
  return `${days}d`
}
