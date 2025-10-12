import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, title, head, base, body: prBody, installation_id } = body;

    if (!owner || !repo || !title || !head || !base || !installation_id) {
      return NextResponse.json(
        { error: "owner, repo, title, head, base, and installation_id are required" },
        { status: 400 }
      );
    }

    const octokit = await getInstallationClient(installation_id);

    // Create pull request
    const { data } = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body: prBody || `Pull request created via Vibe Coder\n\n🤖 Generated with Atlas CLI`,
    });

    return NextResponse.json({
      success: true,
      pr: {
        number: data.number,
        title: data.title,
        html_url: data.html_url,
        head: {
          ref: data.head.ref,
          sha: data.head.sha,
        },
        base: {
          ref: data.base.ref,
          sha: data.base.sha,
        },
        state: data.state,
        created_at: data.created_at,
      },
    });
  } catch (error: any) {
    console.error("Failed to create PR:", error);

    // Handle specific errors gracefully
    if (error.status === 422) {
      return NextResponse.json(
        { error: true, message: 'Pull request already exists or no changes to merge' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: true, message: error.message || "Failed to create pull request" },
      { status: 200 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const prNumber = searchParams.get("pr_number");
  const installationId = searchParams.get("installation_id");

  if (!owner || !repo || !installationId) {
    return NextResponse.json(
      { error: "owner, repo, and installation_id are required" },
      { status: 400 }
    );
  }

  try {
    const octokit = await getInstallationClient(parseInt(installationId));

    if (prNumber) {
      // Get specific PR
      const { data } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: parseInt(prNumber),
      });

      return NextResponse.json({ pr: data });
    } else {
      // List PRs
      const { data } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "open",
        sort: "updated",
        direction: "desc",
      });

      return NextResponse.json({ prs: data });
    }
  } catch (error: any) {
    console.error("Failed to fetch PR:", error);
    return NextResponse.json(
      { error: true, message: error.message || "Failed to fetch pull request" },
      { status: 200 }
    );
  }
}
