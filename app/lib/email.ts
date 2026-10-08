import { Resend } from 'resend'

// Must be an address on a domain verified in Resend. The old
// 'onboarding@resend.dev' sandbox sender only delivers to the Resend account
// owner, so mail to anyone else (e.g. creators being approved) never arrived.
const FROM = process.env.RESEND_FROM || 'Nightup <noreply@nightup.gr>'
const REPLY_TO = 'nightupsocial@gmail.com'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailInput {
  to: string
  subject: string
  html: string
  /** Plain-text alternative. Mail without one scores worse with spam filters. */
  text: string
  /** Logged alongside failures, e.g. 'approve-upgrade'. */
  route: string
  /** Who the mail is for, e.g. 'admin' or 'creator', for the failure log. */
  recipientType: string
}

/**
 * Sends a transactional email and reports whether it went out.
 *
 * Never throws: the Resend SDK returns `{ data, error }` instead of throwing,
 * and a mail failure should not undo the request that triggered it. Failures
 * are logged with enough context to find them in the runtime logs.
 */
export async function sendEmail({ to, subject, html, text, route, recipientType }: SendEmailInput): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({ from: FROM, to, replyTo: REPLY_TO, subject, html, text })
    if (error) {
      console.error(`[email] ${route}: send to ${recipientType} failed`, { name: error.name, message: error.message })
      return false
    }
    return true
  } catch (err) {
    const e = err as { name?: string; message?: string } | null
    console.error(`[email] ${route}: send to ${recipientType} threw`, { name: e?.name, message: e?.message })
    return false
  }
}

/** Escapes user-supplied text before it goes into an email's HTML body. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
