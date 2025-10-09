import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/github-client";
import { WebhookEvent } from "@/lib/github-types";

// In-memory event store for demo (use Redis/DB in production)
const webhookEvents: WebhookEvent[] = [];
const MAX_EVENTS = 100;

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-hub-signature-256");
    const rawBody = await request.text();

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(
      rawBody,
      process.env.GITHUB_WEBHOOK_SECRET!,
      signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const eventType = request.headers.get("x-github-event");

    if (!eventType) {
      return NextResponse.json(
        { error: "Missing event type" },
        { status: 400 }
      );
    }

    // Create webhook event
    const webhookEvent: WebhookEvent = {
      type: eventType as WebhookEvent['type'],
      action: payload.action,
      data: payload,
      timestamp: new Date().toISOString(),
    };

    // Store event
    webhookEvents.unshift(webhookEvent);
    if (webhookEvents.length > MAX_EVENTS) {
      webhookEvents.pop();
    }

    // Log event for debugging
    console.log(`[Webhook] ${eventType}:${payload.action || 'unknown'}`, {
      repo: payload.repository?.full_name,
      sender: payload.sender?.login,
    });

    // Handle specific event types
    switch (eventType) {
      case 'push':
        console.log(`[Webhook] Push to ${payload.ref} in ${payload.repository?.full_name}`);
        break;

      case 'pull_request':
        console.log(`[Webhook] PR #${payload.pull_request?.number} ${payload.action} in ${payload.repository?.full_name}`);
        break;

      case 'issue_comment':
      case 'pull_request_review_comment':
        console.log(`[Webhook] Comment ${payload.action} in ${payload.repository?.full_name}`);
        break;

      case 'check_suite':
      case 'check_run':
        console.log(`[Webhook] Check ${payload.action} in ${payload.repository?.full_name}`);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Get recent webhook events
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const type = searchParams.get("type");

  let events = [...webhookEvents];

  if (type) {
    events = events.filter(e => e.type === type);
  }

  return NextResponse.json({
    events: events.slice(0, limit),
    total: webhookEvents.length,
  });
}
