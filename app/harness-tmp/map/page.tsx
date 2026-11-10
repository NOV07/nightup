import { Suspense } from 'react'
import MapClient from '@/app/map/MapClient'
import { eventToPoint } from '@/app/lib/mapEvents'
import type { MapPoint } from '@/app/lib/mapFilters'
const all = (v: string) => Object.fromEntries(['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'].map(d => [d, v]))
const spot = (id: string, name: string, lat: number, lng: number, categories: any, subs: string[]): MapPoint => ({ kind: 'spot', id: `s-${id}`, slug: id, name, area: 'Αθήνα', lat, lng, categories, subcategories: subs, description: null, accessNote: null, verifiedNight: false, image: null, hours: all('12:00-2:00') })
const well = (id: string, name: string, lat: number, lng: number, subs: string[]): MapPoint => ({ kind: 'wellness', id: `w-${id}`, slug: id, name, area: 'Αθήνα', lat, lng, categories: ['wellness'], subcategories: subs, description: null, accessNote: null, verifiedNight: true, image: null })
const win = { from: '2026-11-09', to: '2027-01-10' }
const e = (id: string, title: string, date: string, time: string, lat: number, lng: number) => eventToPoint({ id, title, date, time, venue: 'V' + id, city: 'Athens', lat, lng, type: 'music', genres: ['techno'] }, win, '/images/nightup-event-fallback.png')
export default function Page() {
  const events = [e('1', 'Rebetiko Live', '2026-11-10', '21:30:00', 37.9755, 23.7348), e('2', 'Techno Tuesday', '2026-11-10', '23:30:00', 37.9690, 23.7210), e('3', 'Friday', '2026-11-13', '22:00:00', 37.9851, 23.6707)].filter(Boolean) as MapPoint[]
  const points = [spot('a', 'Cocktail Bar', 37.9838, 23.7275, ['drink'], ['cocktail_bar']), spot('b', 'Club', 37.9690, 23.7210, ['nightlife'], ['club']), well('w', 'Λόφος Στρέφη', 37.9890, 23.7350, ['sunset_spot']), ...events]
  return <Suspense><MapClient points={points} /></Suspense>
}
