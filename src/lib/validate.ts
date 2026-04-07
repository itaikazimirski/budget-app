/** Lightweight input validators for server actions. No external deps. */

export function validateName(value: unknown, maxLen = 100): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (v.length === 0 || v.length > maxLen) return null
  return v
}

export function validateAmount(value: unknown): number | null {
  const n = parseFloat(value as string)
  if (isNaN(n) || n < 0 || n > 10_000_000) return null
  return n
}

export function validateYear(value: unknown): number | null {
  const n = parseInt(value as string, 10)
  if (isNaN(n) || n < 2000 || n > 2100) return null
  return n
}

export function validateMonth(value: unknown): number | null {
  const n = parseInt(value as string, 10)
  if (isNaN(n) || n < 1 || n > 12) return null
  return n
}

export function validateEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length > 254) return null
  return v
}

export function validateEnum<T extends string>(value: unknown, allowed: T[]): T | null {
  if (typeof value !== 'string') return null
  return (allowed as string[]).includes(value) ? (value as T) : null
}

export function validateUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null
}
