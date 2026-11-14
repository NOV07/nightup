// Node ESM loader hooks for scripts/test-admin-spot-edit.mjs: resolves the "@/"
// alias and extensionless imports of the route files, and swaps the three
// modules that talk to the outside world for in-memory fakes.
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import { resolve as resolvePath, dirname } from 'node:path'

const ROOT = process.cwd()
const FAKES = {
  'app/lib/supabase-server.ts': 'fake-supabase-server.mjs',
  'app/lib/supabase.ts': 'fake-supabase.mjs',
  'app/lib/revalidateContent.ts': 'fake-revalidate.mjs',
}
const here = new URL('.', import.meta.url).pathname

function tryFile(base) {
  for (const c of [base, `${base}.ts`, `${base}/index.ts`]) {
    if (existsSync(c) && !/\/$/.test(c) && c.match(/\.\w+$/)) return c
  }
  return null
}

export async function resolve(specifier, context, next) {
  let file = null
  if (specifier.startsWith('@/')) file = tryFile(resolvePath(ROOT, specifier.slice(2)))
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.endsWith('.ts')) {
    file = tryFile(resolvePath(dirname(new URL(context.parentURL).pathname), specifier))
  }
  if (file) {
    for (const [suffix, fake] of Object.entries(FAKES)) {
      if (file.endsWith('/' + suffix)) return { url: pathToFileURL(resolvePath(here, fake)).href, shortCircuit: true }
    }
    return { url: pathToFileURL(file).href, shortCircuit: true }
  }
  try {
    return await next(specifier, context)
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' || e.code === 'ERR_UNSUPPORTED_DIR_IMPORT') return next(specifier + '.js', context)
    throw e
  }
}
