/**
 * GitHub Checks API
 * GET /api/github/checks - Get PR checks and status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getInstallationClient } from '@/lib/github-client';

/**
 * GET /api/github/checks?owner={owner}&repo={repo}&ref={ref}&installationId={id}
 * Get checks and status for a PR or branch
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const ref = searchParams.get('ref'); // Can be branch name or SHA
    const installationId = searchParams.get('installationId');

    if (!owner || !repo || !ref || !installationId) {
      return NextResponse.json(
        { error: true, message: 'Owner, repo, ref, and installationId are required' },
        { status: 400 }
      );
    }

    const octokit = await getInstallationClient(parseInt(installationId, 10));

    // Get combined status (legacy status API)
    const { data: combinedStatus } = await octokit.repos.getCombinedStatusForRef({
      owner,
      repo,
      ref,
    });

    // Get check runs (newer checks API)
    const { data: checkRuns } = await octokit.checks.listForRef({
      owner,
      repo,
      ref,
    });

    // Combine both types of checks
    const allChecks = [
      ...combinedStatus.statuses.map((status) => ({
        id: status.id,
        name: status.context,
        status: status.state, // 'success', 'pending', 'failure', 'error'
        conclusion: status.state === 'success' ? 'success' : status.state === 'pending' ? null : 'failure',
        started_at: status.created_at,
        completed_at: status.updated_at,
        html_url: status.target_url,
        type: 'status' as const,
      })),
      ...checkRuns.check_runs.map((check) => ({
        id: check.id,
        name: check.name,
        status: check.status, // 'queued', 'in_progress', 'completed'
        conclusion: check.conclusion, // 'success', 'failure', 'neutral', 'cancelled', 'skipped', 'timed_out', 'action_required'
        started_at: check.started_at,
        completed_at: check.completed_at,
        html_url: check.html_url,
        type: 'check_run' as const,
      })),
    ];

    // Determine overall state
    const hasFailures = allChecks.some(
      (check) => check.conclusion === 'failure' || check.conclusion === 'error'
    );
    const hasPending = allChecks.some(
      (check) => check.status === 'pending' || check.status === 'in_progress' || check.status === 'queued'
    );
    const allSuccess = allChecks.length > 0 && allChecks.every(
      (check) => check.conclusion === 'success'
    );

    let overallState: 'success' | 'pending' | 'failure' | 'none';
    if (allChecks.length === 0) {
      overallState = 'none';
    } else if (hasFailures) {
      overallState = 'failure';
    } else if (hasPending) {
      overallState = 'pending';
    } else if (allSuccess) {
      overallState = 'success';
    } else {
      overallState = 'pending';
    }

    return NextResponse.json({
      state: overallState,
      total_count: allChecks.length,
      checks: allChecks,
      sha: combinedStatus.sha,
    });
  } catch (error: any) {
    console.error('Error fetching checks:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to fetch checks' },
      { status: 200 }
    );
  }
}
