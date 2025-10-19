// Simple server-side event bus for GitHub webhooks → SSE
// Ensures a singleton EventEmitter across hot reloads

import { EventEmitter } from 'events';

declare global {
  // eslint-disable-next-line no-var
  var __WEBHOOK_EVENT_BUS__: EventEmitter | undefined;
  var __WEBHOOK_EVENTS__: Array<{ event: string; body: any; timestamp: number }> | undefined;
}

export function getWebhookEventBus(): EventEmitter {
  if (!global.__WEBHOOK_EVENT_BUS__) {
    global.__WEBHOOK_EVENT_BUS__ = new EventEmitter();
    // Avoid memory leak warnings for many SSE clients
    global.__WEBHOOK_EVENT_BUS__.setMaxListeners(100);
  }
  return global.__WEBHOOK_EVENT_BUS__;
}

export function storeWebhookEvent(event: string, body: any) {
  if (!global.__WEBHOOK_EVENTS__) {
    global.__WEBHOOK_EVENTS__ = [];
  }

  global.__WEBHOOK_EVENTS__.push({
    event,
    body,
    timestamp: Date.now(),
  });

  // Keep only last 100 events to prevent memory issues
  if (global.__WEBHOOK_EVENTS__.length > 100) {
    global.__WEBHOOK_EVENTS__ = global.__WEBHOOK_EVENTS__.slice(-100);
  }
}

export function getWebhookEvents(limit = 20, type?: string): Array<{ event: string; body: any; timestamp: number }> {
  if (!global.__WEBHOOK_EVENTS__) {
    return [];
  }

  let events = global.__WEBHOOK_EVENTS__.slice(-limit);

  if (type) {
    events = events.filter(e => e.event === type);
  }

  return events;
}

