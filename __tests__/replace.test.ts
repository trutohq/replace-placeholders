import { describe, expect, it } from 'vitest'
import replace from '../replace'

describe('replace', () => {
  describe('zero placeholder', () => {
    it('should return the original string', () => {
      expect(replace('foo', { foo: 'bar' })).toBe('foo')
      expect(replace('{foo}', { foo: 'bar' })).toBe('{foo}')
      expect(replace('{{foo}', { foo: 'bar' })).toBe('{{foo}')
      expect(replace('{{foo }}', { foo: 'bar' })).toBe('{{foo }}')
    })
  })
  describe('single', () => {
    it('should replace a single placeholder', () => {
      expect(replace('{{foo}}', { foo: 'bar' })).toBe('bar')
    })
    it('should replace a single placeholder with other text', () => {
      expect(replace('foo {{foo}} bar', { foo: 'bar' })).toBe('foo bar bar')
    })
    it('should replace a single deep path placeholder', () => {
      expect(replace('{{foo.bar}}', { foo: { bar: 'baz' } })).toBe('baz')
      expect(replace('{{foo-baz.bar}}', { 'foo-baz': { bar: 'baz' } })).toBe(
        'baz'
      )
      expect(replace('{{foo_baz.bar}}', { foo_baz: { bar: 'baz' } })).toBe(
        'baz'
      )
    })
    it('should replace a single deep path placeholder with arrays', () => {
      expect(
        replace('{{foo.bar.0.baz}}', { foo: { bar: [{ baz: 'qux' }] } })
      ).toBe('qux')
      expect(
        replace('{{foo.bar[0].baz}}', { foo: { bar: [{ baz: 'qux' }] } })
      ).toBe('{{foo.bar[0].baz}}')
    })
    it('should return the original string if the placeholder is not found', () => {
      expect(replace('{{foo}} bar', {})).toBe('{{foo}} bar')
    })
    it('should return the original string if the placeholder is not found in a deep path', () => {
      expect(replace('foo {{foo.bar}}', {})).toBe('foo {{foo.bar}}')
    })
  })
  describe('multiple', () => {
    it('should replace multiple placeholders', () => {
      expect(replace('{{foo}} {{bar}}', { foo: 'bar', bar: 'baz' })).toBe(
        'bar baz'
      )
    })
    it('should replace multiple placeholders with other text', () => {
      expect(
        replace('foo {{foo}} bar {{bar}}', { foo: 'bar', bar: 'baz' })
      ).toBe('foo bar bar baz')
    })
    it('should replace multiple deep path placeholders', () => {
      expect(
        replace('{{foo.bar}} {{baz.qux}}', {
          foo: { bar: 'bar' },
          baz: { qux: 'qux' },
        })
      ).toBe('bar qux')
    })
    it('should replace multiple deep path placeholders with arrays', () => {
      expect(
        replace('{{foo.bar.0.baz}} {{foo.bar.1.qux}}', {
          foo: { bar: [{ baz: 'baz' }, { qux: 'qux' }] },
        })
      ).toBe('baz qux')
    })
    it('should return the original string if a placeholder is not found', () => {
      expect(replace('{{foo}} {{bar}}', {})).toBe('{{foo}} {{bar}}')
    })
  })
  describe('type casting', () => {
    describe('int', () => {
      it('should cast a string to an int', () => {
        expect(replace('{{foo:int}}', { foo: '1' })).toBe(1)
        expect(replace('{{foo:int}}', { foo: '1.1' })).toBe(1)
      })
      it('should cast an integer to an int', () => {
        expect(replace('{{foo:int}}', { foo: 1 })).toBe(1)
      })
      it('should cast a float to an int', () => {
        expect(replace('{{foo:int}}', { foo: 1.1 })).toBe(1)
      })
      it('should return original placeholder if its not a valid integer', () => {
        expect(replace('{{foo:int}}', { foo: 'blah' })).toBe('blah')
      })
      it('should return replaced placeholder if with other text', () => {
        expect(replace('foo {{foo:int}} bar', { foo: '1' })).toBe('foo 1 bar')
      })
    })
    describe('num', () => {
      it('should cast a string to a number', () => {
        expect(replace('{{foo:num}}', { foo: '1.1' })).toBe(1.1)
      })
      it('should cast a number to a number', () => {
        expect(replace('{{foo:num}}', { foo: 1.1 })).toBe(1.1)
      })
      it('should return original placeholder if its not a valid number', () => {
        expect(replace('{{foo:num}}', { foo: 'blah' })).toBe('blah')
      })
      it('should return replaced placeholder if with other text', () => {
        expect(replace('foo {{foo:num}} bar', { foo: '1.1' })).toBe(
          'foo 1.1 bar'
        )
      })
    })
    describe('bool', () => {
      it('should cast a string to a boolean', () => {
        expect(replace('{{foo:bool}}', { foo: 'true' })).toBe(true)
        expect(replace('{{foo:bool}}', { foo: 'false' })).toBe(false)
      })
      it('should cast a boolean to a boolean', () => {
        expect(replace('{{foo:bool}}', { foo: true })).toBe(true)
        expect(replace('{{foo:bool}}', { foo: false })).toBe(false)
      })
      it('should return original placeholder if its not a valid boolean', () => {
        expect(replace('{{foo:bool}}', { foo: 'blah' })).toBe('blah')
      })
      it('should return replaced placeholder if with other text', () => {
        expect(replace('foo {{foo:bool}} bar', { foo: 'true' })).toBe(
          'foo true bar'
        )
      })
    })
    describe('json', () => {
      it('should cast a string to json', () => {
        expect(replace('{{foo:json}}', { foo: '{"foo":"bar"}' })).toEqual({
          foo: 'bar',
        })
      })
      it('should cast a json to json', () => {
        expect(replace('{{foo:json}}', { foo: { foo: 'bar' } })).toEqual({
          foo: 'bar',
        })
      })
      it('should return original placeholder if its not a valid json', () => {
        expect(replace('{{foo:json}}', { foo: 'blah' })).toBe('blah')
      })
      it('should return replaced placeholder if with other text', () => {
        expect(replace('foo {{foo:json}} bar', { foo: '{"foo":"bar"}' })).toBe(
          'foo {"foo":"bar"} bar'
        )
      })
    })
    describe('null', () => {
      it('should cast a string to null', () => {
        expect(replace('{{foo:null}}', { foo: 'null' })).toBe(null)
      })
      it('should cast a null to null', () => {
        expect(replace('{{foo:null}}', { foo: null })).toBe(null)
      })
      it('should return original placeholder if its not a valid null', () => {
        expect(replace('{{foo:null}}', { foo: 'blah' })).toBe('blah')
      })
      it('should return replaced placeholder if with other text', () => {
        expect(replace('foo {{foo:null}} bar', { foo: 'null' })).toBe(
          'foo null bar'
        )
      })
      it('should return null if the placeholder is not found', () => {
        expect(replace('{{foo:null}}', {})).toBe(null)
      })
      it('should return null if with type cast and the placeholder is not found', () => {
        expect(replace('{{foo:int:null}}', {})).toBe(null)
        expect(replace('{{foo:num:null}}', {})).toBe(null)
        expect(replace('{{foo:str:null}}', {})).toBe(null)
        expect(replace('{{foo:bool:null}}', {})).toBe(null)
        expect(replace('{{foo.bar:json:null}}', {})).toBe(null)
      })
    })
    describe('str', () => {
      it('should cast a string to a string', () => {
        expect(replace('{{foo:str}}', { foo: 'blah' })).toBe('blah')
      })
      it('should cast a number to a string', () => {
        expect(replace('{{foo:str}}', { foo: 1 })).toBe('1')
      })
      it('should cast a boolean to a string', () => {
        expect(replace('{{foo:str}}', { foo: true })).toBe('true')
      })
      it('should cast a json to a string', () => {
        expect(replace('{{foo:str}}', { foo: { foo: 'bar' } })).toBe(
          '[object Object]'
        )
      })
      it('should return original placeholder if its not a valid string', () => {
        expect(replace('{{foo:str}}', { foo: null })).toBe(null)
      })
      it('should return replaced placeholder if with other text', () => {
        expect(replace('foo {{foo:str}} bar', { foo: 'blah' })).toBe(
          'foo blah bar'
        )
      })
    })
  })
  describe('or condition', () => {
    it('should return the first non-undefined value', () => {
      expect(replace('{{foo|bar}}', { foo: 'foo' })).toBe('foo')
      expect(replace('{{foo|bar}}', { bar: 'bar' })).toBe('bar')
      expect(replace('{{foo|bar}}', { foo: 'foo', bar: 'bar' })).toBe('foo')
    })
    it('should return the first non-undefined value with type cast', () => {
      expect(replace('{{foo:str|bar:str}}', { foo: 'foo' })).toBe('foo')
      expect(replace('{{foo:str|bar:int}}', { bar: 1 })).toBe(1)
      expect(replace('{{foo:int|bar:str}}', { foo: 1, bar: 'bar' })).toBe(1)
      expect(replace('{{foo|bar:str}}', { foo: 1 })).toBe('1')
      expect(replace('{{foo|bar:str}}', { foo: true })).toBe('true')
      expect(replace('{{foo|bar:str}}', { foo: { foo: 'bar' } })).toBe(
        '[object Object]'
      )
      expect(replace('{{foo:str:null|bar:str}}', { foo: null })).toBe(null)
      expect(replace('{{foo:str:null|bar:str}}', {})).toBe(null)
    })
    it('should return the first non-undefined value with type cast for deep paths', () => {
      expect(replace('{{foo.bar:str|bar:str}}', { foo: { bar: 'bar' } })).toBe(
        'bar'
      )
      expect(replace('{{foo.bar:str|bar:int}}', { bar: 1 })).toBe(1)
      expect(
        replace('{{foo.bar:int|bar.str}}', { foo: { bar: 1 }, bar: 'bar' })
      ).toBe(1)
      expect(replace('{{foo.bar|bar:str}}', { foo: { bar: 1 } })).toBe('1')
      expect(replace('{{foo.bar|bar:str}}', { foo: { bar: true } })).toBe(
        'true'
      )
      expect(
        replace('{{foo.bar|bar:str}}', { foo: { bar: { foo: 'bar' } } })
      ).toBe('[object Object]')
      expect(
        replace('{{foo.bar:str:null|bar:str}}', { foo: { bar: null } })
      ).toBe(null)
      expect(replace('{{foo.bar:str:null|bar:str}}', {})).toBe(null)
    })
  })
})
