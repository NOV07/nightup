import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let body: { text: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text } = body
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Return original text if no API key configured
    return NextResponse.json({ translation: text })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `Translate the following Greek text to English for a nightlife/events platform. Return ONLY the translated text with no extra commentary, quotes, or explanation.\n\n${text}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error('[translate] Anthropic error:', response.status)
      return NextResponse.json({ translation: text })
    }

    const data = await response.json()
    const translation = data?.content?.[0]?.text ?? text
    return NextResponse.json({ translation })
  } catch (err) {
    console.error('[translate] exception:', err)
    return NextResponse.json({ translation: text })
  }
}
