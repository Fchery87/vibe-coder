import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

// POST /api/github/workflows/[id]/dispatch { owner, repo, ref, inputs?, installation_id }
export async function POST(request: NextRequest, {
  params,
}: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { owner, repo, ref, inputs, installation_id } = body || {};
    const id = params.id;

    if (!owner || !repo || !ref || !installation_id || !id) {
      return NextResponse.json(
        { error: "owner, repo, ref, id, and installation_id are required" },
        { status: 400 }
      );
    }

    const octokit = await getInstallationClient(parseInt(installation_id, 10));

    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: id as any,
      ref,
      inputs,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to dispatch workflow:", error);
    const message =
      error?.status === 404
        ? "Workflow not found or Actions disabled"
        : error?.message || "Failed to dispatch workflow";
    return NextResponse.json({ error: true, message }, { status: 200 });
  }
}

