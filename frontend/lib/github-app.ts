/**
 * GitHub App Utilities
 * Handles GitHub App authentication and installation tokens
 * Uses installation tokens for repo access (more secure than PATs)
 */

import { Octokit } from '@octokit/rest';

export interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    type: string;
    avatar_url: string;
  };
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
  }>;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  private: boolean;
  default_branch: string;
}

/**
 * Create Octokit client with installation token
 * Installation tokens are short-lived and scoped to specific repos
 */
export function createGitHubAppClient(installationToken: string): Octokit {
  return new Octokit({
    auth: installationToken,
    userAgent: 'vibe-coder/1.0.0',
  });
}

/**
 * Parse repository full name into owner and repo
 */
export function parseRepoFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository full name: ${fullName}`);
  }
  return { owner, repo };
}

/**
 * Get installation token from server API
 * Tokens expire after 1 hour, so we fetch fresh ones as needed
 */
export async function getInstallationToken(installationId: number): Promise<string | null> {
  try {
    const response = await fetch(`/api/github/installation?id=${installationId}`);
    if (!response.ok) {
      console.error('Failed to get installation token:', response.statusText);
      return null;
    }
    const data = await response.json();
    return data.token || null;
  } catch (error) {
    console.error('Error fetching installation token:', error);
    return null;
  }
}

/**
 * Check if GitHub App is installed for a repository
 */
export async function isGitHubAppInstalled(owner: string, repo: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/github/installation/check?owner=${owner}&repo=${repo}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.installed === true;
  } catch (error) {
    console.error('Error checking GitHub App installation:', error);
    return false;
  }
}

/**
 * Get GitHub App installation URL
 */
export function getGitHubAppInstallUrl(): string {
  const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'vibe-coder';
  return `https://github.com/apps/${appName}/installations/new`;
}

/**
 * Cache for installation tokens (in-memory)
 * Tokens are valid for 1 hour, we cache for 50 minutes to be safe
 */
const tokenCache = new Map<number, { token: string; expiresAt: number }>();

export async function getCachedInstallationToken(installationId: number): Promise<string | null> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const token = await getInstallationToken(installationId);
  if (token) {
    tokenCache.set(installationId, {
      token,
      expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutes
    });
  }

  return token;
}

/**
 * Clear token cache (useful for logout or error recovery)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}
