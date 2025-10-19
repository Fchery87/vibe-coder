import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/github-client';
import { getWebhookEventBus, storeWebhookEvent, getWebhookEvents } from '@/lib/webhook-events';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const type = searchParams.get('type') || undefined;

    const events = getWebhookEvents(limit, type);

    return NextResponse.json({ events });
  } catch (err: any) {
    console.error('Webhook GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: true, message: 'Webhook secret not configured' }, { status: 500 });
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';
    const event = request.headers.get('x-github-event') || 'unknown';

    const ok = verifyWebhookSignature(rawBody, secret, signature);
    if (!ok) {
      return NextResponse.json({ error: true, message: 'Invalid signature' }, { status: 401 });
    }

    // Parse event body
    const body = JSON.parse(rawBody);

    // Store the event for polling clients
    storeWebhookEvent(event, body);

    // Minimal logging + shaping a response for debugging
    const info = { event, action: body.action, repository: body.repository?.full_name, sender: body.sender?.login };
    console.log('GitHub webhook received:', info);

    // Broadcast to SSE clients
    try {
      const bus = getWebhookEventBus();
      bus.emit('github:event', { event, body });
      // Also emit more specific channels for convenience
      if (event) bus.emit(`github:${event}`, body);
    } catch (e) {
      console.warn('Webhook broadcast failed:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: true, message: err.message || 'Webhook error' }, { status: 200 });
  }
}
