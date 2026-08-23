import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuditDashboard } from "./AuditDashboard";

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  return <AuditDashboard />;
}
