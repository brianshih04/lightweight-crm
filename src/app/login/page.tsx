"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, User, ShieldCheck, ArrowRight, Shield, Award } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    roleLabel: "🛠️ 系統管理員 (System Admin)",
    name: "系統管理員",
    username: "admin",
    password: "Avi22099759",
    desc: "系統管理者：可建立所有人員帳號、指派各 Sales 負責區域、管理系統配置",
    color: "border-red-400 bg-red-50/70 hover:bg-red-100/80 text-red-950",
    badge: "系統最高管理",
  },
  {
    roleLabel: "👑 總經理 (General Manager / CEO)",
    name: "柯博文 (Peter)",
    username: "peter_gm",
    password: "peter123",
    desc: "全域決策者：可檢視全公司所有區域的營運狀況、商機漏斗與業績排行榜",
    color: "border-amber-400 bg-amber-50/70 hover:bg-amber-100/80 text-amber-950",
    badge: "全區業務總覽",
  },
  {
    roleLabel: "🏢 北部業務主管 (Sales Manager)",
    name: "張雅婷 (Alice)",
    username: "alice_mgr",
    password: "alice123",
    desc: "管轄北部區域全體業務，可檢視下屬 Sales 業績與商機",
    color: "border-indigo-400 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-950",
    badge: "北部全區 + 下屬",
  },
  {
    roleLabel: "💼 北部業務代表 (Sales Rep)",
    name: "林凱文 (Kevin)",
    username: "kevin_sales",
    password: "kevin123",
    desc: "僅能檢視北部個人負責之商機、線索與客戶",
    color: "border-blue-300 bg-blue-50/60 hover:bg-blue-100/80 text-blue-950",
    badge: "北部個人責任區",
  },
  {
    roleLabel: "💼 中部業務代表 (Sales Rep)",
    name: "李宗翰 (Bob)",
    username: "bob_sales",
    password: "bob123",
    desc: "僅能檢視中部地區負責之商機與客戶",
    color: "border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-950",
    badge: "中部個人責任區",
  },
  {
    roleLabel: "💼 南部業務代表 (Sales Rep)",
    name: "趙冠宇 (Charlie)",
    username: "charlie_sales",
    password: "charlie123",
    desc: "僅能檢視南部地區負責之商機與客戶",
    color: "border-purple-300 bg-purple-50/60 hover:bg-purple-100/80 text-purple-950",
    badge: "南部個人責任區",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    const loginUser = customUser || username;
    const loginPass = customPass || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登入失敗，請檢查帳號密碼");
        setLoading(false);
        return;
      }

      // Success redirect
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setError("網路連線錯誤");
      setLoading(false);
    }
  };

  const handleQuickLogin = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setUsername(acc.username);
    setPassword(acc.password);
    handleLogin(undefined, acc.username, acc.password);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 px-4">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">登入 NexCRM 系統</h1>
            <p className="text-xs text-slate-500">
              請輸入您的專屬帳號密碼以存取對應權限與區域資料。
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">使用者帳號 (Username)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例如：admin, peter_gm, alice_mgr"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">密碼 (Password)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>驗證登入中...</span>
              ) : (
                <>
                  <span>立即登入系統</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Quick Role Test Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 uppercase tracking-wider">
              快速體驗 / 權限切換
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">一鍵以不同身分快速登入</h2>
            <p className="text-xs text-slate-500">
              點擊下方卡片即可立即體驗「系統管理者」、「總經理全區視圖」、「業務主管區域管理」或「個別業務專屬視角」之嚴格資料隔離效果：
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map((acc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickLogin(acc)}
                className={`w-full text-left p-3.5 rounded-2xl border ${acc.color} transition shadow-sm hover:shadow-md cursor-pointer block space-y-1`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate">{acc.roleLabel}</span>
                  <span className="text-[9px] bg-white px-2 py-0.5 rounded-full border border-black/10 font-bold shrink-0">
                    {acc.badge}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="font-semibold text-slate-900">{acc.name} ({acc.username})</span>
                  <span className="text-[10px] text-slate-500 font-mono">密碼: {acc.password}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">{acc.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
