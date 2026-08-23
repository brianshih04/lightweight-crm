"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  MapPin,
  User,
  ChevronDown,
  LogOut,
  Shield,
  Award,
  KeyRound,
} from "lucide-react";
import { REGIONS } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          if (["SALES_MANAGER", "SALES", "ORDER_ADMIN"].includes(data.user.role)) {
            setSelectedRegion(data.user.region);
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleLogout = async (allDevices = false) => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: allDevices ? { "Content-Type": "application/json" } : undefined,
        body: allDevices ? JSON.stringify({ allDevices: true }) : undefined,
      });
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";
  const isGM = currentUser?.role === "GM";
  const isFullAccess = isAdmin || isGM;
  const userRegionLabel = REGIONS[currentUser?.region || "ALL"]?.label || "全區";

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Global Quick Search & Region Scope Status */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <div className="relative w-72 sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="全域搜尋 (Ctrl + K)..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Region Indicator / Dropdown */}
        {isFullAccess ? (
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${
            isAdmin ? "bg-red-50/80 border-red-200/80" : "bg-amber-50/80 border-amber-200/80"
          }`}>
            {isAdmin ? (
              <Shield className="w-3.5 h-3.5 text-red-600" />
            ) : (
              <Award className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className={`text-[11px] font-bold ${isAdmin ? "text-red-800" : "text-amber-800"}`}>
              {isAdmin ? "系統管理者全區視角：" : "總經理全區視角："}
            </span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className={`bg-transparent font-semibold focus:outline-none cursor-pointer ${
                isAdmin ? "text-red-900" : "text-amber-900"
              }`}
            >
              {Object.entries(REGIONS).map(([k, r]) => (
                <option key={k} value={k}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 font-medium">
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span>責任區域：<strong className="text-slate-900">{userRegionLabel}</strong></span>
          </div>
        )}
      </div>

      {/* Action Controls & User Switcher */}
      <div className="flex items-center gap-3">
        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition text-xs"
          >
            <div className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs text-white ${
              isAdmin ? "bg-rose-600" : isGM ? "bg-amber-600" : "bg-indigo-600"
            }`}>
              {currentUser ? currentUser.name.slice(0, 1) : "U"}
            </div>
            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">{currentUser ? currentUser.name : "登入中..."}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                  isAdmin
                    ? "bg-red-100 text-red-800 border-red-200"
                    : isGM
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}>
                  {isAdmin ? "系統管理者" : isGM ? "總經理" : currentUser?.role === "MARKETING_MANAGER" ? "市場部主管" : currentUser?.role === "SALES_MANAGER" ? "區域主管" : currentUser?.role === "ORDER_ADMIN" ? "訂單管理員" : currentUser?.role === "SALES" ? "Sales" : currentUser?.role}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block leading-tight">
                {currentUser?.title || "使用者"} · {userRegionLabel}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Menu Modal / Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in duration-100">
              <div className="p-3 bg-slate-50 rounded-xl mb-2 text-xs">
                <p className="font-bold text-slate-900">{currentUser?.name}</p>
                <p className="text-slate-500 text-[11px]">{currentUser?.email}</p>
                <div className="mt-1 pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                  角色權限：{isAdmin ? "系統管理者 (Admin)" : isGM ? "總經理 (GM)" : currentUser?.role === "MARKETING_MANAGER" ? "市場部主管" : currentUser?.role === "SALES_MANAGER" ? "區域主管" : currentUser?.role === "ORDER_ADMIN" ? "訂單管理員" : currentUser?.role === "SALES" ? "Sales" : currentUser?.role}
                </div>
              </div>

              <div className="space-y-1">
                {isAdmin && (
                  <Link
                    href="/settings/users"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
                  >
                    <Shield className="w-4 h-4 text-red-600" />
                    <span>人員與區域管理 (Admin)</span>
                  </Link>
                )}

                <Link
                  href="/login"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>切換測試帳號 / 重新登入</span>
                </Link>

                <button
                  onClick={() => handleLogout(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition"
                >
                  <Shield className="w-4 h-4" />
                  <span>登出所有裝置</span>
                </button>

                <button
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

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Notifications */}
        <button
          title="通知"
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}
