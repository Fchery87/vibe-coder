"use client";
import { useEffect, useRef } from 'react';

type UseAutoRefreshOptions = {
  enabled: boolean;
  interval?: number; // ms
  onRefresh: () => void;
};

export function useAutoRefresh({ enabled, interval = 30000, onRefresh }: UseAutoRefreshOptions) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    onRefresh(); // initial
    timerRef.current = window.setInterval(() => {
      try { onRefresh(); } catch {}
    }, interval);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, interval, onRefresh]);
}
