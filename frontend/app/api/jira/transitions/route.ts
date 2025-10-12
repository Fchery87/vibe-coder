/**
 * Jira Transitions API
 * GET /api/jira/transitions?issueKey={key} - Get available transitions for issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { createJiraClient } from '@/lib/jira-client';

/**
 * GET /api/jira/transitions
 * Get available status transitions for an issue
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

    const transitions = await jiraClient.getTransitions(issueKey);

    return NextResponse.json({
      success: true,
      transitions,
    });
  } catch (error: any) {
    console.error('Error fetching Jira transitions:', error);
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to fetch transitions',
      },
      { status: 200 }
    );
  }
}
