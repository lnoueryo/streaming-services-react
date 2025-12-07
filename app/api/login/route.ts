import { NextResponse } from "next/server";
import { auth } from "@/lib/server/auth/firebase-admin";

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
      // httpOnly: true,
      // secure: true,
      // sameSite: "none",   // subdomain 間で共有するなら none を指定
      // domain: "localhost",
      // path: "/",
      // maxAge: expiresIn / 1000,
      httpOnly: true,
      // secure: true,        ← ローカルでは不要または false
      sameSite: "lax",       // or "none" + secure but secure=offならブラウザが拒否する可能性
      path: "/",
      // domain を指定しない（デフォルトで host-only cookie にする）
      maxAge: expiresIn / 1000,
    });

    return res;
  } catch (e) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  }
}