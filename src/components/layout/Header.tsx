"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, ChevronDown, LogOut, Shield, Award } from "lucide-react";
import { REGIONS, roleLabel } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

export function Header({ user }: { user: SessionUser }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showUserMenu]);

  const handleLogout = async (allDevices = false) => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: allDevices ? { "Content-Type": "application/json" } : undefined,
        body: allDevices ? JSON.stringify({ allDevices: true }) : undefined,
      });
    } catch (err) {
      console.error(err);
    }
    window.location.href = "/login";
  };

  const isAdmin = user.role === "ADMIN";
  const isGM = user.role === "GM";
  const isFullAccess = isAdmin || isGM;
  const userRegionLabel = REGIONS[user.region || "ALL"]?.label || "全區";

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Region Scope Indicator */}
      <div className="flex items-center gap-4 flex-1">
        {isFullAccess ? (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${
              isAdmin
                ? "bg-red-50/80 border-red-200/80"
                : "bg-amber-50/80 border-amber-200/80"
            }`}
          >
            {isAdmin ? (
              <Shield className="w-3.5 h-3.5 text-red-600" />
            ) : (
              <Award className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span
              className={`text-[11px] font-bold ${isAdmin ? "text-red-800" : "text-amber-800"}`}
            >
              {isAdmin ? "系統管理者全區視角" : "總經理全區視角"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 font-medium">
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              責任區域：<strong className="text-slate-900">{userRegionLabel}</strong>
            </span>
          </div>
        )}
      </div>

      {/* User Profile Menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowUserMenu(!showUserMenu)}
          aria-haspopup="menu"
          aria-expanded={showUserMenu}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition text-xs"
        >
          <div
            className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs text-white ${
              isAdmin ? "bg-rose-600" : isGM ? "bg-amber-600" : "bg-indigo-600"
            }`}
          >
            {user.name.slice(0, 1)}
          </div>
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900">{user.name}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                  isAdmin
                    ? "bg-red-100 text-red-800 border-red-200"
                    : isGM
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}
              >
                {roleLabel(user.role)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block leading-tight">
              {user.title || "使用者"} · {userRegionLabel}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {showUserMenu && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50"
          >
            <div className="p-3 bg-slate-50 rounded-xl mb-2 text-xs">
              <p className="font-bold text-slate-900">{user.name}</p>
              <p className="text-slate-500 text-[11px]">{user.email}</p>
              <div className="mt-1 pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                角色權限：{roleLabel(user.role)} ({user.role})
              </div>
            </div>

            <div className="space-y-1">
              {isAdmin && (
                <Link
                  href="/settings/users"
                  role="menuitem"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                >
                  <Shield className="w-4 h-4 text-red-600" />
                  <span>人員與區域管理 (Admin)</span>
                </Link>
              )}

              <button
                type="button"
                role="menuitem"
                onClick={() => handleLogout(true)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition"
              >
                <Shield className="w-4 h-4" />
                <span>登出所有裝置</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => handleLogout(false)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>登出系統 (Logout)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
