import { useState, useEffect, useCallback } from 'react';
import { WebhookEvent } from '@/lib/github-types';

interface UseWebhookEventsOptions {
  enabled?: boolean;
  pollInterval?: number;
  limit?: number;
  type?: string;
}

export function useWebhookEvents(options: UseWebhookEventsOptions = {}) {
  const {
    enabled = true,
    pollInterval = 5000,
    limit = 20,
    type,
  } = options;

  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(type && { type }),
      });

      const res = await fetch(`/api/github/webhook?${params.toString()}`);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setEvents(data.events || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch webhook events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [enabled, limit, type]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(fetchEvents, pollInterval);
    return () => clearInterval(interval);
  }, [enabled, pollInterval, fetchEvents]);

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
  };
}

