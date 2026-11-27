/**
 * Values a placeholder can name with a `$` instead of a path into the
 * context: `{{$uuid}}`, `{{$now}}`. A context key never answers for one, so a
 * real field can't be mistaken for a built-in or the other way round.
 *
 * Times are UTC. Every time value in one fill call comes from one clock
 * reading, so a timestamp and a signature filled together agree. `$uuid`,
 * `$uuid_v7` and `$random_hex` are new on every use.
 */
export type Builtins = (name: string) => string | undefined

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')

/** A version 7 UUID (RFC 9562): 48 bits of Unix milliseconds, then random bits. */
export function uuidV7(ms: number = Date.now()): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let time = ms
  for (let i = 5; i >= 0; i--) {
    bytes[i] = time % 256
    time = Math.floor(time / 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70 // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10
  const h = hex(bytes)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(
    16,
    20
  )}-${h.slice(20)}`
}

/** The built-ins for one fill call, with the clock read now. */
export function createBuiltins(now: Date = new Date(Date.now())): Builtins {
  const ms = now.getTime()
  return name => {
    switch (name) {
      case '$uuid':
        return crypto.randomUUID()
      case '$uuid_v7':
        return uuidV7(ms)
      case '$now':
        return now.toISOString()
      case '$now_unix':
        return String(Math.floor(ms / 1000))
      case '$now_unix_ms':
        return String(ms)
      case '$now_http':
        return now.toUTCString()
      case '$today':
        return now.toISOString().slice(0, 10)
      case '$random_hex':
        return hex(crypto.getRandomValues(new Uint8Array(16)))
      default:
        return undefined
    }
  }
}

/**
 * Whether every `$` in a placeholder starts one of its paths. Before `$` was
 * allowed, a placeholder with a `$` anywhere was not matched at all and stayed
 * as written; one with a `$` elsewhere (`{{price$}}`, `{{a?:$5}}`) still does.
 */
export function dollarOnlyStartsPaths(
  matchStr: string,
  defaultStr: string | undefined
): boolean {
  if (defaultStr !== undefined && defaultStr.includes('$')) {
    return false
  }
  return matchStr.split('|').every(part => {
    const first = part.indexOf('$')
    return (
      first === -1 ||
      (part.trimStart().startsWith('$') && part.indexOf('$', first + 1) === -1)
    )
  })
}
