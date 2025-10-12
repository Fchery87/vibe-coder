/**
 * GitHub Code Search API
 * GET /api/github/search - Search code across repository
 *
 * Rate Limits:
 * - Code search: 10 requests per minute (authenticated)
 * - Caching: 2 minutes to reduce API calls
 */

import { NextRequest, NextResponse } from 'next/server';
import { getInstallationClient } from '@/lib/github-client';

// In-memory cache for search results (2 minute TTL)
const searchCache = new Map<string, { results: any; expiresAt: number }>();

// Rate limit tracking (per installation)
const rateLimitTracker = new Map<number, { requests: number; resetAt: number }>();

/**
 * Check and enforce rate limits
 */
function checkRateLimit(installationId: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const tracker = rateLimitTracker.get(installationId);

  // Reset if window expired
  if (!tracker || tracker.resetAt < now) {
    rateLimitTracker.set(installationId, {
      requests: 1,
      resetAt: now + 60000, // 1 minute window
    });
    return { allowed: true, remaining: 9, resetIn: 60 };
  }

  // Check if limit exceeded
  if (tracker.requests >= 10) {
    const resetIn = Math.ceil((tracker.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, resetIn };
  }

  // Increment counter
  tracker.requests++;
  rateLimitTracker.set(installationId, tracker);

  return {
    allowed: true,
    remaining: 10 - tracker.requests,
    resetIn: Math.ceil((tracker.resetAt - now) / 1000),
  };
}

/**
 * GET /api/github/search?q={query}&owner={owner}&repo={repo}&type={type}&installationId={id}
 * Search code or files in repository
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const type = searchParams.get('type') || 'code'; // 'code' or 'filename'
    const installationId = searchParams.get('installationId');

    if (!query || !owner || !repo || !installationId) {
      return NextResponse.json(
        { error: true, message: 'Query, owner, repo, and installationId are required' },
        { status: 400 }
      );
    }

    const instId = parseInt(installationId, 10);

    // Check rate limit
    const rateLimit = checkRateLimit(instId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: true,
          message: `Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.`,
          rateLimit: {
            remaining: rateLimit.remaining,
            resetIn: rateLimit.resetIn,
          },
        },
        { status: 200 }
      );
    }

    // Check cache first
    const cacheKey = `${owner}/${repo}/${type}/${query}`;
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        ...cached.results,
        cached: true,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetIn: rateLimit.resetIn,
        },
      });
    }

    const octokit = await getInstallationClient(instId);

    if (type === 'code') {
      try {
        // Code search (requires special scope)
        const { data } = await octokit.rest.search.code({
          q: `${query} repo:${owner}/${repo}`,
          per_page: 50,
        });

        const results = {
          total_count: data.total_count,
          items: data.items.map((item: any) => ({
            name: item.name,
            path: item.path,
            sha: item.sha,
            url: item.html_url,
            repository: item.repository?.full_name,
            score: item.score,
            text_matches: item.text_matches?.map((match: any) => ({
              fragment: match.fragment,
              matches: match.matches,
            })),
          })),
          type: 'code',
        };

        // Cache for 2 minutes
        searchCache.set(cacheKey, {
          results,
          expiresAt: Date.now() + 2 * 60 * 1000,
        });

        return NextResponse.json({
          ...results,
          rateLimit: {
            remaining: rateLimit.remaining,
            resetIn: rateLimit.resetIn,
          },
        });
      } catch (error: any) {
        // If code search fails (permission issue), fall back to filename search
        if (error.status === 403 || error.status === 422) {
          console.log('Code search unavailable, falling back to filename search');
          // Continue to filename search below
        } else {
          throw error;
        }
      }
    }

    // Filename search fallback (uses file tree)
    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: 'true',
    });

    // Filter files by query
    const queryLower = query.toLowerCase();
    const matchedFiles = treeData.tree
      .filter((item: any) => {
        if (item.type !== 'blob') return false;
        const pathLower = item.path.toLowerCase();
        return pathLower.includes(queryLower);
      })
      .slice(0, 50) // Limit to 50 results
      .map((item: any) => ({
        name: item.path.split('/').pop(),
        path: item.path,
        sha: item.sha,
        url: `https://github.com/${owner}/${repo}/blob/HEAD/${item.path}`,
        score: item.path.toLowerCase().indexOf(queryLower), // Simple relevance score
        type: 'filename',
      }));

    // Sort by relevance (lower score = better match)
    matchedFiles.sort((a, b) => a.score - b.score);

    const results = {
      total_count: matchedFiles.length,
      items: matchedFiles,
      type: 'filename',
      fallback: type === 'code', // Indicate if this was a fallback
    };

    // Cache for 2 minutes
    searchCache.set(cacheKey, {
      results,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });

    return NextResponse.json({
      ...results,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetIn: rateLimit.resetIn,
      },
    });
  } catch (error: any) {
    console.error('Error searching repository:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to search repository' },
      { status: 200 }
    );
  }
}

/**
 * DELETE /api/github/search - Clear search cache
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (owner && repo) {
      // Clear cache for specific repo
      const keysToDelete: string[] = [];
      searchCache.forEach((_, key) => {
        if (key.startsWith(`${owner}/${repo}/`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => searchCache.delete(key));

      return NextResponse.json({
        success: true,
        message: `Cleared ${keysToDelete.length} cached searches`,
      });
    }

    // Clear all cache
    searchCache.clear();
    return NextResponse.json({ success: true, message: 'All search cache cleared' });
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 }
    );
  }
}
