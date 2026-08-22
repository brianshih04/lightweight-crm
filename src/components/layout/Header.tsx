"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, Plus, HelpCircle, MapPin, User, ChevronDown } from "lucide-react";
import { REGIONS } from "@/lib/utils";

export function Header() {
  const [users, setUsers] = useState<any[]>([]);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
          setActiveUser(data[0]); // Default: GM
        }
      })
      .catch(console.error);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Global Quick Search & Region Selector */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="全域搜尋客戶、聯絡人、商機、工單 (Ctrl + K)..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Region Indicator / Selector */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs">
          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer"
          >
            {Object.entries(REGIONS).map(([k, r]) => (
              <option key={k} value={k}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Controls & User Switcher */}
      <div className="flex items-center gap-3">
        {/* User Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 transition text-xs"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
              {activeUser ? activeUser.name.slice(0, 1) : "U"}
            </div>
            <div className="text-left hidden sm:block">
              <span className="font-semibold text-slate-800 block leading-tight">
                {activeUser ? activeUser.name : "柯博文 (Peter)"}
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                {activeUser ? activeUser.title : "總經理"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Menu Modal / Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in duration-100">
              <p className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                切換團隊成員身分
              </p>
              <div className="space-y-1 mt-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setActiveUser(u);
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                      activeUser?.id === u.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.title} · {u.department}</p>
                    </div>
                    {u.role === "GM" && (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                        GM
                      </span>
                    )}
                  </button>
                ))}
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
