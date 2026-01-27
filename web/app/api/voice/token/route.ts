import { NextResponse } from 'next/server';

/**
 * POST /api/voice/token
 *
 * Generates an ephemeral OpenAI Realtime API token for client-side voice sessions.
 *
 * SECURITY: The main OPENAI_API_KEY is never exposed to the client.
 * Ephemeral tokens (starting with "ek_") provide time-limited access.
 *
 * @returns {token: string, expiresAt: number} - Ephemeral token and expiration timestamp
 */
export async function POST() {
  try {
    // Validate API key is configured
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('[Voice Token] OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Generate ephemeral token via OpenAI Realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Voice Token] OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate ephemeral token' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract token and expiration
    const token = data.client_secret?.value;
    const expiresAt = data.client_secret?.expires_at;

    if (!token || !expiresAt) {
      console.error('[Voice Token] Invalid response from OpenAI:', data);
      return NextResponse.json(
        { error: 'Invalid token response' },
        { status: 500 }
      );
    }

    // Verify token format (should start with "ek_")
    if (!token.startsWith('ek_')) {
      console.warn('[Voice Token] Unexpected token format:', token.substring(0, 10));
    }

    console.log('[Voice Token] Generated successfully, expires:', new Date(expiresAt * 1000).toISOString());

    return NextResponse.json({
      token,
      expiresAt: expiresAt * 1000, // Convert to milliseconds
    });

  } catch (error) {
    console.error('[Voice Token] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET requests are not supported
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate tokens.' },
    { status: 405 }
  );
}
