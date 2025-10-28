import { isArray, isPlainObject, isString, toString, trim } from 'lodash-es'
import { get as getWild } from 'wild-wild-path'

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
  const regex = /{{([\w-./|:?\s]+)}}/gi
  const typeSplitRegex = /:(?=[\w\s]+)/gm
  const matches = str.match(regex)
  let result: string | any = str

  if (matches) {
    matches.forEach(match => {
      const [matchStr, defaultStr] = match.slice(2, -2).split('?:')
      const parts = matchStr.split('|')
      const isNullAllowed = parts.some(part => part.includes(':null'))
      const ignoreEmptyString = parts.some(part =>
        part.includes(':ignore-empty-str')
      )
      const setUndefined = parts.some(part => part.includes(':undefined'))

      const isWholeString = match === str

      let value: any = undefined
      for (const part of parts) {
        const [path, ...typeParts] = part.split(typeSplitRegex)
        const type: string = (typeParts[0] || 'str').trim()

        const tempValue = getWild(obj, path.trim())
        if (tempValue === '' && ignoreEmptyString) {
          continue
        }
        if (tempValue !== undefined) {
          value = typeCast(tempValue, type, isWholeString)
          break
        }
      }

      if (value === undefined && defaultStr) {
        const [defaultValue, defaultType] = defaultStr.split(typeSplitRegex)
        const type = defaultType || 'str'
        value = typeCast(defaultValue, type, isWholeString)
      } else if (value === undefined) {
        if (setUndefined) {
          if (isWholeString) {
            value = undefined
          } else {
            value = ''
          }
        } else if (isNullAllowed) {
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

  let valueToCheck = value
  if (isString(value) && type !== 'str') {
    valueToCheck = trim(value)
  }

  if (
    valueToCheck instanceof Blob ||
    valueToCheck instanceof ReadableStream ||
    valueToCheck instanceof WritableStream ||
    valueToCheck instanceof TransformStream
  ) {
    return valueToCheck
  }

  let castValue: any
  switch (type) {
    case 'ignore-empty-str':
      return valueToCheck
    case 'undefined':
      return valueToCheck
    case 'null':
      if (valueToCheck === 'null' || valueToCheck === null) return null
      return isWholeString ? valueToCheck : 'null'
    case 'int':
      castValue = parseInt(valueToCheck as string)
      return isNaN(castValue) ? valueToCheck : castValue
    case 'num':
      castValue = parseFloat(valueToCheck as string)
      return isNaN(castValue) ? valueToCheck : castValue
    case 'str':
      return toString(value)
    case 'bool':
      if (valueToCheck === 'true' || valueToCheck === true) return true
      if (valueToCheck === 'false' || valueToCheck === false) return false
      return valueToCheck // Return the original value if it's not 'true' or 'false'
    case 'json':
      if (isWholeString) {
        if (isPlainObject(valueToCheck) || isArray(valueToCheck))
          return valueToCheck
        try {
          return JSON.parse(valueToCheck as string)
        } catch (err) {
          return valueToCheck
        }
      }
      return valueToCheck
    case 'any':
      return valueToCheck
    default:
      throw new Error(`Unsupported type: ${type}`)
  }
}

export default replace
