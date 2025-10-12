/**
 * Jira Comment API
 * GET /api/jira/comment?issueKey={key} - Get comments for issue
 * POST /api/jira/comment - Add comment to issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { createJiraClient } from '@/lib/jira-client';

/**
 * GET /api/jira/comment
 * Get all comments for an issue
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

    const comments = await jiraClient.getComments(issueKey);

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error: any) {
    console.error('Error fetching Jira comments:', error);
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to fetch comments',
      },
      { status: 200 }
    );
  }
}

/**
 * POST /api/jira/comment
 * Add comment to issue
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
    const { issueKey, commentBody } = body;

    if (!issueKey || !commentBody) {
      return NextResponse.json(
        { error: true, message: 'issueKey and commentBody are required' },
        { status: 400 }
      );
    }

    const comment = await jiraClient.addComment(issueKey, commentBody);

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error: any) {
    console.error('Error adding Jira comment:', error);
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to add comment',
      },
      { status: 200 }
    );
  }
}
