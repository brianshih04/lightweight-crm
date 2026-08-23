"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";

type PageMode = "checking" | "setup" | "login";

export default function LoginPage() {
  const [mode, setMode] = useState<PageMode>("checking");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/setup", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Setup status request failed");
        return response.json() as Promise<{ needsSetup: boolean }>;
      })
      .then((data) => setMode(data.needsSetup ? "setup" : "login"))
      .catch(() => {
        setError("無法確認系統初始化狀態，請稍後再試");
        setMode("login");
      });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "setup" && password !== passwordConfirm) {
      setError("兩次輸入的密碼不一致");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(mode === "setup" ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "setup"
            ? { username, name, email, password, passwordConfirm }
            : { username, password }
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "INITIAL_SETUP_REQUIRED") setMode("setup");
        setError(data.error || (mode === "setup" ? "初始化失敗" : "登入失敗，請檢查帳號密碼"));
        return;
      }
      window.location.href = "/";
    } catch {
      setError("網路連線錯誤");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "checking") {
    return (
      <div className="min-h-[85vh] flex items-center justify-center text-sm font-semibold text-slate-500">
        正在確認系統狀態…
      </div>
    );
  }

  const isSetup = mode === "setup";

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        <div className="space-y-2">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md ${isSetup ? "bg-rose-600 shadow-rose-500/20" : "bg-indigo-600 shadow-indigo-500/20"}`}>
            {isSetup ? <ShieldCheck className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isSetup ? "建立第一位系統管理員" : "登入 NexCRM 系統"}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isSetup
              ? "目前尚無任何使用者。第一位完成設定的人將成為 ADMIN；密碼必須由本人設定，系統不提供預設密碼。"
              : "請輸入您的專屬帳號密碼以存取已授權的資料。"}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {isSetup && (
            <>
              <Field label="姓名" icon={<User className="w-4 h-4" />}>
                <input
                  type="text"
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="field-input"
                />
              </Field>
              <Field label="Email" icon={<Mail className="w-4 h-4" />}>
                <input
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field-input"
                />
              </Field>
            </>
          )}

          <Field label="使用者帳號" icon={<User className="w-4 h-4" />}>
            <input
              type="text"
              required
              minLength={3}
              maxLength={50}
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={isSetup ? "例如：admin" : "輸入帳號或 Email"}
              className="field-input"
            />
          </Field>

          <Field label="密碼" hint={isSetup ? "至少 12 個字元" : undefined} icon={<Lock className="w-4 h-4" />}>
            <input
              type="password"
              required
              minLength={isSetup ? 12 : undefined}
              maxLength={128}
              autoComplete={isSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-input"
            />
          </Field>

          {isSetup && (
            <Field label="確認密碼" icon={<Lock className="w-4 h-4" />}>
              <input
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                className="field-input"
              />
            </Field>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition text-sm flex items-center justify-center gap-2 disabled:opacity-60 ${isSetup ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"}`}
          >
            <span>{loading ? (isSetup ? "建立管理員中…" : "驗證登入中…") : (isSetup ? "建立 ADMIN 並登入" : "立即登入系統")}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {isSetup && (
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
            此入口只在使用者數量為零時開放。建立成功後不可再次透過此頁取得 ADMIN 權限。
          </p>
        )}
      </div>
      <style jsx>{`
        :global(.field-input) {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          padding: 0.625rem 1rem 0.625rem 2.25rem;
          font-size: 0.75rem;
          outline: none;
        }
        :global(.field-input:focus) {
          border-color: rgb(99 102 241);
          box-shadow: 0 0 0 3px rgb(99 102 241 / 0.12);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
        <span>{label}</span>
        {hint && <span className="font-medium text-slate-400">{hint}</span>}
      </span>
      <span className="relative block">
        <span className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        {children}
      </span>
    </label>
  );
}
