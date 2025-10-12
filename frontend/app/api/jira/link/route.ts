/**
 * Jira Link API
 * POST /api/jira/link - Link issue to PR
 * GET /api/jira/link?issueKey={key} - Get links for issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { createJiraClient } from '@/lib/jira-client';

/**
 * GET /api/jira/link
 * Get remote links for an issue
 */
export async function GET(request: NextRequest) {
  try {
    const jiraClient = createJiraClient();

    if (!jiraClient) {
      return NextResponse.json(
        {
          error: true,
          message: 'Jira not configured. Please set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN environment variables.',
          needsSetup: true,
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const issueKey = searchParams.get('issueKey');

    if (!issueKey) {
      return NextResponse.json(
        { error: true, message: 'issueKey is required' },
        { status: 400 }
      );
    }

    const links = await jiraClient.getRemoteLinks(issueKey);

    return NextResponse.json({
      success: true,
      links,
    });
  } catch (error: any) {
    console.error('Error fetching Jira links:', error);
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to fetch links',
      },
      { status: 200 }
    );
  }
}

/**
 * POST /api/jira/link
 * Link issue to external resource (e.g., GitHub PR)
 */
export async function POST(request: NextRequest) {
  try {
    const jiraClient = createJiraClient();

    if (!jiraClient) {
      return NextResponse.json(
        {
          error: true,
          message: 'Jira not configured. Please set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN environment variables.',
          needsSetup: true,
        },
        { status: 200 }
      );
    }

    const body = await request.json();
    const { issueKey, url, title, summary, icon } = body;

    if (!issueKey || !url || !title) {
      return NextResponse.json(
        { error: true, message: 'issueKey, url, and title are required' },
        { status: 400 }
      );
    }

    await jiraClient.addRemoteLink(issueKey, {
      url,
      title,
      summary,
      icon,
    });

    return NextResponse.json({
      success: true,
      message: 'Link added successfully',
    });
  } catch (error: any) {
    console.error('Error adding Jira link:', error);
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to add link',
      },
      { status: 200 }
    );
  }
}
