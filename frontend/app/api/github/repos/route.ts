import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { getInstallationClient } from "@/lib/github-client";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET is not configured; cannot load GitHub repositories");
    return NextResponse.json(
      { error: "GitHub session not configured" },
      { status: 500 },
    );
  }

  let session: SessionData;
  try {
    session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  } catch (error: any) {
    console.error("Failed to load GitHub session:", error);
    return NextResponse.json(
      { error: "Failed to load GitHub session" },
      { status: 500 },
    );
  }

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");

  if (!installationId) {
    return NextResponse.json(
      { error: "installation_id is required" },
      { status: 400 }
    );
  }

  try {
    const octokit = await getInstallationClient(parseInt(installationId));

    // Get repositories for this installation
    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation();

    return NextResponse.json({
      repositories: data.repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },
        private: repo.private,
        description: repo.description,
        default_branch: repo.default_branch,
        updated_at: repo.updated_at,
      })),
    });
  } catch (error: any) {
    console.error("Failed to fetch repos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
