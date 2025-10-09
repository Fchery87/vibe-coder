import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

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
