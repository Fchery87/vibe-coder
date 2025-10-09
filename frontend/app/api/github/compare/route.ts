import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const base = searchParams.get("base");
  const head = searchParams.get("head");
  const installationId = searchParams.get("installation_id");

  if (!owner || !repo || !base || !head || !installationId) {
    return NextResponse.json(
      { error: "owner, repo, base, head, and installation_id are required" },
      { status: 400 }
    );
  }

  try {
    const octokit = await getInstallationClient(parseInt(installationId));

    const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${base}...${head}`,
    });

    return NextResponse.json({
      files: data.files,
      base_commit: data.base_commit,
      commits: data.commits,
      ahead_by: data.ahead_by,
      behind_by: data.behind_by,
    });
  } catch (error: any) {
    console.error("Failed to compare:", error);
    return NextResponse.json(
      { error: error.message || "Failed to compare commits" },
      { status: 500 }
    );
  }
}
