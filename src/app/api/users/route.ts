import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isGMOrAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        manager: {
          select: { id: true, name: true, title: true, region: true },
        },
        subordinates: {
          select: { id: true, name: true, title: true, region: true },
        },
        assignedDeals: {
          select: { id: true, value: true, status: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Users GET API Error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    // Only GM / Admin can create users and assign territories
    if (!isGMOrAdmin(currentUser)) {
      return NextResponse.json({ error: "權限不足：僅總經理 (GM) 或系統管理員可建立人員帳號與分配區域" }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, name, email, role, department, region, title, managerId } = body;

    if (!username || !password || !name || !email) {
      return NextResponse.json({ error: "帳號、密碼、姓名與 Email 為必填欄位" }, { status: 400 });
    }

    // Check username or email uniqueness
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "此帳號 (Username) 或 Email 已被使用，請更換" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        username,
        password,
        name,
        email,
        role: role || "SALES",
        department: department || "業務部",
        region: region || "NORTH",
        title: title || "業務代表",
        managerId: managerId || null,
      },
      include: {
        manager: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Users POST API Error:", error);
    return NextResponse.json({ error: "建立人員資料失敗" }, { status: 500 });
  }
}
