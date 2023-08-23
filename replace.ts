import { get as getWild } from 'wild-wild-path'
import { isPlainObject } from 'lodash-es'

function replace(
  str = '',
  obj: object = {}
):
  | string
  | number
  | boolean
  | Record<string, unknown>
  | null
  | undefined
  | unknown {
  const regex = /{{([\w-.|:]+)}}/gi
  const matches = str.match(regex)
  let result: string | any = str

  if (matches) {
    matches.forEach(match => {
      const parts = match.slice(2, -2).split('|')
      const isNullAllowed = parts.some(part => part.includes(':null'))

      let value: any = undefined
      for (const part of parts) {
        const [path, ...typeParts] = part.split(':')
        const type: string = typeParts[0] || 'str'

        const tempValue = getWild(obj, path.trim())
        if (tempValue !== undefined) {
          value = typeCast(tempValue, type, match === str)
          break
        }
      }

      if (value === undefined) {
        if (isNullAllowed) {
          value = null
        } else {
          value = match // Keep the placeholder intact
        }
      }

      if (match === str) {
        result = value
      } else {
        result = result.replace(match, value)
      }
    })
  }

  return result
}

function typeCast(
  value: unknown,
  type: string,
  isWholeString: boolean
):
  | string
  | number
  | boolean
  | Record<string, unknown>
  | null
  | undefined
  | unknown {
  if (value === undefined || value === null) return value

  let castValue: any
  switch (type) {
    case 'null':
      if (value === 'null' || value === null) return null
      return isWholeString ? value : 'null'
    case 'int':
      castValue = parseInt(value as string)
      return isNaN(castValue) ? value : castValue
    case 'num':
      castValue = parseFloat(value as string)
      return isNaN(castValue) ? value : castValue
    case 'str':
      return String(value)
    case 'bool':
      if (value === 'true' || value === true) return true
      if (value === 'false' || value === false) return false
      return value // Return the original value if it's not 'true' or 'false'
    case 'json':
      if (isWholeString) {
        if (isPlainObject(value)) return value
        try {
          return JSON.parse(value as string)
        } catch (err) {
          return value
        }
      }
      return value
    case 'any':
      return value
    default:
      throw new Error(`Unsupported type: ${type}`)
  }
}

export default replace
