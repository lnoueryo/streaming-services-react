import { NextResponse } from "next/server";
import { auth } from "@/lib/server/auth/firebase-admin";
import output from "@/config";

export async function GET(req: Request) {
  return NextResponse.json({ data: 'Hello World' }, { status: 200 });
}

export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "ID トークンがありません" }, { status: 400 });
  }

  // セッションの有効期限5日
  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  try {
    const sessionCookie = await auth.createSessionCookie(token, {
      expiresIn,
    });

    const res = NextResponse.json({ ok: true });

    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: output.domain,
      path: "/",
      maxAge: expiresIn / 1000,
    });

    return res;
  } catch (e) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  }
}