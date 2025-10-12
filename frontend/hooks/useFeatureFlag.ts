/**
 * useFeatureFlag Hook
 * Reactive hook for checking feature flag status
 * Automatically updates when flags change
 */

import { useState, useEffect } from 'react';
import { type FeatureFlag, getFeatureFlags, isFeatureEnabled } from '@/lib/feature-flags';

/**
 * Hook to check if a specific feature flag is enabled
 * Automatically updates when flags change via localStorage
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const [isEnabled, setIsEnabled] = useState(() => isFeatureEnabled(flag));

  useEffect(() => {
    // Update when flags change
    const handleFlagsUpdate = (event: CustomEvent) => {
      const flags = event.detail;
      setIsEnabled(flags[flag] ?? false);
    };

    window.addEventListener('feature-flags-updated', handleFlagsUpdate as EventListener);

    // Also check on mount in case flags changed before component mounted
    setIsEnabled(isFeatureEnabled(flag));

    return () => {
      window.removeEventListener('feature-flags-updated', handleFlagsUpdate as EventListener);
    };
  }, [flag]);

  return isEnabled;
}

/**
 * Hook to get all feature flags
 * Returns reactive object that updates when flags change
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState(() => getFeatureFlags());

  useEffect(() => {
    const handleFlagsUpdate = (event: CustomEvent) => {
      setFlags(event.detail);
    };

    window.addEventListener('feature-flags-updated', handleFlagsUpdate as EventListener);

    // Check on mount
    setFlags(getFeatureFlags());

    return () => {
      window.removeEventListener('feature-flags-updated', handleFlagsUpdate as EventListener);
    };
  }, []);

  return flags;
}
