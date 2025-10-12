/**
 * GitHub Files API
 * GET /api/github/files?owner={owner}&repo={repo}&branch={branch}&installationId={id}
 * Returns recursive file tree from GitHub repository
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCachedInstallationToken, createGitHubAppClient } from '@/lib/github-app';

export interface GitHubFileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  sha?: string;
  children?: GitHubFileNode[];
}

// In-memory cache for file trees (5 minute TTL)
const treeCache = new Map<string, { tree: GitHubFileNode[]; expiresAt: number }>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch') || 'main';
    const installationId = searchParams.get('installationId');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: true, message: 'Owner and repo are required' },
        { status: 400 }
      );
    }

    if (!installationId) {
      return NextResponse.json(
        { error: true, message: 'Installation ID is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `${owner}/${repo}/${branch}`;
    const cached = treeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ tree: cached.tree, cached: true });
    }

    // Get installation token
    const token = await getCachedInstallationToken(parseInt(installationId, 10));
    if (!token) {
      return NextResponse.json(
        { error: true, message: 'Failed to get installation token' },
        { status: 401 }
      );
    }

    // Create GitHub client
    const octokit = createGitHubAppClient(token);

    // Get branch SHA
    const { data: branchData } = await octokit.repos.getBranch({
      owner,
      repo,
      branch,
    });

    const treeSha = branchData.commit.commit.tree.sha;

    // Get recursive tree
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: treeSha,
      recursive: 'true',
    });

    // Convert flat tree to nested structure
    const tree = buildFileTree(treeData.tree);

    // Cache for 5 minutes
    treeCache.set(cacheKey, {
      tree,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return NextResponse.json({ tree, sha: treeSha });
  } catch (error: any) {
    console.error('Error fetching GitHub files:', error);

    // Handle specific errors gracefully
    if (error.status === 404) {
      return NextResponse.json(
        { error: true, message: 'Repository or branch not found' },
        { status: 200 } // Return 200 to avoid breaking UI
      );
    }

    if (error.status === 403) {
      return NextResponse.json(
        { error: true, message: 'GitHub App does not have permission to access this repository' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: true, message: error.message || 'Failed to fetch files' },
      { status: 200 } // Return 200 to show error state in UI instead of crashing
    );
  }
}

/**
 * Convert flat GitHub tree to nested structure
 */
function buildFileTree(flatTree: any[]): GitHubFileNode[] {
  const root: GitHubFileNode[] = [];
  const pathMap = new Map<string, GitHubFileNode>();

  // Sort by path to ensure parents are processed before children
  const sortedTree = flatTree.sort((a, b) => a.path.localeCompare(b.path));

  for (const item of sortedTree) {
    const pathParts = item.path.split('/');
    const name = pathParts[pathParts.length - 1];
    const isFolder = item.type === 'tree';

    const node: GitHubFileNode = {
      id: item.sha || item.path,
      name,
      path: item.path,
      type: isFolder ? 'folder' : 'file',
      sha: item.sha,
      size: item.size,
    };

    if (isFolder) {
      node.children = [];
    }

    pathMap.set(item.path, node);

    // Find parent
    if (pathParts.length === 1) {
      // Root level
      root.push(node);
    } else {
      const parentPath = pathParts.slice(0, -1).join('/');
      const parent = pathMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        // Parent doesn't exist yet (shouldn't happen with sorted tree)
        root.push(node);
      }
    }
  }

  return root;
}

/**
 * Clear file tree cache (useful for manual refresh)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const branch = searchParams.get('branch') || 'main';

    if (owner && repo) {
      const cacheKey = `${owner}/${repo}/${branch}`;
      treeCache.delete(cacheKey);
      return NextResponse.json({ success: true, message: 'Cache cleared' });
    }

    // Clear all cache if no params
    treeCache.clear();
    return NextResponse.json({ success: true, message: 'All cache cleared' });
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 }
    );
  }
}
