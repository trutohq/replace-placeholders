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
          { foo: '{{foo}}', bar: '{{bar:int}}', baz: '{{baz:int:undefined}}' },
          {
            foo: 'bar',
            bar: 1,
          }
        )
      ).toEqual({ foo: 'bar', bar: 1 })
    })
  })

  describe('$truto_merge', () => {
    describe('basic merge', () => {
      it('should merge a single placeholder object', () => {
        const tpl = {
          query: {
            default_value: 'foo',
            $truto_merge: '{{user_supplied_query:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          user_supplied_query: { custom_value: 'bar' },
        })
        expect(result).toEqual({
          query: {
            default_value: 'foo',
            custom_value: 'bar',
          },
        })
      })

      it('should deep merge nested objects', () => {
        const tpl = {
          config: {
            defaults: {
              timeout: 1000,
              retries: 3,
            },
            $truto_merge: '{{user_config:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          user_config: {
            defaults: {
              retries: 5,
            },
            custom: true,
          },
        })
        expect(result).toEqual({
          config: {
            defaults: {
              timeout: 1000,
              retries: 5,
            },
            custom: true,
          },
        })
      })

      it('should remove $truto_merge key after merging', () => {
        const tpl = {
          data: {
            base: 'value',
            $truto_merge: '{{extra:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          extra: { additional: 'data' },
        })
        expect(result).toEqual({
          data: {
            base: 'value',
            additional: 'data',
          },
        })
        expect(result.data).not.toHaveProperty('$truto_merge')
      })
    })

    describe('multiple sources', () => {
      it('should merge multiple placeholders in order', () => {
        const tpl = {
          query: {
            default_value: 'foo',
            $truto_merge: ['{{first:json}}', '{{second:json}}'],
          },
        }
        const result = replacePlaceholders(tpl, {
          first: { a: 1, b: 2 },
          second: { b: 3, c: 4 },
        })
        expect(result).toEqual({
          query: {
            default_value: 'foo',
            a: 1,
            b: 3,
            c: 4,
          },
        })
      })

      it('should merge array of placeholders deeply', () => {
        const tpl = {
          settings: {
            core: { enabled: true },
            $truto_merge: ['{{base_settings:json}}', '{{user_settings:json}}'],
          },
        }
        const result = replacePlaceholders(tpl, {
          base_settings: {
            core: { version: '1.0' },
            features: { a: true },
          },
          user_settings: {
            core: { enabled: false },
            features: { b: true },
          },
        })
        expect(result).toEqual({
          settings: {
            core: {
              enabled: false,
              version: '1.0',
            },
            features: {
              a: true,
              b: true,
            },
          },
        })
      })
    })

    describe('fallback values', () => {
      it('should use fallback value when primary is undefined', () => {
        const tpl = {
          query: {
            default_value: 'foo',
            $truto_merge: '{{user_supplied_query:json|default_query:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          default_query: { custom_value: 'bar' },
        })
        expect(result).toEqual({
          query: {
            default_value: 'foo',
            custom_value: 'bar',
          },
        })
      })

      it('should use primary value when available', () => {
        const tpl = {
          query: {
            default_value: 'foo',
            $truto_merge: '{{user_supplied_query:json|default_query:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          user_supplied_query: { primary: 'value' },
          default_query: { fallback: 'value' },
        })
        expect(result).toEqual({
          query: {
            default_value: 'foo',
            primary: 'value',
          },
        })
      })

      it('should use fallback in array of placeholders', () => {
        const tpl = {
          data: {
            base: 'value',
            $truto_merge: [
              '{{first:json|fallback_first:json}}',
              '{{second:json}}',
            ],
          },
        }
        const result = replacePlaceholders(tpl, {
          fallback_first: { a: 1 },
          second: { b: 2 },
        })
        expect(result).toEqual({
          data: {
            base: 'value',
            a: 1,
            b: 2,
          },
        })
      })
    })

    describe('edge cases', () => {
      it('should skip undefined placeholders', () => {
        const tpl = {
          query: {
            default_value: 'foo',
            $truto_merge: '{{undefined_value:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {})
        expect(result).toEqual({
          query: {
            default_value: 'foo',
          },
        })
      })

      it('should skip non-object placeholders', () => {
        const tpl = {
          query: {
            default_value: 'foo',
            $truto_merge: '{{string_value:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          string_value: 'not an object',
        })
        expect(result).toEqual({
          query: {
            default_value: 'foo',
          },
        })
      })

      it('should skip null placeholders', () => {
        const tpl = {
          query: {
            default_value: 'foo',
            $truto_merge: '{{null_value:json:null}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          null_value: null,
        })
        expect(result).toEqual({
          query: {
            default_value: 'foo',
          },
        })
      })

      it('should handle array values in placeholders', () => {
        const tpl = {
          query: {
            default_value: 'foo',
            $truto_merge: '{{array_value:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          array_value: [1, 2, 3],
        })
        expect(result).toEqual({
          query: {
            default_value: 'foo',
          },
        })
      })

      it('should handle mixed valid and invalid sources', () => {
        const tpl = {
          data: {
            base: 'value',
            $truto_merge: [
              '{{invalid:json}}',
              '{{valid:json}}',
              '{{also_invalid:json}}',
            ],
          },
        }
        const result = replacePlaceholders(tpl, {
          invalid: 'string',
          valid: { merged: true },
          also_invalid: null,
        })
        expect(result).toEqual({
          data: {
            base: 'value',
            merged: true,
          },
        })
      })

      it('should work with empty object merge', () => {
        const tpl = {
          query: {
            default_value: 'foo',
            $truto_merge: '{{empty_obj:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          empty_obj: {},
        })
        expect(result).toEqual({
          query: {
            default_value: 'foo',
          },
        })
      })

      it('should handle deeply nested $truto_merge', () => {
        const tpl = {
          outer: {
            inner: {
              default: 'value',
              $truto_merge: '{{inner_merge:json}}',
            },
            $truto_merge: '{{outer_merge:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          inner_merge: { inner_custom: 'data' },
          outer_merge: { outer_custom: 'data' },
        })
        expect(result).toEqual({
          outer: {
            inner: {
              default: 'value',
              inner_custom: 'data',
            },
            outer_custom: 'data',
          },
        })
      })

      it('should preserve other placeholder replacements', () => {
        const tpl = {
          query: {
            name: '{{user_name}}',
            default_value: 'foo',
            $truto_merge: '{{user_query:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          user_name: 'John',
          user_query: { custom_value: 'bar' },
        })
        expect(result).toEqual({
          query: {
            name: 'John',
            default_value: 'foo',
            custom_value: 'bar',
          },
        })
      })

      it('should handle json type casting in merge placeholders', () => {
        const tpl = {
          query: {
            default_value: 'foo',
            $truto_merge: '{{user_query:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          user_query: { custom: 'value' },
        })
        expect(result).toEqual({
          query: {
            default_value: 'foo',
            custom: 'value',
          },
        })
      })
    })

    describe('conflict resolution', () => {
      it('should override base values with merged values', () => {
        const tpl = {
          config: {
            value: 'original',
            $truto_merge: '{{override:json}}',
          },
        }
        const result = replacePlaceholders(tpl, {
          override: { value: 'overridden' },
        })
        expect(result).toEqual({
          config: {
            value: 'overridden',
          },
        })
      })

      it('should override in order for multiple sources', () => {
        const tpl = {
          config: {
            value: 'original',
            $truto_merge: ['{{first:json}}', '{{second:json}}'],
          },
        }
        const result = replacePlaceholders(tpl, {
          first: { value: 'first_value' },
          second: { value: 'second_value' },
        })
        expect(result).toEqual({
          config: {
            value: 'second_value',
          },
        })
      })
    })
  })
})
