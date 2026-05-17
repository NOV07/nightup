'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUpload from '../../../../../components/ui/ImageUpload'

const RELEASE_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'ep', label: 'EP' },
  { value: 'album', label: 'Album' },
  { value: 'mix', label: 'Mix' },
  { value: 'compilation', label: 'Compilation' },
  { value: 'live_set', label: 'Live Set' },
]

const GENRES = [
  'Techno', 'House', 'Deep House', 'Minimal', 'Drum & Bass', 'Trance',
  'Hip-Hop', 'R&B', 'Afrobeats', 'Reggaeton',
  'Laika', 'Entechno', 'Rebetiko', 'Dimotika',
  'Rock', 'Jazz', 'Classical', 'Blues',
  'Electronic', 'Ambient', 'Experimental', 'Other',
]

export default function EditReleaseClient({ release }: { release: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    title: release.title ?? '',
    artist: release.artist ?? '',
    type: release.type ?? 'single',
    primary_genre: release.primary_genre ?? '',
    secondary_genres: release.secondary_genres ?? [],
    custom_genre: '',
    label: release.label ?? '',
    release_date: release.release_date ?? '',
    description: release.description ?? '',
    cover_image: release.cover_image ?? '',
    soundcloud_url: release.soundcloud_url ?? '',
    spotify_url: release.spotify_url ?? '',
    apple_music_url: release.apple_music_url ?? '',
    youtube_url: release.youtube_url ?? '',
    bandcamp_url: release.bandcamp_url ?? '',
    beatport_url: release.beatport_url ?? '',
    deezer_url: release.deezer_url ?? '',
    producers: Array.isArray(release.producers) ? release.producers.join(', ') : (release.producers ?? ''),
    composers: Array.isArray(release.composers) ? release.composers.join(', ') : (release.composers ?? ''),
    featuring_artists: Array.isArray(release.featuring_artists) ? release.featuring_artists.join(', ') : (release.featuring_artists ?? ''),
    mastering_engineer: release.mastering_engineer ?? '',
    artwork_by: release.artwork_by ?? '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleSecondaryGenre(genre: string) {
    setForm(prev => ({
      ...prev,
      secondary_genres: prev.secondary_genres.includes(genre)
        ? prev.secondary_genres.filter((g: string) => g !== genre)
        : [...prev.secondary_genres, genre],
    }))
  }

  function addCustomGenre() {
    const g = form.custom_genre.trim()
    if (!g || form.secondary_genres.includes(g)) return
    setForm(prev => ({ ...prev, secondary_genres: [...prev.secondary_genres, g], custom_genre: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)

    const payload = {
      title: form.title,
      artist: form.artist,
      type: form.type,
      primary_genre: form.primary_genre,
      secondary_genres: form.secondary_genres,
      label: form.label || null,
      release_date: form.release_date || null,
      description: form.description || null,
      cover_image: form.cover_image || null,
      soundcloud_url: form.soundcloud_url || null,
      spotify_url: form.spotify_url || null,
      apple_music_url: form.apple_music_url || null,
      youtube_url: form.youtube_url || null,
      bandcamp_url: form.bandcamp_url || null,
      beatport_url: form.beatport_url || null,
      deezer_url: form.deezer_url || null,
      producers: form.producers ? form.producers.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      composers: form.composers ? form.composers.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      featuring_artists: form.featuring_artists ? form.featuring_artists.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      mastering_engineer: form.mastering_engineer || null,
      artwork_by: form.artwork_by || null,
    }

    const res = await fetch(`/api/releases/${release.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }

    setSaved(true)
    setTimeout(() => router.push('/dashboard'), 1200)
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#E8A020]"
  const labelClass = "text-white/60 text-sm mb-1.5 block"

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Edit Release</h1>
          <p className="text-white/40 text-sm">{form.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Cover Art */}
          <div>
            <label className={labelClass}>Cover Art</label>
            <ImageUpload
              folder="releases"
              onUpload={(url) => setForm(prev => ({ ...prev, cover_image: url }))}
              existingUrl={form.cover_image}
            />
          </div>

          {/* Title & Artist */}
          <div>
            <label className={labelClass}>Release Title *</label>
            <input name="title" value={form.title} onChange={handleChange} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Artist Name *</label>
            <input name="artist" value={form.artist} onChange={handleChange} className={inputClass} required />
          </div>

          {/* Type */}
          <div>
            <label className={labelClass}>Release Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {RELEASE_TYPES.map(rt => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, type: rt.value }))}
                  className="py-2.5 px-3 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: form.type === rt.value ? '#E8A020' : 'rgba(255,255,255,0.05)',
                    color: form.type === rt.value ? '#0F0F1A' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${form.type === rt.value ? '#E8A020' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Genre */}
          <div>
            <label className={labelClass}>Primary Genre</label>
            <div className="relative">
              <select
                name="primary_genre"
                value={form.primary_genre}
                onChange={handleChange}
                className={`${inputClass} cursor-pointer appearance-none`}
                style={{ backgroundColor: '#0F0F1A', color: form.primary_genre ? 'white' : 'rgba(255,255,255,0.4)' }}
              >
                <option value="" style={{ backgroundColor: '#0F0F1A', color: 'rgba(255,255,255,0.4)' }}>Select genre...</option>
                {GENRES.map(g => (
                  <option key={g} value={g} style={{ backgroundColor: '#0F0F1A', color: 'white' }}>{g}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#E8A020' }}>▾</div>
            </div>
          </div>

          {/* Secondary Genres */}
          <div>
            <label className={labelClass}>Secondary Genres</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {GENRES.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleSecondaryGenre(g)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{
                    backgroundColor: form.secondary_genres.includes(g) ? 'rgba(232,160,32,0.2)' : 'rgba(255,255,255,0.05)',
                    color: form.secondary_genres.includes(g) ? '#E8A020' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${form.secondary_genres.includes(g) ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                placeholder="Add custom genre..."
                value={form.custom_genre}
                onChange={e => setForm(prev => ({ ...prev, custom_genre: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomGenre() } }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={addCustomGenre}
                className="px-4 py-3 rounded-lg text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.2)' }}
              >
                Add
              </button>
            </div>
            {form.secondary_genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.secondary_genres.map((g: string) => (
                  <span key={g} className="text-xs px-3 py-1 rounded-full flex items-center gap-1.5"
                    style={{ backgroundColor: 'rgba(232,160,32,0.15)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.3)' }}>
                    {g}
                    <button type="button" onClick={() => toggleSecondaryGenre(g)} className="hover:opacity-70">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Label & Date */}
          <div>
            <label className={labelClass}>Label (optional)</label>
            <input name="label" value={form.label} onChange={handleChange} placeholder="e.g. Perlon Records" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Release Date</label>
            <input name="release_date" type="date" value={form.release_date} onChange={handleChange} className={inputClass} />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={`${inputClass} resize-none`} />
          </div>

          {/* Links */}
          <div className="pt-2 border-t border-white/5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Streaming Links</p>
            <div className="space-y-4">
              {[
                { name: 'soundcloud_url', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
                { name: 'spotify_url', label: 'Spotify', placeholder: 'https://open.spotify.com/...' },
                { name: 'apple_music_url', label: 'Apple Music', placeholder: 'https://music.apple.com/...' },
                { name: 'youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/...' },
                { name: 'bandcamp_url', label: 'Bandcamp', placeholder: 'https://artist.bandcamp.com/...' },
                { name: 'beatport_url', label: 'Beatport', placeholder: 'https://www.beatport.com/...' },
                { name: 'deezer_url', label: 'Deezer', placeholder: 'https://www.deezer.com/...' },
              ].map(field => (
                <div key={field.name}>
                  <label className={labelClass}>{field.label}</label>
                  <input name={field.name} value={(form as any)[field.name]} onChange={handleChange} placeholder={field.placeholder} className={inputClass} />
                </div>
              ))}
            </div>
          </div>

          {/* Credits */}
          <div className="pt-2 border-t border-white/5">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Credits <span className="normal-case">(comma-separated)</span></p>
            <div className="space-y-4">
              {[
                { name: 'featuring_artists', label: 'Featuring Artists', placeholder: 'e.g. Artist A, Artist B' },
                { name: 'producers', label: 'Producers', placeholder: 'e.g. Producer A, Producer B' },
                { name: 'composers', label: 'Composers', placeholder: 'e.g. Composer A' },
                { name: 'mastering_engineer', label: 'Mastering Engineer', placeholder: 'e.g. John Smith' },
                { name: 'artwork_by', label: 'Artwork By', placeholder: 'e.g. Jane Doe' },
              ].map(field => (
                <div key={field.name}>
                  <label className={labelClass}>{field.label}</label>
                  <input name={field.name} value={(form as any)[field.name]} onChange={handleChange} placeholder={field.placeholder} className={inputClass} />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {saved && <p className="text-green-400 text-sm">✓ Saved! Redirecting...</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 border border-white/20 text-white py-3 rounded-lg hover:bg-white/5 transition text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || saved}
              className="flex-1 bg-[#E8A020] text-black font-bold py-3 rounded-lg hover:bg-[#E8A020]/90 transition disabled:opacity-50 text-sm"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
