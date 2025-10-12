/**
 * GitHub App Installation Token API
 * GET /api/github/installation?id={installationId}
 * Returns short-lived installation token for repo access
 */

import { NextRequest, NextResponse } from 'next/server';
import { App } from '@octokit/app';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const installationId = searchParams.get('id');

    if (!installationId) {
      return NextResponse.json(
        { error: true, message: 'Installation ID is required' },
        { status: 400 }
      );
    }

    // Check for required environment variables
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      console.error('Missing GitHub App credentials');
      return NextResponse.json(
        { error: true, message: 'GitHub App not configured' },
        { status: 500 }
      );
    }

    // Create GitHub App instance
    const app = new App({
      appId,
      privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
    });

    // Get installation Octokit client (which has the token)
    const octokit = await app.getInstallationOctokit(parseInt(installationId, 10));

    // The auth property contains the token
    const authResult = (await octokit.auth({ type: 'installation' })) as { token: string };

    return NextResponse.json({ token: authResult.token });
  } catch (error: any) {
    console.error('Error getting installation token:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to get installation token' },
      { status: 500 }
    );
  }
}
