import { NextRequest } from 'next/server';
import { getWebhookEventBus } from '@/lib/webhook-events';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const bus = getWebhookEventBus();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const write = (data: any) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          closed = true;
        }
      };

      // Initial hello
      write({ type: 'hello', ts: Date.now() });

      const handler = (payload: any) => write({ type: 'github', payload });
      bus.on('github:event', handler);

      // Keep-alive ping every 25s
      const pingId = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (err) {
          closed = true;
          clearInterval(pingId);
        }
      }, 25000);

      return () => {
        closed = true;
        bus.off('github:event', handler);
        clearInterval(pingId);
        try {
          controller.close();
        } catch {}
      };
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
