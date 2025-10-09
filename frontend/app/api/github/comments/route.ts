import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      owner,
      repo,
      pr_number,
      body: commentBody,
      path,
      line,
      side,
      commit_id,
      installation_id,
    } = body;

    if (!owner || !repo || !pr_number || !commentBody || !installation_id) {
      return NextResponse.json(
        { error: "owner, repo, pr_number, body, and installation_id are required" },
        { status: 400 }
      );
    }

    const octokit = await getInstallationClient(installation_id);

    // If path, line, and commit_id are provided, create a review comment (anchored)
    if (path && line && commit_id) {
      const { data } = await octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: pr_number,
        body: commentBody,
        commit_id,
        path,
        line,
        side: side || "RIGHT",
      });

      return NextResponse.json({
        success: true,
        comment: data,
        type: "review_comment",
      });
    } else {
      // Otherwise, create an issue comment
      const { data } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pr_number,
        body: commentBody,
      });

      return NextResponse.json({
        success: true,
        comment: data,
        type: "issue_comment",
      });
    }
  } catch (error: any) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create comment" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const prNumber = searchParams.get("pr_number");
  const installationId = searchParams.get("installation_id");
  const type = searchParams.get("type") || "all"; // 'all', 'issue', 'review'

  if (!owner || !repo || !prNumber || !installationId) {
    return NextResponse.json(
      { error: "owner, repo, pr_number, and installation_id are required" },
      { status: 400 }
    );
  }

  try {
    const octokit = await getInstallationClient(parseInt(installationId));
    const comments: any[] = [];

    // Get issue comments
    if (type === "all" || type === "issue") {
      const { data: issueComments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: parseInt(prNumber),
      });
      comments.push(...issueComments.map(c => ({ ...c, comment_type: 'issue' })));
    }

    // Get review comments
    if (type === "all" || type === "review") {
      const { data: reviewComments } = await octokit.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: parseInt(prNumber),
      });
      comments.push(...reviewComments.map(c => ({ ...c, comment_type: 'review' })));
    }

    // Sort by created_at
    comments.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return NextResponse.json({ comments });
  } catch (error: any) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
