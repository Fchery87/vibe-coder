import { NextRequest, NextResponse } from "next/server";
import { getInstallationClient } from "@/lib/github-client";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, branch, path, content, message, sha, installation_id } = body;

    if (!owner || !repo || !branch || !path || !content || !message || !installation_id) {
      return NextResponse.json(
        { error: "owner, repo, branch, path, content, message, and installation_id are required" },
        { status: 400 }
      );
    }

    const octokit = await getInstallationClient(installation_id);

    // Create or update file
    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      branch,
      sha, // Required for updates, undefined for new files
    });

    return NextResponse.json({
      success: true,
      commit: data.commit,
      content: data.content,
    });
  } catch (error: any) {
    console.error("Failed to commit:", error);
    return NextResponse.json(
      { error: error.message || "Failed to commit file" },
      { status: 500 }
    );
  }
}
