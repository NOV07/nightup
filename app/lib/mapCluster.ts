// Grid clustering of the pins of /map, done in the browser (no library): points
// are put in square cells of `cell` pixels at the current zoom, and a cell with
// two or more points becomes one cluster. Radar picks (and the open pin) are
// "solo": they never go into a cluster. Pure, so scripts/test-map-cluster.mjs
// can load it in plain Node.

/** Clusters only exist up to this zoom; closer in, every pin is drawn. */
export const CLUSTER_MAX_ZOOM = 16
/** Side of a cell in pixels: a little over the 34px marker, so pins that touch merge. */
export const CLUSTER_CELL_PX = 48

export type ClusterItem = {
  id: string
  /** Position in pixels at the zoom the grid is made for (map.project). */
  x: number
  y: number
  lat: number
  lng: number
  /** Never clustered (a radar pick, the picked point). */
  solo?: boolean
}

export type Cluster = { key: string; ids: string[]; lat: number; lng: number }

export function clusterByGrid(items: readonly ClusterItem[], cell: number = CLUSTER_CELL_PX): { singles: string[]; clusters: Cluster[] } {
  const singles: string[] = []
  const cells = new Map<string, ClusterItem[]>()
  for (const it of items) {
    if (it.solo) { singles.push(it.id); continue }
    const k = `${Math.floor(it.x / cell)}:${Math.floor(it.y / cell)}`
    const bucket = cells.get(k)
    if (bucket) bucket.push(it)
    else cells.set(k, [it])
  }
  const clusters: Cluster[] = []
  for (const bucket of cells.values()) {
    if (bucket.length === 1) { singles.push(bucket[0].id); continue }
    const ids = bucket.map(b => b.id).sort()
    clusters.push({
      key: ids.join('|'),
      ids,
      lat: bucket.reduce((s, b) => s + b.lat, 0) / bucket.length,
      lng: bucket.reduce((s, b) => s + b.lng, 0) / bucket.length,
    })
  }
  return { singles, clusters }
}
