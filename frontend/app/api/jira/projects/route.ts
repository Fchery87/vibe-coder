/**
 * Jira Projects API
 * GET /api/jira/projects - Get all accessible projects
 */

import { NextRequest, NextResponse } from 'next/server';
import { createJiraClient } from '@/lib/jira-client';

/**
 * GET /api/jira/projects
 * Get all accessible Jira projects
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

    const projects = await jiraClient.getProjects();

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error: any) {
    console.error('Error fetching Jira projects:', error);
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to fetch projects',
      },
      { status: 200 }
    );
  }
}
