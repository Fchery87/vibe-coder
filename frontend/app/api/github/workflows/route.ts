import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

// GET /api/github/workflows?owner=...&repo=...&installation_id=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const installationId = searchParams.get("installation_id");

  if (!owner || !repo || !installationId) {
    return NextResponse.json(
      { error: "owner, repo, and installation_id are required" },
      { status: 400 }
    );
  }

  try {
    const octokit = await getInstallationClient(parseInt(installationId, 10));
    const { data } = await octokit.rest.actions.listRepoWorkflows({ owner, repo });

    return NextResponse.json({
      workflows: data.workflows?.map((w) => ({
        id: w.id,
        name: w.name,
        state: w.state,
        path: w.path,
        created_at: w.created_at,
        updated_at: w.updated_at,
        html_url: w.html_url,
        badge_url: w.badge_url,
      })) || [],
      total_count: data.total_count,
    });
  } catch (error: any) {
    console.error("Failed to list workflows:", error);
    const message =
      error?.status === 403
        ? "GitHub Actions may be disabled for this repository"
        : error?.message || "Failed to list workflows";
    return NextResponse.json({ error: true, message }, { status: 200 });
  }
}

