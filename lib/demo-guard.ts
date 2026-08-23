import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { NextRequest, NextResponse } from 'next/server'

type RateEntry = { count: number; resetAt: number }

declare global {
  // Best-effort per-instance protection. Production hosting should also apply an
  // edge/provider rate limit so counters are shared across serverless instances.
  var __prepmeRateLimits: Map<string, RateEntry> | undefined
}

const rateLimits = globalThis.__prepmeRateLimits || new Map<string, RateEntry>()
globalThis.__prepmeRateLimits = rateLimits

function clientKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()
  return forwarded || realIp || 'local'
}

export function enforceRateLimit(
  request: NextRequest,
  scope: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now()
  const key = `${scope}:${clientKey(request)}`
  const current = rateLimits.get(key)
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : current

  entry.count += 1
  rateLimits.set(key, entry)

  if (entry.count <= options.limit) return null

  const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
  return NextResponse.json(
    {
      error: 'Demo limit reached',
      details: 'This public demo limits repeated AI requests. Please wait a few minutes and try again.',
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    },
  )
}

export function rejectOversizedRequest(request: NextRequest, maxBytes: number) {
  const rawLength = request.headers.get('content-length')
  const contentLength = rawLength ? Number(rawLength) : 0
  if (!Number.isFinite(contentLength) || contentLength <= maxBytes) return null

  return NextResponse.json(
    { error: `Request is too large. Maximum size is ${Math.ceil(maxBytes / 1024)} KB.` },
    { status: 413 },
  )
}

function isPrivateIpv4(address: string) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

function isPrivateAddress(address: string) {
  const version = isIP(address)
  if (version === 4) return isPrivateIpv4(address)
  if (version === 6) {
    const normalized = address.toLowerCase()
    return (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb') ||
      normalized.startsWith('::ffff:127.') ||
      normalized.startsWith('::ffff:10.') ||
      normalized.startsWith('::ffff:192.168.')
    )
  }
  return true
}

export async function assertSafePublicUrl(input: string) {
  const url = new URL(input)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported.')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error('Private-network URLs are not allowed.')
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error('Private-network URLs are not allowed.')
    return url
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('The URL must resolve to a public internet address.')
  }

  return url
}
