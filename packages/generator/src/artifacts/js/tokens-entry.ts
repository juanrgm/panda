import type { Context } from '@pandacss/core'
import outdent from 'outdent'

// a.b -> a_b
// a.b.c -> a_b_c
// a.b_c -> a_b__c
// a.b__c -> a_b____c
// a.b.-123 -> a_b_n123
// a.b.n123 -> a_b_n123

export function toTokenVarName(name: string) {
  return name.replaceAll('_', '__').replaceAll('.', '_').replaceAll('-', 'n')
}

export function isValidVarName(name: string) {
  return /^[\w_]+$/.test(name)
}

export function generateTokensEntryJs(ctx: Context) {
  const { tokens } = ctx
  const map = new Map<
    string,
    {
      nameExpr: string
      valueExpr: string
      isExportable: boolean
    }
  >()

  tokens.allTokens.forEach((token) => {
    const { varRef, isVirtual } = token.extensions
    const value = isVirtual || token.extensions.condition !== 'base' ? varRef : token.value
    const exportName = toTokenVarName(token.name)
    const isExportable = isValidVarName(exportName)
    map.set(token.name, {
      nameExpr: isExportable ? exportName : JSON.stringify(token.name),
      valueExpr: `t(${JSON.stringify(value)}, ${JSON.stringify(varRef)})`,
      isExportable,
    })
  })

  const entries = Object.values(Object.fromEntries(map))
  const nonExportable = entries.some((entry) => !entry.isExportable)

  return {
    js: outdent`
  const t = (value, variable) => {
    value.var = variable;
    return value;
  }
  
  ${entries
    .filter((entry) => entry.isExportable)
    .map((entry) => `export const ${entry.nameExpr} = ${entry.valueExpr};`)
    .join('\n')}

  export const $ = {};
  ${entries
    .filter((entry) => !entry.isExportable)
    .map((entry) => `$[${entry.nameExpr}] = ${entry.valueExpr};`)
    .join('\n')}
  `,
    dts: outdent`
  export type TokenValue = string & { var: string }

  ${entries
    .filter((entry) => entry.isExportable)
    .map((entry) => `export declare const ${entry.nameExpr}: TokenValue`)
    .join('\n')}

  ${
    nonExportable
      ? `export declare const $: Record<${entries
          .filter((entry) => !entry.isExportable)
          .map((entry) => entry.nameExpr)
          .join(' | ')}, string>;`
      : ''
  }
  
  `,
  }
}
