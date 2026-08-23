import React from "react";

/** 表單控制項（input/select/textarea）的統一樣式 */
export const inputClassName =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition";

export interface FieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
}

export function Field({ label, required, error, children }: FieldProps) {
  return (
    <div>
      {/* label 包裹控制項以建立無障礙關聯（點擊文字即可聚焦） */}
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        <span className="block mb-1">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
        {children}
      </label>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
