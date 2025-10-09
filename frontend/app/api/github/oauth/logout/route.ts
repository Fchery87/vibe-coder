import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData, defaultSession } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  // Destroy session
  session.user = undefined;
  session.accessToken = undefined;
  session.isLoggedIn = false;
  await session.save();

  return NextResponse.json({ success: true });
}
