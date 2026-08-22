"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  KanbanSquare,
  UserPlus,
  Megaphone,
  Workflow,
  Headset,
  Sparkles,
  ChevronRight,
  LucideIcon,
  LogOut,
} from "lucide-react";
import { cn, REGIONS } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  minRole?: string[]; // Allowed roles e.g. ["GM", "ADMIN", "SALES_MANAGER"]
}

interface NavSection {
  group: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    group: "管理與決策分析",
    items: [
      { name: "總覽儀表板", href: "/dashboard", icon: LayoutDashboard },
      { name: "總經理決策報表", href: "/reports", icon: FileText, badge: "GM / 主管", minRole: ["GM", "ADMIN", "SALES_MANAGER"] },
    ],
  },
  {
    group: "客戶 360",
    items: [
      { name: "聯絡人管理", href: "/contacts", icon: Users },
      { name: "企業客戶 (Accounts)", href: "/accounts", icon: Building2 },
    ],
  },
  {
    group: "銷售管理 (SFA)",
    items: [
      { name: "商機看板 (Kanban)", href: "/sales/pipeline", icon: KanbanSquare, badge: "分區隔離" },
      { name: "潛在線索 (Leads)", href: "/sales/leads", icon: UserPlus },
    ],
  },
  {
    group: "行銷自動化",
    items: [
      { name: "行銷活動 (Campaigns)", href: "/marketing/campaigns", icon: Megaphone },
      { name: "自動化流程 (Workflows)", href: "/marketing/workflows", icon: Workflow },
    ],
  },
  {
    group: "客戶服務與售後",
    items: [
      { name: "工單收件箱 (Tickets)", href: "/support/tickets", icon: Headset, badge: "SLA 監控" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
    }
  };

  const isGM = currentUser?.role === "GM" || currentUser?.role === "ADMIN";
  const userRegionLabel = REGIONS[currentUser?.region || "ALL"]?.label?.split(" ")[0] || "全區";

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-indigo-100" />
        </div>
        <div>
          <span className="font-bold text-white tracking-wide text-base">NexCRM</span>
          <span className="block text-[10px] text-indigo-400 font-medium tracking-wider uppercase">
            多區域 · 權限隔離版
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navigation.map((section, idx) => {
          // Filter items based on user role
          const filteredItems = section.items.filter((item) => {
            if (!item.minRole) return true;
            if (!currentUser) return true;
            return item.minRole.includes(currentUser.role);
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {section.group}
              </p>
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/dashboard" ? pathname === "/" || pathname === "/dashboard" : pathname.startsWith(item.href);
                const targetHref = item.href === "/dashboard" ? "/" : item.href;
                return (
                  <Link
                    key={item.href}
                    href={targetHref}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-[10px]"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-indigo-400" : "text-slate-500")} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Current User Role Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs text-white shrink-0 ${
              isGM ? "bg-amber-600" : "bg-indigo-600"
            }`}>
              {currentUser ? currentUser.name.slice(0, 1) : "U"}
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{currentUser ? currentUser.name : "使用者"}</p>
              <p className="text-[10px] text-indigo-300 truncate">
                {currentUser?.role === "GM" ? "總經理 (全區)" : currentUser?.role === "SALES_MANAGER" ? `主管 · ${userRegionLabel}` : `業務 · ${userRegionLabel}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="登出"
            className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
