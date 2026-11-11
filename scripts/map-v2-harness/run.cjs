const { chromium } = require('playwright')
const OUT = (process.env.SHOTS_DIR || '.') + '/'
const BASE = 'http://localhost:3100/map-harness'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mMQ8Aj5DwAC2gHL1TaZqwAAAABJRU5ErkJggg==', 'base64')
const results = []
const same = (a, b) => a.split(';').length === b.split(';').length && a.split(';').every((v, i) => v.split(',').every((n, j) => Math.abs(Number(n) - Number(b.split(';')[i].split(',')[j])) <= 2))
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); console.log(cond ? 'PASS' : 'FAIL', name, extra) }

async function ctxFor(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'el-GR', ...opts })
  await ctx.route('**/tile.openstreetmap.org/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }))
  await ctx.addInitScript(() => {
    window.__geoCalls = 0
    if (navigator.geolocation) {
      for (const k of ['getCurrentPosition', 'watchPosition']) {
        const orig = navigator.geolocation[k].bind(navigator.geolocation)
        navigator.geolocation[k] = (...a) => { window.__geoCalls++; return orig(...a) }
      }
    }
  })
  return ctx
}
async function open(ctx, qs = '?show=events,spots,wellness') {
  const page = await ctx.newPage()
  await page.clock.setFixedTime(new Date('2026-11-10T19:30:00Z'))
  await page.goto(BASE + qs)
  await page.waitForSelector('[data-testid="public-map"]')
  await page.waitForTimeout(1500)
  return page
}
const shot = (page, n) => page.screenshot({ path: OUT + n + '.png' })

