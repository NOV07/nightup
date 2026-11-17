import { NETWORK } from './searchData.ts'

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
export function matchProfessionalRole(specialty: string): string | null {
  return PROFESSIONAL_ROLES.find(role => specialty.endsWith(` - ${role}`)) ?? null
}

/**
 * The `profiles` update applied when an upgrade request is approved. Shared by
 * app/api/admin/approve-upgrade/route.ts and scripts/test-artist-network.mjs so
 * the test exercises the real logic.
 *
 * - No structured type (request predates requested_type): plan_tier only; the
 *   admin sets profile_type by hand.
 * - artist: network_tab 'Artists', so the profile shows up in /network/artists
 *   straight away. The role (network_subcategory) stays optional.
 * - professional: network_category from the specialty when it matches a role.
 *   network_tab is NOT set here (the Professional wizard owns it).
 * - everything else (organizer, spot, venue): unchanged.
 */
export function buildApprovalUpdate(
  requestedType: string | null | undefined,
  specialty: string | null | undefined,
): Record<string, string> {
  if (!requestedType) return { plan_tier: 'creator' }

  const update: Record<string, string> = {
    plan_tier: 'creator',
    profile_type: requestedType,
  }

  if (requestedType === 'artist') {
    update.network_tab = 'Artists'
  } else if (requestedType === 'professional') {
    const role = matchProfessionalRole(specialty ?? '')
    if (role) update.network_category = role
  }
  return update
}
