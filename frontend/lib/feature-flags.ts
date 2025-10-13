/**
 * Feature Flags System
 * Controls visibility of sidebar tools and experimental features
 * Stored in localStorage, configurable via Settings panel
 */

export const FEATURE_FLAGS = {
  // Sidebar Tools (Phase 0-8)
  enableExplorer: false,
  enableSourceControl: false,
  enablePR: false,
  enableSearch: false,
  enablePreview: false,
  enableTickets: false,
  enableWorkflows: false,

  // Assistant Modes
  enableAskMode: false,

  // Integration Features
  enableGitHubApp: false,
  enableWebhooks: false,
  enableJira: false,
  enableLinear: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

const STORAGE_KEY = 'vibe-coder-feature-flags';

/**
 * Get feature flags from localStorage with fallback to defaults
 */
export function getFeatureFlags(): typeof FEATURE_FLAGS {
  if (typeof window === 'undefined') {
    return FEATURE_FLAGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...FEATURE_FLAGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load feature flags:', error);
  }

  return FEATURE_FLAGS;
}

/**
 * Update feature flags in localStorage
 */
export function setFeatureFlags(flags: Partial<typeof FEATURE_FLAGS>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getFeatureFlags();
    const updated = { ...current, ...flags };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('feature-flags-updated', { detail: updated }));
  } catch (error) {
    console.error('Failed to save feature flags:', error);
  }
}

/**
 * Toggle a single feature flag
 */
export function toggleFeatureFlag(flag: FeatureFlag): void {
  const current = getFeatureFlags();
  setFeatureFlags({ [flag]: !current[flag] });
}

/**
 * Reset all flags to defaults
 */
export function resetFeatureFlags(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('feature-flags-updated', { detail: FEATURE_FLAGS }));
  } catch (error) {
    console.error('Failed to reset feature flags:', error);
  }
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const flags = getFeatureFlags();
  return flags[flag] ?? false;
}
