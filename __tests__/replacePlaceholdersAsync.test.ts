import { describe, expect, it } from 'vitest'
import replacePlaceholders from '../replacePlaceholders'
import replacePlaceholdersAsync from '../replacePlaceholdersAsync'

describe('replacePlaceholdersAsync', () => {
  describe('exp expression placeholders', () => {
    it('should evaluate a simple ternary expression', async () => {
      const result = await replacePlaceholdersAsync(
        '{{exp: active ? "yes" : "no"}}',
        { active: true }
      )
      expect(result).toBe('yes')
    })

    it('should return false branch for falsy value', async () => {
      const result = await replacePlaceholdersAsync(
        '{{exp: active ? "yes" : "no"}}',
        { active: false }
      )
      expect(result).toBe('no')
    })

    it('whole-string expression returns raw boolean', async () => {
      const result = await replacePlaceholdersAsync('{{exp: count > 0}}', {
        count: 5,
      })
      expect(result).toBe(true)
    })

    it('whole-string expression returns raw number', async () => {
      const result = await replacePlaceholdersAsync(
        '{{exp: query.limit ? query.limit : 100}}',
        { query: {} }
      )
      expect(result).toBe(100)
    })

    it('whole-string expression returns number from context', async () => {
      const result = await replacePlaceholdersAsync(
        '{{exp: query.limit ? query.limit : 100}}',
        { query: { limit: 50 } }
      )
      expect(result).toBe(50)
    })

    it('whole-string expression returns raw object', async () => {
      const result = await replacePlaceholdersAsync('{{exp: config}}', {
        config: { foo: 'bar' },
      })
      expect(result).toEqual({ foo: 'bar' })
    })

    it('embedded expression stringifies result', async () => {
      const result = await replacePlaceholdersAsync(
        'status={{exp: active ? "yes" : "no"}}',
        { active: true }
      )
      expect(result).toBe('status=yes')
    })

    it('multiple embedded expressions in one string', async () => {
      const result = await replacePlaceholdersAsync('{{exp: a}}-{{exp: b}}', {
        a: 'hello',
        b: 'world',
      })
      expect(result).toBe('hello-world')
    })

    it('invalid JSONata throws', async () => {
      await expect(
        replacePlaceholdersAsync('{{exp: ??? invalid}}', {})
      ).rejects.toThrow()
    })

    it('expression using JSONata union operator | is not split as fallback', async () => {
      // JSONata uses | in path unions; sync parser would incorrectly split on | as fallback
      const result = await replacePlaceholdersAsync(
        '{{exp: items[type = "a" or type = "b"].name}}',
        {
          items: [
            { type: 'a', name: 'alpha' },
            { type: 'c', name: 'gamma' },
          ],
        }
      )
      expect(result).toBe('alpha')
    })
  })

  describe('object with exp expressions', () => {
    it('should evaluate expression in object value', async () => {
      const result = await replacePlaceholdersAsync(
        { active: '{{exp: flag ? "yes" : "no"}}' },
        { flag: true }
      )
      expect(result).toEqual({ active: 'yes' })
    })

    it('should evaluate expression returning number in object', async () => {
      const result = await replacePlaceholdersAsync(
        { limit: '{{exp: query.limit ? query.limit : 100}}' },
        { query: {} }
      )
      expect(result).toEqual({ limit: 100 })
    })
  })

  describe('mixed expression and legacy placeholders', () => {
    it('legacy {{foo}} placeholders still work', async () => {
      const result = await replacePlaceholdersAsync(
        { name: '{{name}}', active: '{{exp: flag ? "yes" : "no"}}' },
        { name: 'Alice', flag: false }
      )
      expect(result).toEqual({ name: 'Alice', active: 'no' })
    })

    it('expression placeholder and legacy placeholder in same string', async () => {
      const result = await replacePlaceholdersAsync(
        '{{exp: prefix}}-{{suffix}}',
        { prefix: 'hello', suffix: 'world' }
      )
      expect(result).toBe('hello-world')
    })
  })

  describe('$truto_merge with expression returning object', () => {
    it('should merge object returned by expression', async () => {
      const result = await replacePlaceholdersAsync(
        {
          query: {
            default_value: 'foo',
            $truto_merge: '{{exp: extraQuery}}',
          },
        },
        { extraQuery: { custom_value: 'bar' } }
      )
      expect(result).toEqual({
        query: {
          default_value: 'foo',
          custom_value: 'bar',
        },
      })
    })

    it('should skip non-object expression results in $truto_merge', async () => {
      const result = await replacePlaceholdersAsync(
        {
          query: {
            default_value: 'foo',
            $truto_merge: '{{exp: stringValue}}',
          },
        },
        { stringValue: 'not an object' }
      )
      expect(result).toEqual({
        query: {
          default_value: 'foo',
        },
      })
    })

    it('should work with legacy $truto_merge alongside expressions', async () => {
      const result = await replacePlaceholdersAsync(
        {
          query: {
            name: '{{exp: user.name}}',
            $truto_merge: '{{extra:json}}',
          },
        },
        { user: { name: 'Alice' }, extra: { role: 'admin' } }
      )
      expect(result).toEqual({
        query: {
          name: 'Alice',
          role: 'admin',
        },
      })
    })
  })

  describe('sync API leaves {{exp: ...}} unchanged', () => {
    it('safe-char expression is not matched by sync parser', () => {
      // {{exp: a.b.c}} contains only chars in the sync regex char class,
      // so the negative lookahead is the only guard
      const result = replacePlaceholders('{{exp: a.b.c}}', {
        exp: 'bad',
        a: { b: { c: 'deep' } },
      })
      expect(result).toBe('{{exp: a.b.c}}')
    })

    it('does not crash when context has key "exp"', () => {
      const result = replacePlaceholders('{{exp: a.b.c}}', {
        exp: { a: { b: { c: 'oops' } } },
      })
      expect(result).toBe('{{exp: a.b.c}}')
    })

    it('should not evaluate exp expression in sync mode (no special chars)', () => {
      const result = replacePlaceholders('{{exp: query.limit}}', {
        query: { limit: 50 },
      })
      expect(result).toBe('{{exp: query.limit}}')
    })

    it('should not crash on exp expression with quotes in sync mode', () => {
      const result = replacePlaceholders(
        { active: '{{exp: flag ? "yes" : "no"}}' },
        { flag: true }
      )
      expect(result).toEqual({ active: '{{exp: flag ? "yes" : "no"}}' })
    })
  })

  describe('custom evaluator', () => {
    it('accepts a custom evaluateExpression option', async () => {
      const customEvaluator = async (
        expression: string,
        context: Record<string, unknown>
      ) => {
        return `custom:${expression}:${JSON.stringify(context.value)}`
      }
      const result = await replacePlaceholdersAsync(
        '{{exp: myExpr}}',
        { value: 42 },
        { evaluateExpression: customEvaluator }
      )
      expect(result).toBe('custom:myExpr:42')
    })
  })

  describe('array input', () => {
    it('should handle array of strings with expressions', async () => {
      const result = await replacePlaceholdersAsync(
        ['{{exp: a ? "x" : "y"}}', '{{name}}'],
        { a: true, name: 'Bob' }
      )
      expect(result).toEqual(['x', 'Bob'])
    })
  })

  describe('embedded expression stringify edge cases', () => {
    it('null result becomes empty string when embedded', async () => {
      const result = await replacePlaceholdersAsync(
        'prefix-{{exp: nullValue}}-suffix',
        { nullValue: null }
      )
      expect(result).toBe('prefix--suffix')
    })

    it('undefined result (missing path) becomes empty string when embedded', async () => {
      const result = await replacePlaceholdersAsync(
        'prefix-{{exp: missing}}-suffix',
        {}
      )
      expect(result).toBe('prefix--suffix')
    })

    it('array result is comma-joined when embedded', async () => {
      // lodash toString on an array joins elements with commas
      const result = await replacePlaceholdersAsync('ids={{exp: items}}', {
        items: [1, 2, 3],
      })
      expect(result).toBe('ids=1,2,3')
    })
  })

  describe('nested $truto_merge', () => {
    it('resolves $truto_merge recursively when the merge value itself has $truto_merge', async () => {
      const result = await replacePlaceholdersAsync(
        {
          base_key: 'base',
          $truto_merge: {
            merged_key: 'merged',
            $truto_merge: '{{exp: extraData}}',
          },
        },
        { extraData: { extra_key: 'extra' } }
      )
      expect(result).toEqual({
        base_key: 'base',
        merged_key: 'merged',
        extra_key: 'extra',
      })
    })
  })

  describe('sync API {{exp:type}} collision', () => {
    it('{{exp:int}} is left unchanged — "exp" as a path with :int type is blocked by the lookahead', () => {
      // Known constraint: the (?!exp:) lookahead also blocks {{exp:int}}.
      // Do not use "exp" as a context key with a type cast in sync templates.
      const result = replacePlaceholders('{{exp:int}}', { exp: '42' })
      expect(result).toBe('{{exp:int}}')
    })
  })
})
