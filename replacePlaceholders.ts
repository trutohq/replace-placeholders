import traverse from 'traverse'
import { isString, isArray, isPlainObject, isArrayBuffer, get } from 'lodash-es'
import replace from './replace'
export default function replacePlaceholders<T>(
  obj: T extends string | string[] | Record<string, unknown> ? T : never,
  context: Record<string, unknown>
): T {
  if (isString(obj)) {
    return replace(obj, context) as T
  }

  if (isArray(obj)) {
    return obj.map(item => replacePlaceholders(item, context)) as T
  }

  if (isPlainObject(obj)) {
    return traverse(obj).map(function (value) {
      if (this.circular) {
        this.remove()
      } else if (isString(value)) {
        this.update(replace(value, context))
      } else if (isArrayBuffer(value) || value instanceof Blob) {
        const val = get(obj, this.path)
        this.update(val)
        this.block()
      }
    })
  }

  throw new Error('Invalid type')
}