;(async () => {
  const browser = await chromium.launch()
  const geo = { geolocation: { latitude: 37.9764, longitude: 23.7253 }, permissions: ['geolocation'] }

  // 1. markers, cluster, radar
  {
    const ctx = await ctxFor(browser, geo)
    const page = await open(ctx)
    await shot(page, '01-markers-cluster')
    const n = await page.evaluate(() => ({ pins: document.querySelectorAll('.nm-pin').length, clusters: document.querySelectorAll('.nm-cluster').length, radar: document.querySelectorAll('.nm-pin.has-radar').length, geo: window.__geoCalls }))
    console.log(n)
    ok('markers drawn', n.pins > 0)
    ok('geolocation NOT asked on open', n.geo === 0)
    const rc = await page.evaluate(() => document.querySelectorAll('.nm-cluster.has-radar').length)
    ok('every radar pick stays visible: own blip pin, or the halo on the cluster that covers it', n.radar + rc === 2, `pins=${n.radar} clusterHalo=${rc}`)
    // marker shape: round 34px
    const dot = await page.evaluate(() => { const d = document.querySelector('.nm-pin-dot'); const r = d.getBoundingClientRect(); const cs = getComputedStyle(d); return { w: r.width, h: r.height, radius: cs.borderRadius, bg: cs.backgroundImage.slice(0, 40) } })
    ok('marker is a 34px circle', Math.round(dot.w) === 34 && dot.radius === '50%', JSON.stringify(dot))
    const aria = await page.evaluate(() => [...document.querySelectorAll('.nm-pin')].every(b => b.getAttribute('aria-label')))
    ok('all pins have aria-label', aria)
    // radar geometry
    const g = await page.evaluate(() => {
      const pin = document.querySelector('.nm-pin.has-radar') || document.querySelector('.has-radar')
      const rings = [...pin.querySelectorAll('.nm-pin-ring')]
      const anims = rings.map(r => r.getAnimations()[0])
      const t = anims.map(a => a && a.effect.getComputedTiming())
      const kf = anims[0] && anims[0].effect.getKeyframes().map(k => k.transform)
      const dotW = pin.querySelector('.nm-pin-dot').getBoundingClientRect().width
      anims.forEach(a => { a.pause(); a.currentTime = 2199 })
      const ringW = rings[0].getBoundingClientRect().width
      const bw = (getComputedStyle(rings[0]).boxShadow.match(/(\d+(?:\.\d+)?)px spread|inset 0px 0px 0px ([\d.]+)px|0px 0px 0px ([\d.]+)px/)||[]).slice(1).find(Boolean)+'px'
      return { t: t.map(x => x && { d: x.duration, delay: x.delay }), kf, ratio: ringW / dotW, bw }
    })
    console.log(g)
    ok('radar ring: 2.2s, second delayed 0.9s', g.t[0].d === 2200 && g.t[1].delay === 900 && g.t[0].delay === 0)
    ok('radar ring max scale ~1.45x marker', Math.abs(g.ratio - 1.45) < 0.03, String(g.ratio))
    ok('radar ring line 1.5px', g.bw === '1.5px', g.bw)
    // zoom crop on radar for the screenshot
    const box = await page.evaluate(() => { const r = document.querySelector('.nm-pin.has-radar').getBoundingClientRect(); return { x: r.x - 30, y: r.y - 30, width: 104, height: 104 } })
    await page.evaluate(() => document.querySelectorAll('.nm-pin.has-radar .nm-pin-ring').forEach(r => r.getAnimations().forEach(a => { a.currentTime = 1100 })))
    await page.screenshot({ path: OUT + '02-radar-blip-zoom.png', clip: box })
    // click a cluster
    const cl = page.locator('.nm-cluster').first()
    if (await cl.count()) {
      const label = await cl.getAttribute('aria-label')
      const z0 = await page.evaluate(() => [...document.querySelectorAll('.nm-cluster')].map(c => c.getAttribute('aria-label')).join('|') + '#' + document.querySelectorAll('.nm-pin').length)
      await cl.click()
      await page.waitForTimeout(1200)
      const z1 = await page.evaluate(() => [...document.querySelectorAll('.nm-cluster')].map(c => c.getAttribute('aria-label')).join('|') + '#' + document.querySelectorAll('.nm-pin').length)
      ok('cluster opens on tap (zooms in, splits)', z1 !== z0, `${z0} -> ${z1}`)
      await shot(page, '03-cluster-opened')
    } else ok('cluster present', false)
    await ctx.close()
  }

  // 2. near me + list + card
  {
    const ctx = await ctxFor(browser, geo)
    const page = await open(ctx)
    await page.click('[data-testid="near-me"]')
    await page.waitForSelector('[data-testid="near-r-3"]')
    await page.waitForTimeout(1500)
    await shot(page, '04-near-me-3km')
    const st = await page.evaluate(() => ({ url: location.search, ls: JSON.stringify({ ...localStorage }), ss: JSON.stringify({ ...sessionStorage }), cookie: document.cookie, geo: window.__geoCalls, counter: document.querySelector('[data-testid=map-counter]').textContent, user: !!document.querySelector('.nm-user-dot'), circle: !!document.querySelector('path.leaflet-interactive, svg path[stroke-dasharray]') }))
    console.log(st)
    ok('near me asks once, on press', st.geo === 1)
    ok('URL has near=1&r=3 and no coordinates', /near=1&r=3/.test(st.url) && !/37\.|23\.|lat|lng/.test(st.url), st.url)
    ok('nothing stored (localStorage/sessionStorage/cookie)', !/37\.97|23\.72/.test(st.ls + st.ss + st.cookie), st.ls + st.ss + st.cookie)
    ok('blue dot shown', st.user)
    ok('dashed radius circle drawn', st.circle)
    await page.click('[data-testid="near-r-1"]'); await page.waitForTimeout(1200)
    const c1 = await page.textContent('[data-testid=map-counter]')
    await shot(page, '05-near-me-1km')
    await page.click('[data-testid="near-r-all"]'); await page.waitForTimeout(1000)
    const cAll = await page.textContent('[data-testid=map-counter]')
    console.log(c1, '|', cAll)
    // list
    await page.click('[data-testid="near-r-3"]'); await page.waitForTimeout(800)
    await page.click('[data-testid="view-list"]'); await page.waitForTimeout(500)
    await shot(page, '06-list-near')
    const dists = await page.$$eval('[data-testid=map-list-dist]', els => els.map(e => e.textContent))
    console.log(dists)
    ok('list shows distances', dists.length > 0)
    ok('list shows closing soon', (await page.locator('[data-testid=map-list-soon]').count()) === 1)
    await page.click('[data-list-item="s-a3"]'); await page.waitForTimeout(500)
    await shot(page, '07-card-closing-soon-in-list')
    ok('card shows closing soon', (await page.locator('[data-testid=map-card-soon]').count()) === 1)
    await page.keyboard.press('Escape')
    await page.click('[data-list-item="e-r1"]'); await page.waitForTimeout(500)
    await shot(page, '08-card-radar')
    ok('card shows Radar badge', (await page.locator('[data-testid=map-card-radar]').count()) === 1)
    await page.keyboard.press('Escape')
    // back to map, then off
    await page.click('[data-testid="view-map"]'); await page.waitForTimeout(500)
    await page.click('[data-testid="near-me"]'); await page.waitForTimeout(800)
    const off = await page.evaluate(() => ({ url: location.search, user: !!document.querySelector('.nm-user-dot'), chips: !!document.querySelector('[data-testid=near-r-3]'), groups: document.querySelectorAll('.nm-pin').length }))
    ok('near off removes dot, chips, params; keeps groups', !off.user && !off.chips && !/near/.test(off.url) && /show=/.test(off.url) && off.groups > 0, JSON.stringify(off))
    await ctx.close()
  }

  // 3. list without position
  {
    const ctx = await ctxFor(browser)
    const page = await open(ctx)
    await page.click('[data-testid="view-list"]'); await page.waitForTimeout(500)
    await shot(page, '09-list-no-location')
    ok('list without position has no distances', (await page.locator('[data-testid=map-list-dist]').count()) === 0)
    await ctx.close()
  }

  // 4. empty by default + empty list message
  {
    const ctx = await ctxFor(browser)
    const page = await open(ctx, '')
    ok('map opens empty', (await page.locator('.nm-pin').count()) === 0 && (await page.locator('[data-testid=map-empty-hint]').count()) === 1)
    await page.click('[data-testid="view-list"]'); await page.waitForTimeout(400)
    ok('empty list shows the same message', (await page.locator('[data-testid=map-empty-hint]').count()) === 1)
    await shot(page, '10-empty-list')
    await ctx.close()
  }

  // 5. link with near=1: no automatic request
  {
    const ctx = await ctxFor(browser, geo)
    const page = await open(ctx, '?show=spots&near=1&r=5')
    const g = await page.evaluate(() => window.__geoCalls)
    ok('link with near=1 does not ask for location', g === 0)
    await ctx.close()
  }

  // 6. denied / unsupported / far
  {
    const ctx = await ctxFor(browser, { permissions: [] })
    const page = await open(ctx)
    await page.click('[data-testid="near-me"]'); await page.waitForSelector('[data-testid="near-msg"]', { timeout: 15000 })
    await shot(page, '11-near-denied')
    const msg = await page.textContent('[data-testid=near-msg]')
    ok('denied message', /άδεια/.test(msg), msg)
    ok('map still works after denial', (await page.locator('.nm-pin').count()) > 0)
    await ctx.close()
  }
  {
    const ctx = await ctxFor(browser)
    await ctx.addInitScript(() => { Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true }) })
    const page = await open(ctx)
    await page.click('[data-testid="near-me"]'); await page.waitForSelector('[data-testid="near-msg"]')
    await shot(page, '12-near-unsupported')
    ok('unsupported message', /δεν δίνει τοποθεσία/.test(await page.textContent('[data-testid=near-msg]')))
    await ctx.close()
  }
  {
    const ctx = await ctxFor(browser, { geolocation: { latitude: 51.5, longitude: -0.12 }, permissions: ['geolocation'] })
    const page = await open(ctx)
    const vec = () => page.evaluate(() => { const st = document.querySelector('.nm-stage').getBoundingClientRect(); const cx = st.x + st.width / 2, cy = st.y + st.height / 2; return [...document.querySelectorAll('.nm-pin, .nm-cluster')].map(e => { const r = e.getBoundingClientRect(); return Math.round(r.x + r.width / 2 - cx) + ',' + Math.round(r.y + r.height / 2 - cy) }).sort().join(';') })
    const before = await vec()
    await page.click('[data-testid="near-me"]'); await page.waitForSelector('[data-testid="near-msg"]')
    await page.waitForTimeout(800)
    const after = await page.evaluate(() => ({ user: !!document.querySelector('.nm-user-dot'), pins: document.querySelectorAll('.nm-pin').length }))
    after.t = await vec()
    await shot(page, '13-near-far')
    ok('far away: message, map unchanged, no dot', /100 χλμ/.test(await page.textContent('[data-testid=near-msg]')) && !after.user && same(before, after.t) && after.pins > 0, 'view centre unchanged (±2px)')
    await ctx.close()
  }

  // 7. reduced motion
  {
    const ctx = await ctxFor(browser, { reducedMotion: 'reduce' })
    const page = await open(ctx)
    const r = await page.evaluate(() => {
      const pin = document.querySelector('.nm-pin.has-radar'); const rings = [...pin.querySelectorAll('.nm-pin-ring')]
      return { anims: rings.map(x => x.getAnimations().length), r1: getComputedStyle(rings[0]).opacity, r1d: getComputedStyle(rings[0]).display, r2d: getComputedStyle(rings[1]).opacity }
    })
    console.log(r)
    ok('reduced motion: no animation, static halo', r.anims.every(n => n === 0) && r.r1d === 'block' && Number(r.r1) > 0 && Number(r.r2d) === 0, JSON.stringify(r))
    await shot(page, '14-reduced-motion')
    await ctx.close()
  }

  // 8. layout at 390: nothing new covers navbar / player; map fills height
  {
    const ctx = await ctxFor(browser, geo)
    const page = await open(ctx)
    const base = await page.evaluate(() => document.querySelector('.nm-stage').getBoundingClientRect().height)
    console.log('stage height near off', base)
    await page.click('[data-testid="near-me"]'); await page.waitForSelector('[data-testid="near-r-3"]'); await page.waitForTimeout(800)
    const lay = await page.evaluate(() => {
      const R = e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height } }
      const fixed = [...document.querySelectorAll('body *')].filter(e => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().width > 100 && !e.closest('.nm-root')).map(e => ({ cls: (e.className || e.tagName).toString().slice(0, 40), ...R(e) }))
      const root = document.querySelector('.nm-root')
      return { fixed, root: R(root), stage: R(document.querySelector('.nm-stage')), near: R(document.querySelector('.nm-near')), doc: document.documentElement.scrollHeight, vh: innerHeight, sw: document.documentElement.scrollWidth }
    })
    console.log(JSON.stringify(lay))
    ok('no horizontal overflow at 390', lay.sw <= 390, String(lay.sw))
    ok('stage fills a good part of the screen', lay.stage.h > 250, String(lay.stage.h))
    const hits = await page.evaluate(() => {
      const root = document.querySelector('.nm-root'); const out = {}
      for (const sel of ['[data-testid=near-me]', '[data-testid=view-list]', '[data-testid=near-r-all]', '.nm-stage', '.nm-legend']) {
        const r = document.querySelector(sel).getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, Math.min(r.y + r.height / 2, innerHeight - 1))
        out[sel] = !!(e && root.contains(e))
      }
      return out
    })
    ok('new controls are not covered by navbar / player (hit-test)', Object.values(hits).every(Boolean), JSON.stringify(hits))
    const navBottom = lay.root.top, playerTop = Math.min(...lay.fixed.filter(f => f.cls.includes('radio-strip')).map(f => f.top))
    ok('stage and controls sit between navbar and player', lay.near.top >= navBottom && lay.stage.bottom <= playerTop, `nav=${navBottom} near=${lay.near.top} stageBottom=${lay.stage.bottom} player=${playerTop}`)
    // card open: sheet inside stage
    await page.click('[data-testid="view-list"]'); await page.click('[data-list-item="s-a3"]'); await page.waitForTimeout(500)
    const card = await page.evaluate(() => { const c = document.querySelector('.nm-card').getBoundingClientRect(); const s = document.querySelector('.nm-stage').getBoundingClientRect(); return { cardTop: c.top, cardBottom: c.bottom, sBottom: s.bottom, sTop: s.top } })
    ok('card stays inside the map stage', card.cardBottom <= card.sBottom + 1 && card.cardTop >= card.sTop - 1, JSON.stringify(card))
    await shot(page, '15-layout-390')
    await ctx.close()
  }
  await browser.close()
  console.log('\n' + results.filter(r => r[0] === 'FAIL').length + ' failed of ' + results.length)
})().catch(e => { console.error(e); process.exit(1) })
