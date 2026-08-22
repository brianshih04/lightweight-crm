import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "請輸入帳號與密碼" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: username }, { email: username }],
      },
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    const sessionPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      region: user.region,
      title: user.title,
      managerId: user.managerId,
    };

    const response = NextResponse.json({ success: true, user: sessionPayload });

    response.cookies.set({
      name: "crm_auth_session",
      value: JSON.stringify(sessionPayload),
      httpOnly: true,
      secure: false, // allow local and cloudflare SSL proxy
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: "登入失敗: " + String(error) }, { status: 500 });
  }
}
