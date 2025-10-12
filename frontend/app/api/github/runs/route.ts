import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

// GET /api/github/runs?owner=...&repo=...&installation_id=...&workflow_id=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const installationId = searchParams.get("installation_id");
  const workflowId = searchParams.get("workflow_id");

  if (!owner || !repo || !installationId) {
    return NextResponse.json(
      { error: "owner, repo, and installation_id are required" },
      { status: 400 }
    );
  }

  try {
    const octokit = await getInstallationClient(parseInt(installationId, 10));

    let runsResp;
    if (workflowId) {
      runsResp = await octokit.rest.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: workflowId as any,
        per_page: 20,
      });
    } else {
      runsResp = await octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: 20,
      });
    }

    const runs = runsResp.data.workflow_runs?.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status, // queued | in_progress | completed
      conclusion: r.conclusion, // success | failure | neutral | cancelled...
      event: r.event,
      run_attempt: r.run_attempt,
      head_branch: r.head_branch,
      head_sha: r.head_sha,
      html_url: r.html_url,
      logs_url: r.logs_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
      run_number: r.run_number,
      actor: r.actor ? { login: r.actor.login, avatar_url: r.actor.avatar_url } : undefined,
    })) || [];

    return NextResponse.json({ runs });
  } catch (error: any) {
    console.error("Failed to list workflow runs:", error);
    const message = error?.message || "Failed to list workflow runs";
    return NextResponse.json({ error: true, message }, { status: 200 });
  }
}

