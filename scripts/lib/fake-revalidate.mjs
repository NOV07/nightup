import { db } from './fake-state.mjs'
export function revalidatePublicPaths(table) { db.revalidated.push(table) }
