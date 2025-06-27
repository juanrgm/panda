import type { Context } from '@pandacss/core'
import outdent from 'outdent'
import { isValidVarName, toTokenVarName } from './tokens-entry'

export function generateTokenJs(ctx: Context) {
  const { tokens } = ctx
  const map = new Map<string, string>()

  tokens.allTokens.forEach((token) => {
    const nameExpr = toTokenVarName(token.name)
    if (isValidVarName(nameExpr)) map.set(token.name, nameExpr)
  })

  const obj = Object.fromEntries(map)

  return {
    js: outdent`
  import * as tokens from './tokens-entry.mjs';

  const tokenEntryNames = ${JSON.stringify(obj, null, 2)}

  export { tokens }
  
  export function token(path, fallback) {
    const name = tokenEntryNames[path]
    const value = name ? tokens[name] : tokens.$[path]
    return value || fallback
  }

  function tokenVar(path, fallback) {
    return token(path)?.var || fallback
  }

  token.var = tokenVar
  `,
    dts: outdent`
  ${ctx.file.importType('Token', './tokens')}
  export * as tokens from './tokens-entry.d.ts'

  export declare const token: {
    (path: Token, fallback?: string): string
    var: (path: Token, fallback?: string) => string
  }

  ${ctx.file.exportTypeStar('./tokens')}
  `,
  }
}
