import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { getUserClient } from "@/lib/github-client";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Verify state for CSRF protection
  if (!state || state !== session.state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL}?error=invalid_state`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL}?error=missing_code`
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    // Get user info
    const octokit = getUserClient(accessToken);
    const { data: user } = await octokit.rest.users.getAuthenticated();

    // Store in session
    session.user = {
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
    };
    session.accessToken = accessToken;
    session.isLoggedIn = true;
    session.state = undefined; // Clear state
    await session.save();

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_API_URL}?github_connected=true`);
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_API_URL}?error=${encodeURIComponent(error.message)}`
    );
  }
}
