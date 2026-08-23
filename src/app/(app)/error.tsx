"use client";

import { ErrorBanner } from "@/components/ui";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-8">
      <ErrorBanner message="頁面發生未預期的錯誤，請重試；若持續發生請聯絡系統管理員。" onRetry={reset} />
    </div>
  );
}
