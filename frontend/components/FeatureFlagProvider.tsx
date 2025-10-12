/**
 * FeatureFlagProvider
 * Context provider for feature flags
 * Wraps the app to provide feature flag access throughout
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlag';
import { type FeatureFlag, setFeatureFlags, toggleFeatureFlag, resetFeatureFlags } from '@/lib/feature-flags';

interface FeatureFlagContextValue {
  flags: ReturnType<typeof useFeatureFlags>;
  setFlags: typeof setFeatureFlags;
  toggleFlag: typeof toggleFeatureFlag;
  resetFlags: typeof resetFeatureFlags;
  isEnabled: (flag: FeatureFlag) => boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

interface FeatureFlagProviderProps {
  children: ReactNode;
}

export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const flags = useFeatureFlags();

  const contextValue: FeatureFlagContextValue = {
    flags,
    setFlags: setFeatureFlags,
    toggleFlag: toggleFeatureFlag,
    resetFlags: resetFeatureFlags,
    isEnabled: (flag: FeatureFlag) => flags[flag] ?? false,
  };

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook to access feature flag context
 * Must be used within FeatureFlagProvider
 */
export function useFeatureFlagContext() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlagContext must be used within FeatureFlagProvider');
  }
  return context;
}
