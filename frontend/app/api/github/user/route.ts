import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  if (!process.env.SESSION_SECRET) {
    console.error("SESSION_SECRET is not configured; GitHub session unavailable");
    return NextResponse.json(
      { user: null, isLoggedIn: false, error: "GitHub session not configured" },
      { status: 500 },
    );
  }

  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ user: null, isLoggedIn: false });
    }

    return NextResponse.json({
      user: session.user,
      isLoggedIn: true,
    });
  } catch (error: any) {
    console.error("Failed to load GitHub session:", error);
    return NextResponse.json(
      { user: null, isLoggedIn: false, error: "Failed to load GitHub session" },
      { status: 500 },
    );
  }
}
