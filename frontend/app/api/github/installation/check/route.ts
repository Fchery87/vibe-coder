/**
 * GitHub App Installation Check API
 * GET /api/github/installation/check?owner={owner}&repo={repo}
 * Checks if GitHub App is installed for a repository
 */

import { NextRequest, NextResponse } from 'next/server';
import { App } from '@octokit/app';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: true, message: 'Owner and repo are required' },
        { status: 400 }
      );
    }

    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      return NextResponse.json(
        { installed: false, error: true, message: 'GitHub App not configured' },
        { status: 200 }
      );
    }

    const app = new App({
      appId,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });

    // Try to get installation for the repository
    try {
      const octokit = await app.getInstallationOctokit(
        // This will throw if not installed
        await app.octokit.request('GET /repos/{owner}/{repo}/installation', {
          owner,
          repo,
        }).then(res => res.data.id)
      );

      return NextResponse.json({ installed: true });
    } catch (error: any) {
      // 404 means app is not installed
      if (error.status === 404) {
        return NextResponse.json({ installed: false });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error checking installation:', error);
    return NextResponse.json(
      { installed: false, error: true, message: error.message },
      { status: 200 } // Return 200 to avoid breaking UI
    );
  }
}
