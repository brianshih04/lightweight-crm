import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "TWD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined, pattern: string = "yyyy-MM-dd HH:mm") {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern);
}

export function formatRelativeTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: zhTW });
}

export const REGIONS: Record<string, { label: string; badge: string; dot: string }> = {
  ALL: { label: "全區總覽", badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "#64748b" },
  NORTH: { label: "北部區域 (台北/新竹)", badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "#3b82f6" },
  CENTRAL: { label: "中部區域 (台中/彰化)", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "#6366f1" },
  SOUTH: { label: "南部區域 (高雄/台南)", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "#10b981" },
  OVERSEAS: { label: "海外與亞太區", badge: "bg-purple-50 text-purple-700 border-purple-200", dot: "#a855f7" },
};

export const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "初次接洽": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "需求確認": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  "方案報價": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "商務談判": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "贏單 Won": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "輸單 Lost": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

export const PRIORITY_CONFIG: Record<string, { label: string; badge: string }> = {
  LOW: { label: "低", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  MEDIUM: { label: "中", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  HIGH: { label: "高", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  URGENT: { label: "緊急", badge: "bg-red-100 text-red-800 border-red-300 font-semibold" },
};

export const TICKET_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  OPEN: { label: "待處理", badge: "bg-red-50 text-red-700 border-red-200" },
  IN_PROGRESS: { label: "處理中", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  PENDING: { label: "等待客戶", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  RESOLVED: { label: "已解決", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "已結案", badge: "bg-slate-100 text-slate-600 border-slate-200" },
};
