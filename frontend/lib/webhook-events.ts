// Simple server-side event bus for GitHub webhooks → SSE
// Ensures a singleton EventEmitter across hot reloads

import { EventEmitter } from 'events';

declare global {
  // eslint-disable-next-line no-var
  var __WEBHOOK_EVENT_BUS__: EventEmitter | undefined;
}

export function getWebhookEventBus(): EventEmitter {
  if (!global.__WEBHOOK_EVENT_BUS__) {
    global.__WEBHOOK_EVENT_BUS__ = new EventEmitter();
    // Avoid memory leak warnings for many SSE clients
    global.__WEBHOOK_EVENT_BUS__.setMaxListeners(100);
  }
  return global.__WEBHOOK_EVENT_BUS__;
}

