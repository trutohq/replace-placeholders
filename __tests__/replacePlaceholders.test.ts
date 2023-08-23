import { describe, expect, it } from 'vitest'
import replacePlaceholders from '../replacePlaceholders'

describe('replacePlaceholders', () => {
  describe('string', () => {
    it('should replace a single placeholder', () => {
      expect(replacePlaceholders('{{foo}}', { foo: 'bar' })).toBe('bar')
      expect(
        replacePlaceholders('{{foo-bar.something}}', {
          'foo-bar': { something: true },
        })
      ).toBe('true')
      expect(
        replacePlaceholders('{{foo_bar.something}}', {
          foo_bar: { something: true },
        })
      ).toBe('true')
    })
    it('should replace multiple placeholders', () => {
      expect(
        replacePlaceholders('{{foo}} {{bar:bool}}', {
          foo: 'bar',
          bar: 'false',
        })
      ).toBe('bar false')
    })
  })
  describe('array', () => {
    it('should replace a single placeholder', () => {
      expect(replacePlaceholders(['{{foo}}'], { foo: 'bar' })).toEqual(['bar'])
    })
    it('should replace multiple placeholders', () => {
      expect(
        replacePlaceholders(['{{foo}}', '{{bar:num}}'], {
          foo: 'bar',
          bar: '1.34',
        })
      ).toEqual(['bar', 1.34])
    })
  })
  describe('object', () => {
    it('should replace a single placeholder', () => {
      expect(replacePlaceholders({ foo: '{{foo}}' }, { foo: 'bar' })).toEqual({
        foo: 'bar',
      })
    })
    it('should replace multiple placeholders', () => {
      expect(
        replacePlaceholders(
          { foo: '{{foo}}', bar: '{{bar:int}}' },
          {
            foo: 'bar',
            bar: 1,
          }
        )
      ).toEqual({ foo: 'bar', bar: 1 })
    })
  })
})
