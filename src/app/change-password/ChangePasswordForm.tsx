"use client";

import React, { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { apiErrorMessage, apiFetch } from "@/lib/api-client";
import { Button, Field, inputClassName } from "@/components/ui";

export function ChangePasswordForm({ name, forced }: { name: string; forced: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      setError("兩次輸入的新密碼不一致");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, newPasswordConfirm }),
      });
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setError(apiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-3">
            {forced ? "首次登入：請設定您的新密碼" : "更改密碼"}
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {forced
              ? `${name} 您好，目前使用的是管理者發放的初始密碼，設定個人新密碼後即可開始使用系統。`
              : "輸入目前密碼與新密碼以完成更改；其他裝置將自動登出。"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {error && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Field label="目前密碼（初始密碼）" required>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className={inputClassName}
              />
            </Field>

            <Field label="新密碼（至少 12 個字元）" required>
              <input
                type="password"
                required
                minLength={12}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className={inputClassName}
              />
            </Field>

            <Field label="確認新密碼" required>
              <input
                type="password"
                required
                minLength={12}
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                className={inputClassName}
              />
            </Field>

            <Button type="submit" loading={submitting} className="w-full">
              {submitting ? "設定中..." : forced ? "設定新密碼並開始使用" : "確認更改密碼"}
            </Button>
          </form>
        </div>

        <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          更改密碼後其他裝置的登入狀態會自動撤銷
        </p>
      </div>
    </div>
  );
}
