'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUpload from '../../../components/ui/ImageUpload'

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

export default function SubmitReleasePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    title: '',
    artist: '',
    type: 'single',
    primary_genre: '',
    secondary_genres: [] as string[],
    custom_genre: '',
    label: '',
    release_date: '',
    description: '',
    cover_image: '',
    soundcloud_url: '',
    spotify_url: '',
    apple_music_url: '',
    youtube_url: '',
    bandcamp_url: '',
    beatport_url: '',
    deezer_url: '',
    producers: '',
    composers: '',
    featuring_artists: '',
    mastering_engineer: '',
    artwork_by: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleSecondaryGenre(genre: string) {
    setForm(prev => ({
      ...prev,
      secondary_genres: prev.secondary_genres.includes(genre)
        ? prev.secondary_genres.filter(g => g !== genre)
        : [...prev.secondary_genres, genre]
    }))
  }

  function addCustomGenre() {
    if (!form.custom_genre.trim()) return
    if (!form.secondary_genres.includes(form.custom_genre.trim())) {
      setForm(prev => ({
        ...prev,
        secondary_genres: [...prev.secondary_genres, prev.custom_genre.trim()],
        custom_genre: ''
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

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
      producers: form.producers ? form.producers.split(',').map(s => s.trim()).filter(Boolean) : [],
      composers: form.composers ? form.composers.split(',').map(s => s.trim()).filter(Boolean) : [],
      featuring_artists: form.featuring_artists ? form.featuring_artists.split(',').map(s => s.trim()).filter(Boolean) : [],
      mastering_engineer: form.mastering_engineer || null,
      artwork_by: form.artwork_by || null,
    }

    const res = await fetch('/api/releases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#E8A020]"
  const labelClass = "text-white/60 text-sm mb-1.5 block"

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Submit Release</h1>
          <p className="text-white/50">Your release will be reviewed before going live</p>
        </div>

        {/* Steps */}
        <div className="flex gap-2 mb-8">
          {['Basic Info', 'Links', 'Credits'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-[#E8A020] text-black' : 'bg-white/10 text-white/40'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${step === i + 1 ? 'text-white' : 'text-white/30'}`}>{s}</span>
              {i < 2 && <div className="flex-1 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>

          {/* STEP 1 — Basic Info */}
          {step === 1 && (
            <div className="space-y-5">

              <div>
                <label className={labelClass}>Cover Art</label>
                <ImageUpload
                  folder="releases"
                  onUpload={(url) => setForm(prev => ({ ...prev, cover_image: url }))}
                  existingUrl={form.cover_image}
                />
              </div>

              <div>
                <label className={labelClass}>Release Title *</label>
                <input name="title" placeholder="e.g. Midnight Drive" value={form.title} onChange={handleChange} className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>Artist Name *</label>
                <input name="artist" placeholder="e.g. DJ Void" value={form.artist} onChange={handleChange} className={inputClass} required />
              </div>

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
                    {form.secondary_genres.map(g => (
                      <span key={g} className="text-xs px-3 py-1 rounded-full flex items-center gap-1.5"
                        style={{ backgroundColor: 'rgba(232,160,32,0.15)', color: '#E8A020', border: '1px solid rgba(232,160,32,0.3)' }}>
                        {g}
                        <button type="button" onClick={() => toggleSecondaryGenre(g)} className="hover:opacity-70">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Label (optional)</label>
                <input name="label" placeholder="e.g. Perlon Records" value={form.label} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Release Date</label>
                <input name="release_date" type="date" value={form.release_date} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Description (optional)</label>
                <textarea name="description" placeholder="Tell us about this release..." value={form.description} onChange={handleChange} rows={3} className={`${inputClass} resize-none`} />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!form.title || !form.artist}
                className="w-full bg-[#E8A020] text-black font-bold py-3 rounded-lg hover:bg-[#E8A020]/90 transition disabled:opacity-50"
              >
                Next: Links →
              </button>
            </div>
          )}

          {/* STEP 2 — Links */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>SoundCloud URL</label>
                <input name="soundcloud_url" placeholder="https://soundcloud.com/..." value={form.soundcloud_url} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Spotify URL</label>
                <input name="spotify_url" placeholder="https://open.spotify.com/..." value={form.spotify_url} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Apple Music URL</label>
                <input name="apple_music_url" placeholder="https://music.apple.com/..." value={form.apple_music_url} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>YouTube URL</label>
                <input name="youtube_url" placeholder="https://youtube.com/..." value={form.youtube_url} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Bandcamp URL</label>
                <input name="bandcamp_url" placeholder="https://artist.bandcamp.com/..." value={form.bandcamp_url} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Beatport URL</label>
                <input name="beatport_url" placeholder="https://www.beatport.com/..." value={form.beatport_url} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Deezer URL</label>
                <input name="deezer_url" placeholder="https://www.deezer.com/..." value={form.deezer_url} onChange={handleChange} className={inputClass} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 border border-white/20 text-white py-3 rounded-lg hover:bg-white/5 transition">
                  Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="flex-1 bg-[#E8A020] text-black font-bold py-3 rounded-lg hover:bg-[#E8A020]/90 transition">
                  Next: Credits →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Credits */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-white/40 text-sm">All fields optional. Separate multiple names with commas.</p>

              <div>
                <label className={labelClass}>Featuring Artists</label>
                <input name="featuring_artists" placeholder="e.g. Artist A, Artist B" value={form.featuring_artists} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Producers</label>
                <input name="producers" placeholder="e.g. Producer A, Producer B" value={form.producers} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Composers</label>
                <input name="composers" placeholder="e.g. Composer A, Composer B" value={form.composers} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Mastering Engineer</label>
                <input name="mastering_engineer" placeholder="e.g. John Smith" value={form.mastering_engineer} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Artwork By</label>
                <input name="artwork_by" placeholder="e.g. Jane Doe" value={form.artwork_by} onChange={handleChange} className={inputClass} />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 border border-white/20 text-white py-3 rounded-lg hover:bg-white/5 transition">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#E8A020] text-black font-bold py-3 rounded-lg hover:bg-[#E8A020]/90 transition disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Release →'}
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  )
}
