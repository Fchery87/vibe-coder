/**
 * Jira Issue API
 * GET /api/jira/issue?key={key} - Get issue by key
 * GET /api/jira/issue?jql={jql} - Search issues with JQL
 * POST /api/jira/issue - Create new issue
 * PUT /api/jira/issue - Update issue
 */

import { NextRequest, NextResponse } from 'next/server';
import { createJiraClient } from '@/lib/jira-client';

/**
 * GET /api/jira/issue
 * Get issue by key or search with JQL
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
    const key = searchParams.get('key');
    const jql = searchParams.get('jql');
    const maxResults = parseInt(searchParams.get('maxResults') || '50', 10);

    // Get specific issue by key
    if (key) {
      const issue = await jiraClient.getIssue(key);
      return NextResponse.json({ success: true, issue });
    }

    // Search issues with JQL
    if (jql) {
      const result = await jiraClient.searchIssues(jql, maxResults);
      return NextResponse.json({
        success: true,
        issues: result.issues,
        total: result.total,
      });
    }

    // No parameters - return recent issues
    const result = await jiraClient.searchIssues('order by updated DESC', 20);
    return NextResponse.json({
      success: true,
      issues: result.issues,
      total: result.total,
    });
  } catch (error: any) {
    console.error('Error fetching Jira issue:', error);
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to fetch issue',
      },
      { status: 200 }
    );
  }
}

/**
 * POST /api/jira/issue
 * Create new issue
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
    const { projectKey, summary, description, issueType, priority } = body;

    if (!projectKey || !summary) {
      return NextResponse.json(
        { error: true, message: 'projectKey and summary are required' },
        { status: 400 }
      );
    }

    const issue = await jiraClient.createIssue({
      projectKey,
      summary,
      description,
      issueType,
      priority,
    });

    return NextResponse.json({
      success: true,
      issue,
    });
  } catch (error: any) {
    console.error('Error creating Jira issue:', error);
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to create issue',
      },
      { status: 200 }
    );
  }
}

/**
 * PUT /api/jira/issue
 * Update existing issue
 */
export async function PUT(request: NextRequest) {
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
    const { issueKey, summary, description, assignee, transitionId } = body;

    if (!issueKey) {
      return NextResponse.json(
        { error: true, message: 'issueKey is required' },
        { status: 400 }
      );
    }

    // Update fields
    if (summary || description || assignee) {
      await jiraClient.updateIssue(issueKey, {
        summary,
        description,
        assignee,
      });
    }

    // Transition status if requested
    if (transitionId) {
      await jiraClient.transitionIssue(issueKey, transitionId);
    }

    // Fetch updated issue
    const issue = await jiraClient.getIssue(issueKey);

    return NextResponse.json({
      success: true,
      issue,
    });
  } catch (error: any) {
    console.error('Error updating Jira issue:', error);
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to update issue',
      },
      { status: 200 }
    );
  }
}
