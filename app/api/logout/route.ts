import { NextResponse } from "next/server";
import { auth } from "@/lib/server/auth/firebase-admin";

export async function POST(req: Request) {
  const sessionCookie = req.headers.get("cookie")?.match(/session=([^;]+)/)?.[1];

  if (sessionCookie) {
    try {
      const decoded = await auth.decodeSessionCookie(sessionCookie);
      await auth.revokeRefreshTokens(decoded.sub);
    } catch (e) {}
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}