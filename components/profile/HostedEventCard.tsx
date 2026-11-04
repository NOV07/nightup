import Link from 'next/link'
import CroppedImage from '@/components/ui/CroppedImage'
import { getEventCoverImage, getEventCrop } from '@/app/lib/getEventCoverImage'

export interface HostedEvent {
  id: string
  title: string
  date: string
  time?: string | null
  venue?: string | null
  city?: string | null
  ticket_url?: string | null
  image_url?: string | null
  has_copyright_restriction?: boolean | null
  crop_x?: number | null
  crop_y?: number | null
  crop_width?: number | null
  crop_height?: number | null
}

// Event row used on profile pages (organizer / venue / professional) and,
// later, on the spot page. Data comes in as props; no queries here.
export default function HostedEventCard({ event }: { event: HostedEvent }) {
  return (
    <Link key={event.id} href={`/events/${event.id}`}
      className="flex items-center gap-4 p-4 rounded-2xl transition-opacity hover:opacity-80"
      style={{ backgroundColor: '#111120', border: '0.5px solid rgba(255,255,255,0.07)' }}>
      <div className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ width: '64px', height: '64px' }}>
        <CroppedImage src={getEventCoverImage(event)} alt={event.title} crop={getEventCrop(event)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{event.title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}{event.time ? ` · ${event.time}` : ""} · {event.venue}
        </p>
        <span className="text-xs mt-1 inline-block" style={{ color: '#E8A020' }}>{event.city}</span>
      </div>
      {event.ticket_url && (
        <a href={event.ticket_url} target="_blank" rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-full flex-shrink-0 font-medium"
          style={{ backgroundColor: '#E8A020', color: '#0F0F1A' }}>
          Tickets
        </a>
      )}
    </Link>

  )
}
