/**
 * GitHub PR Review Comments API
 * GET /api/github/pr/comments - List review comments for a PR
 * POST /api/github/pr/comments - Create review comment on specific line
 */

import { NextRequest, NextResponse } from 'next/server';
import { getInstallationClient } from '@/lib/github-client';

/**
 * GET /api/github/pr/comments?owner={owner}&repo={repo}&prNumber={number}&installationId={id}
 * List all review comments for a pull request
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const prNumber = searchParams.get('prNumber');
    const installationId = searchParams.get('installationId');

    if (!owner || !repo || !prNumber || !installationId) {
      return NextResponse.json(
        { error: true, message: 'Owner, repo, prNumber, and installationId are required' },
        { status: 400 }
      );
    }

    const octokit = await getInstallationClient(parseInt(installationId, 10));

    // List all review comments for the PR
    const { data: comments } = await octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number: parseInt(prNumber, 10),
    });

    return NextResponse.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        path: comment.path,
        position: comment.position,
        original_position: comment.original_position,
        commit_id: comment.commit_id,
        original_commit_id: comment.original_commit_id,
        line: comment.line,
        original_line: comment.original_line,
        side: comment.side,
        start_line: comment.start_line,
        start_side: comment.start_side,
        body: comment.body,
        user: {
          login: comment.user?.login || 'unknown',
          avatar_url: comment.user?.avatar_url || '',
        },
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        html_url: comment.html_url,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching PR comments:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to fetch PR comments' },
      { status: 200 }
    );
  }
}

/**
 * POST /api/github/pr/comments
 * Create a review comment on a specific line
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      owner,
      repo,
      prNumber,
      commitId,
      path,
      line,
      side,
      body: commentBody,
      installationId,
    } = body;

    if (!owner || !repo || !prNumber || !commitId || !path || !line || !commentBody || !installationId) {
      return NextResponse.json(
        {
          error: true,
          message: 'Owner, repo, prNumber, commitId, path, line, body, and installationId are required',
        },
        { status: 400 }
      );
    }

    const octokit = await getInstallationClient(parseInt(installationId, 10));

    // Create review comment on specific line
    const { data: comment } = await octokit.pulls.createReviewComment({
      owner,
      repo,
      pull_number: parseInt(prNumber, 10),
      body: commentBody,
      commit_id: commitId, // Important: use head_sha for anchored comments
      path,
      line: parseInt(line, 10),
      side: side || 'RIGHT', // 'LEFT' or 'RIGHT'
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        path: comment.path,
        line: comment.line,
        side: comment.side,
        body: comment.body,
        user: {
          login: comment.user?.login || 'unknown',
          avatar_url: comment.user?.avatar_url || '',
        },
        created_at: comment.created_at,
        html_url: comment.html_url,
      },
    });
  } catch (error: any) {
    console.error('Error creating PR comment:', error);

    // Handle specific errors
    if (error.status === 422) {
      return NextResponse.json(
        {
          error: true,
          message: 'Invalid comment position or line number. Make sure the line exists in the diff.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: true, message: error.message || 'Failed to create PR comment' },
      { status: 200 }
    );
  }
}
