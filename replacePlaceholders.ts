import deepmerge from 'deepmerge'
import { get, isArray, isArrayBuffer, isPlainObject, isString } from 'lodash-es'
import traverse from 'traverse'
import { Builtins, createBuiltins } from './builtins'
import replace from './replace'
export default function replacePlaceholders<T>(
  obj: T extends string | string[] | Record<string, unknown> ? T : never,
  context: Record<string, unknown>
): T {
  // One clock reading for the whole call (see `createBuiltins`).
  return fill(obj, context, createBuiltins())
}

function fill<T>(
  obj: T,
  context: Record<string, unknown>,
  builtins: Builtins
): T {
  if (isString(obj)) {
    return replace(obj, context, builtins) as T
  }

  if (isArray(obj)) {
    return obj.map(item => fill(item, context, builtins)) as T
  }

  if (isPlainObject(obj)) {
    // First pass: replace all string placeholders and track if $truto_merge exists
    let hasMergeKey = false
    const replaced = traverse(obj).map(function (value) {
      if (this.circular) {
        this.remove()
      } else if (isPlainObject(value) && '$truto_merge' in value) {
        hasMergeKey = true
      } else if (isString(value)) {
        this.update(replace(value, context, builtins))
      } else if (isArrayBuffer(value) || value instanceof Blob) {
        const val = get(obj, this.path)
        this.update(val)
        this.block()
      }
    })

    // Second pass: handle $truto_merge (only if needed)
    if (!hasMergeKey) {
      return replaced as T
    }

    return traverse(replaced).map(function (value) {
      if (this.circular) {
        this.remove()
      } else if (isPlainObject(value) && '$truto_merge' in value) {
        const mergeValue = value['$truto_merge']
        const mergeValues = isArray(mergeValue) ? mergeValue : [mergeValue]

        // Start with the base object (without $truto_merge key)
        let result: Record<string, unknown> = {}
        for (const key in value) {
          if (key !== '$truto_merge') {
            result[key] = value[key]
          }
        }

        // Merge each resolved value (already resolved in first pass)
        for (const resolvedValue of mergeValues) {
          // Only merge if it's a plain object
          if (isPlainObject(resolvedValue)) {
            result = deepmerge(result, resolvedValue as Record<string, unknown>)
          }
          // Skip if it's undefined, null, a string (unresolved placeholder), or any non-object
        }

        this.update(result)
      }
    }) as T
  }

  throw new Error('Invalid type')
}
