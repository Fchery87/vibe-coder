import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const branch = searchParams.get("branch") || "main";
  const installationId = searchParams.get("installation_id");

  if (!owner || !repo || !installationId) {
    return NextResponse.json(
      { error: "owner, repo, and installation_id are required" },
      { status: 400 }
    );
  }

  try {
    const octokit = await getInstallationClient(parseInt(installationId));

    // Get the tree (recursive)
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: refData.object.sha,
      recursive: "true",
    });

    return NextResponse.json({
      tree: treeData.tree,
      sha: refData.object.sha,
    });
  } catch (error: any) {
    console.error("Failed to fetch tree:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tree" },
      { status: 500 }
    );
  }
}
