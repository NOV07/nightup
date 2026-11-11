// Clustering of the pins of /map, done in the browser (no library): at the
// current zoom, points are visited in id order and each one joins the first
// group whose first point ("leader") is within `radius` pixels, else it starts
// a group. A group of two or more becomes a cluster drawn at the average of its
// members. Leaders are always more than `radius` apart, so groups never overlap
// (a plain grid would leave pins that touch across a cell edge). Radar picks (and
// the open pin) are "solo": they never go into a cluster. Pure, so
// scripts/test-map-v2.mjs can load it in plain Node.

/** Clusters only exist up to this zoom; closer in, every pin is drawn. */
export const CLUSTER_MAX_ZOOM = 16
/** Distance in pixels under which pins merge: a little more than the 34px marker. */
export const CLUSTER_RADIUS_PX = 44

export type ClusterItem = {
  id: string
  /** Position in pixels at the zoom the clusters are made for (map.project). */
  x: number
  y: number
  lat: number
  lng: number
  /** Never clustered (a radar pick, the picked point). */
  solo?: boolean
}

export type Cluster = { key: string; ids: string[]; lat: number; lng: number }

export function clusterPoints(items: readonly ClusterItem[], radius: number = CLUSTER_RADIUS_PX): { singles: string[]; clusters: Cluster[] } {
  const singles: string[] = []
  const groups: { leader: ClusterItem; members: ClusterItem[] }[] = []
  const r2 = radius * radius
  const sorted = [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const it of sorted) {
    if (it.solo) { singles.push(it.id); continue }
    const g = groups.find(g => (g.leader.x - it.x) ** 2 + (g.leader.y - it.y) ** 2 <= r2)
    if (g) g.members.push(it)
    else groups.push({ leader: it, members: [it] })
  }
  const clusters: Cluster[] = []
  for (const { members } of groups) {
    if (members.length === 1) { singles.push(members[0].id); continue }
    const ids = members.map(m => m.id)
    clusters.push({
      key: ids.join('|'),
      ids,
      lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
      lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
    })
  }
  return { singles, clusters }
}
