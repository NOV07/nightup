import { db } from './fake-state.mjs'

function builder(table) {
  const q = { filters: [], neq: [], patch: null }
  const rows = () => db.spots.filter(r => q.filters.every(([k, v]) => r[k] === v) && q.neq.every(([k, v]) => r[k] !== v))
  const b = {
    select: () => b,
    eq: (k, v) => { q.filters.push([k, v]); return b },
    neq: (k, v) => { q.neq.push([k, v]); return b },
    limit: () => b,
    update: p => { q.patch = p; return b },
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    single: async () => {
      const r = rows()[0]
      if (q.patch && r) { db.updates.push({ id: r.id, patch: q.patch }); Object.assign(r, q.patch) }
      return { data: r ?? null, error: r ? null : { message: 'no row' } }
    },
    then: (res, rej) => Promise.resolve({ data: rows(), error: null }).then(res, rej),
  }
  return b
}

export function getSupabaseAdmin() {
  return {
    from: builder,
    storage: {
      from: () => ({
        upload: async (path) => { db.uploads.push(path); return { data: { path }, error: null } },
        getPublicUrl: path => ({ data: { publicUrl: `https://fake.test/${path}` } }),
      }),
    },
  }
}
export function getSupabase() { return getSupabaseAdmin() }
