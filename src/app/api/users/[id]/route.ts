import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isGMOrAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!isGMOrAdmin(currentUser)) {
      return NextResponse.json({ error: "權限不足：僅總經理 (GM) 或系統管理員可修改人員資料與負責區域" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, department, region, title, managerId, password } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (department) updateData.department = department;
    if (region) updateData.region = region;
    if (title) updateData.title = title;
    if (managerId !== undefined) updateData.managerId = managerId || null;
    if (password) updateData.password = password;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: {
        manager: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("User PATCH Error:", error);
    return NextResponse.json({ error: "更新人員資料失敗" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!isGMOrAdmin(currentUser)) {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    // Protect main admin
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (targetUser?.username === "admin" || targetUser?.role === "GM") {
      return NextResponse.json({ error: "系統保護：無法刪除總經理 (Admin) 帳號" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User DELETE Error:", error);
    return NextResponse.json({ error: "刪除人員失敗" }, { status: 500 });
  }
}
