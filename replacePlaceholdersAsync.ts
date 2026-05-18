import deepmerge from 'deepmerge'
import jsonata from 'jsonata'
import {
  isArray,
  isArrayBuffer,
  isPlainObject,
  isString,
  toString,
} from 'lodash-es'
import replace from './replace'

const EXP_REGEX = /{{exp:\s*([\s\S]*?)}}/g

export type ExpressionEvaluator = (
  expression: string,
  context: Record<string, unknown>
) => Promise<unknown>

export type ReplacePlaceholdersAsyncOptions = {
  evaluateExpression?: ExpressionEvaluator
}

async function defaultEvaluator(
  expression: string,
  context: Record<string, unknown>
): Promise<unknown> {
  const expr = jsonata(expression)
  return expr.evaluate(context)
}

async function replaceStringAsync(
  str: string,
  context: Record<string, unknown>,
  evaluator: ExpressionEvaluator
): Promise<unknown> {
  const matches = [...str.matchAll(EXP_REGEX)]

  if (matches.length === 0) {
    return replace(str, context)
  }

  // Whole-string single expression → return raw typed value (number, boolean, object, etc.)
  if (matches.length === 1 && matches[0][0] === str) {
    return evaluator(matches[0][1].trim(), context)
  }

  // Embedded expressions → evaluate each, stringify, substitute, then run sync replace
  let result = str
  let offset = 0
  for (const match of matches) {
    const start = match.index! + offset
    const end = start + match[0].length
    const value = await evaluator(match[1].trim(), context)
    const replacement = toString(value)
    result = result.slice(0, start) + replacement + result.slice(end)
    offset += replacement.length - match[0].length
  }
  return replace(result, context)
}

async function traverseObjectFields(
  obj: Record<string, unknown>,
  context: Record<string, unknown>,
  evaluator: ExpressionEvaluator
): Promise<Record<string, unknown>> {
  const entries = await Promise.all(
    Object.entries(obj).map(async ([key, val]) => [
      key,
      await traverseAndReplace(val, context, evaluator),
    ])
  )
  return Object.fromEntries(entries)
}

async function traverseAndReplace(
  value: unknown,
  context: Record<string, unknown>,
  evaluator: ExpressionEvaluator
): Promise<unknown> {
  if (isString(value)) {
    return replaceStringAsync(value, context, evaluator)
  }
  if (isArray(value)) {
    return Promise.all(
      value.map(item => traverseAndReplace(item, context, evaluator))
    )
  }
  if (isArrayBuffer(value) || value instanceof Blob) {
    return value
  }
  if (isPlainObject(value)) {
    const obj = value as Record<string, unknown>
    if ('$truto_merge' in obj) {
      const { $truto_merge, ...rest } = obj
      const processedRest = await traverseObjectFields(rest, context, evaluator)
      const mergeValues = isArray($truto_merge) ? $truto_merge : [$truto_merge]
      let result: Record<string, unknown> = processedRest
      for (const mergeVal of mergeValues) {
        const resolved = await traverseAndReplace(mergeVal, context, evaluator)
        if (isPlainObject(resolved)) {
          result = deepmerge(result, resolved as Record<string, unknown>)
        }
      }
      return result
    }
    return traverseObjectFields(obj, context, evaluator)
  }
  return value
}

export default async function replacePlaceholdersAsync<T>(
  obj: T extends string | string[] | Record<string, unknown> ? T : never,
  context: Record<string, unknown>,
  options?: ReplacePlaceholdersAsyncOptions
): Promise<T> {
  const evaluator = options?.evaluateExpression ?? defaultEvaluator
  return traverseAndReplace(obj, context, evaluator) as Promise<T>
}
