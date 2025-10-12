import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

/**
 * GET /api/github/branch?owner={owner}&repo={repo}&installationId={id}
 * List all branches in the repository
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const installationId = searchParams.get('installationId');

    if (!owner || !repo || !installationId) {
      return NextResponse.json(
        { error: "owner, repo, and installationId are required" },
        { status: 400 }
      );
    }

    const octokit = await getInstallationClient(parseInt(installationId, 10));

    // List all branches
    const { data: branches } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return NextResponse.json({
      branches: branches.map(b => ({
        name: b.name,
        sha: b.commit.sha,
        protected: b.protected,
      })),
    });
  } catch (error: any) {
    console.error("Failed to list branches:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list branches" },
      { status: 200 } // Return 200 to show error state in UI
    );
  }
}

/**
 * POST /api/github/branch
 * Create a new branch from a base branch
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, base, feature, installation_id } = body;

    if (!owner || !repo || !base || !feature || !installation_id) {
      return NextResponse.json(
        { error: "owner, repo, base, feature, and installation_id are required" },
        { status: 400 }
      );
    }

    const octokit = await getInstallationClient(installation_id);

    // Get base branch SHA
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${base}`,
    });

    // Create new branch
    const { data: newRef } = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${feature}`,
      sha: refData.object.sha,
    });

    return NextResponse.json({
      success: true,
      branch: feature,
      sha: newRef.object.sha,
    });
  } catch (error: any) {
    console.error("Failed to create branch:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create branch" },
      { status: 500 }
    );
  }
}
