import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { getUserClient } from "@/lib/github-client";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET is not configured; cannot load GitHub installations");
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

  if (!session.isLoggedIn || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const octokit = getUserClient(session.accessToken);

    // Get user's app installations
    const { data } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();

    return NextResponse.json({
      installations: data.installations.map((inst) => ({
        id: inst.id,
        account: {
          login: (inst.account as any)?.login || (inst.account as any)?.slug || '',
          avatar_url: inst.account?.avatar_url || '',
          type: (inst.account as any)?.type || 'User',
        },
        repository_selection: inst.repository_selection,
        created_at: inst.created_at,
        updated_at: inst.updated_at,
      })),
    });
  } catch (error: any) {
    console.error("Failed to fetch installations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch installations" },
      { status: 500 }
    );
  }
}
