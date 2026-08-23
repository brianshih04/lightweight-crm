"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export interface SearchInputProps {
  value: string;
  onChange: (committedValue: string) => void;
  placeholder?: string;
  /** debounce 毫秒數，預設 300 */
  debounceMs?: number;
  ariaLabel?: string;
}

/**
 * 具備 debounce 的搜尋輸入框：輸入過程只更新內部文字，
 * 停止輸入 debounceMs 後才將值 commit 給父層（觸發 API 查詢）。
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "搜尋...",
  debounceMs = 300,
  ariaLabel = "搜尋",
}: SearchInputProps) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 外部值變動（例如重設篩選）且與目前文字不同時同步顯示
  useEffect(() => {
    setText((current) => (current === value ? current : value));
  }, [value]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const commit = (next: string) => {
    setText(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), debounceMs);
  };

  return (
    <div className="relative flex-1 min-w-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={text}
        onChange={(event) => commit(event.target.value)}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
      />
      {text && (
        <button
          type="button"
          onClick={() => commit("")}
          aria-label="清除搜尋"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
