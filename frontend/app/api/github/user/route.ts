import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn || !session.user) {
    return NextResponse.json({ user: null, isLoggedIn: false });
  }

  return NextResponse.json({
    user: session.user,
    isLoggedIn: true,
  });
}
