import React from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      <div className="w-12 h-12 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-600">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-400 max-w-sm leading-relaxed">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
