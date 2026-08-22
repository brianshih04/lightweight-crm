import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

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

    const cookieStore = cookies();
    cookieStore.set("crm_auth_session", JSON.stringify(sessionPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({ success: true, user: sessionPayload });
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: "登入失敗" }, { status: 500 });
  }
}
