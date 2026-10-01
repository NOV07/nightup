import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../lib/supabase'
import { verifyAdminToken } from '@/app/lib/adminAuth'
import { sendEmail, escapeHtml } from '@/app/lib/email'
import { NETWORK } from '@/app/lib/searchData'

// The stable network_category values a 'professional' request's specialty can
// end with — same source as ROLES_BY_GROUP in ProfessionalFormSteps.tsx.
// Matched by suffix (the UpgradeModal builds specialty as "<type label> -
// <role>"), the same technique app/api/upgrade-request/route.ts uses to gate
// 'venue' requests.
const PROFESSIONAL_ROLES = [
  ...Object.keys(NETWORK.Professionals['For Events']),
  ...Object.keys(NETWORK.Professionals['For Artists']),
]

/** The role a professional request's specialty ends with, or null when it
 *  doesn't match any known role — e.g. a request submitted before this
 *  matching existed. The Professional wizard then just opens with nothing
 *  preselected, same as today. */
function matchProfessionalRole(specialty: string): string | null {
  return PROFESSIONAL_ROLES.find(role => specialty.endsWith(` - ${role}`)) ?? null
}

// What each creator type actually gets in the dashboard, and where to start.
// Keys match REQUESTABLE_TYPES in app/api/upgrade-request/route.ts.
const APPROVAL_COPY: Record<string, { label: string; perks: string[]; start: string }> = {
  organizer: {
    label: 'Event Organiser',
    perks: ['Ανέβασμα events', 'Προφίλ στο Network', 'Στατιστικά για τα events σου (προβολές, θα πάνε, ενδιαφέρονται)'],
    start: 'https://nightup.gr/dashboard/events/new',
  },
  artist: {
    label: 'Artist',
    perks: ['Προφίλ στο Network', 'Music releases', 'Στατιστικά για το προφίλ σου'],
    start: 'https://nightup.gr/submit/release',
  },
  spot: {
    label: 'Spot',
    perks: ['Καταχώρηση του spot σου', 'Ανέβασμα events για το spot σου', 'Στατιστικά για τα events σου'],
    start: 'https://nightup.gr/dashboard/spots/new',
  },
  professional: {
    label: 'Professional',
    perks: ['Επαγγελματική καταχώρηση στο Network'],
    start: 'https://nightup.gr/dashboard/professional',
  },
  venue: {
    label: 'Venue',
    perks: [
      'Σελίδα του χώρου σου στο Network',
      'Εμφάνιση στο «Φτιάξε το πάρτι σου» όταν κάποιος ψάχνει χώρο',
      'Αγγελίες',
      'Ανέβασμα events για τον χώρο σου',
    ],
    start: 'https://nightup.gr/dashboard/venue',
  },
}

// Requests from before requested_type existed get the dashboard as a neutral start.
const DEFAULT_START = 'https://nightup.gr/dashboard'

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.cookies.get('admin_auth')?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { request_id, action } = await req.json()
  if (!request_id || !action || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Get the upgrade request
  const { data: request, error: fetchError } = await supabase
    .from('upgrade_requests')
    .select('*')
    .eq('id', request_id)
    .single()

  if (fetchError || !request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Requests submitted before requested_type existed carry no structured type —
  // approve them as creator but leave profile_type alone and tell the admin.
  const needsManualType = action === 'approved' && !request.requested_type

  // A 'professional' request's specialty carries the stable role it was
  // submitted with (see UpgradeModal) — recover it so the Professional
  // wizard can open with the right group/role preselected.
  const matchedRole = request.requested_type === 'professional'
    ? matchProfessionalRole(request.specialty ?? '')
    : null

  if (action === 'approved') {
    // Update profile plan_tier (and profile_type, when we know it). Do this before
    // flipping the request status so a failure leaves the request pending and retryable.
    const { error: profileError } = await supabase
      .from('profiles')
      .update(
        needsManualType
          ? { plan_tier: 'creator' }
          : {
              plan_tier: 'creator',
              profile_type: request.requested_type,
              ...(matchedRole ? { network_category: matchedRole } : {}),
            }
      )
      .eq('id', request.user_id)

    // Don't mark it approved or email the user if the profile never actually changed.
    if (profileError) {
      return NextResponse.json(
        { error: `Profile update failed: ${profileError.message}` },
        { status: 500 }
      )
    }
  }

  // Update request status
  await supabase
    .from('upgrade_requests')
    .update({ status: action })
    .eq('id', request_id)

  if (action === 'approved') {
    // Email the user. The approval itself is already committed, so a failed
    // send is logged inside sendEmail rather than turned into an error here.
    const copy = APPROVAL_COPY[request.requested_type as string]
    const start = copy?.start ?? DEFAULT_START
    const startLabel = start.replace('https://', '')
    const approvedLine = copy
      ? `Η αίτησή σου ως ${copy.label} εγκρίθηκε. Από τώρα έχεις πρόσβαση σε:`
      : 'Η αίτησή σου εγκρίθηκε.'

    await sendEmail({
      route: 'approve-upgrade',
      recipientType: 'creator',
      to: request.email,
      subject: 'Έγινες Creator στο Nightup',
      html: `
        <h2>Καλωσήρθες στο Nightup ως Creator!</h2>
        <p>Γεια σου <strong>@${escapeHtml(request.username)}</strong>,</p>
        <p>${approvedLine}</p>
        ${copy ? `<ul>${copy.perks.map((p) => `<li>${p}</li>`).join('')}</ul>` : ''}
        <p>Ξεκίνα από εδώ: <a href="${start}">${startLabel}</a></p>
        <p>Η ομάδα του Nightup</p>
      `,
      text: [
        `Γεια σου @${request.username},`,
        '',
        approvedLine,
        ...(copy ? copy.perks.map((p) => `- ${p}`) : []),
        '',
        `Ξεκίνα από εδώ: ${start}`,
        '',
        'Η ομάδα του Nightup',
      ].join('\n'),
    })
  }

  return NextResponse.json({ success: true, needsManualType })
}
