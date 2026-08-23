"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-px" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">載入失敗</p>
        <p className="mt-0.5 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 border border-rose-200 hover:border-rose-300 rounded-lg px-2.5 py-1.5 transition shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重試
        </button>
      )}
    </div>
  );
}
