import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import replace from '../replace'
import replacePlaceholders from '../replacePlaceholders'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const NOW = new Date('2026-11-27T10:15:30.123Z')

describe('built-in $ values', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fills each time value from the clock, in UTC', () => {
    expect(replace('{{$now}}')).toBe('2026-11-27T10:15:30.123Z')
    expect(replace('{{$now_unix}}')).toBe('1795774530')
    expect(replace('{{$now_unix_ms}}')).toBe('1795774530123')
    expect(replace('{{$now_http}}')).toBe('Fri, 27 Nov 2026 10:15:30 GMT')
    expect(replace('{{$today}}')).toBe('2026-11-27')
  })

  it('fills random values, new on every use', () => {
    const [a, b] = replace('{{$uuid}} {{$uuid}}').split(' ')
    expect(a).toMatch(UUID_V4)
    expect(b).toMatch(UUID_V4)
    expect(a).not.toBe(b)

    const v7 = replace('{{$uuid_v7}}') as string
    expect(v7).toMatch(UUID_V7)
    // The first 48 bits are the Unix milliseconds.
    expect(parseInt(v7.replace(/-/g, '').slice(0, 12), 16)).toBe(NOW.getTime())

    const hex = replace('{{$random_hex}}') as string
    expect(hex).toMatch(/^[0-9a-f]{32}$/)
    expect(replace('{{$random_hex}}')).not.toBe(hex)
  })

  it('never reads a context key for a built-in', () => {
    expect(replace('{{$uuid}}', { $uuid: 'stored' })).toMatch(UUID_V4)
    expect(replace('{{$now}}', { $now: 'stored' })).toBe(
      '2026-11-27T10:15:30.123Z'
    )
  })

  it('works with types, spaces, fallbacks and defaults', () => {
    expect(replace('{{$now_unix:int}}')).toBe(1795774530)
    expect(replace('{{ $now_unix_ms:num }}')).toBe(1795774530123)
    expect(replace('{{request_id|$uuid}}', { request_id: 'given' })).toBe(
      'given'
    )
    expect(replace('{{request_id|$uuid}}', {})).toMatch(UUID_V4)
    expect(replace('{{missing|$today?:fallback}}', {})).toBe('2026-11-27')
  })

  it('keeps an unknown built-in as written, whatever its modifiers, as before', () => {
    expect(replace('{{$uudi}}')).toBe('{{$uudi}}')
    expect(replace('{{$}}')).toBe('{{$}}')
    expect(replace('{{$typo:null}}')).toBe('{{$typo:null}}')
    expect(replace('{{$1:undefined}}')).toBe('{{$1:undefined}}')
    expect(replace('{{$nope?:x}}')).toBe('{{$nope?:x}}')
    expect(replace('{{a|$nope}}', { a: 'v' })).toBe('{{a|$nope}}')
  })

  it('leaves a placeholder with $ anywhere but the start of a path as written, as before', () => {
    const context = { price$: 'x', a: 'y' }
    expect(replace('{{price$}}', context)).toBe('{{price$}}')
    expect(replace('{{a?:$5}}', {})).toBe('{{a?:$5}}')
    expect(replace('{{a?:b?:$5}}', { a: 'v' })).toBe('{{a?:b?:$5}}')
    expect(replace('{{a?:b?:x$}}', { a: 'v' })).toBe('{{a?:b?:x$}}')
    expect(replace('{{$uuid$}}')).toBe('{{$uuid$}}')
    expect(replace('{{foo:undefined}} {{x$:undefined}}', {})).toBe(
      ' {{x$:undefined}}'
    )
  })

  it('reads the clock once per replacePlaceholders call', () => {
    // A clock that moves on every read: a second read would show.
    let tick = NOW.getTime()
    vi.spyOn(Date, 'now').mockImplementation(() => tick++)
    const filled = replacePlaceholders(
      {
        headers: { 'X-Timestamp': '{{$now_unix_ms}}' },
        body: ['{{$now}}', { at: '{{$now_unix_ms}}' }],
      },
      {}
    )
    expect(filled).toEqual({
      headers: { 'X-Timestamp': '1795774530123' },
      body: ['2026-11-27T10:15:30.123Z', { at: '1795774530123' }],
    })
  })
})
