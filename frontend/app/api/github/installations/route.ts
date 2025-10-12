import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { getUserClient } from "@/lib/github-client";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

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
