"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type {
  AuditEventDto,
  AuditPageDto,
  AuditResult,
  SecurityAlertDto,
  SecurityStatus,
  SecuritySummaryDto,
} from "@/lib/audit-types";

interface Filters {
  action: string;
  resource: string;
  result: "" | AuditResult;
}

const EMPTY_FILTERS: Filters = { action: "", resource: "", result: "" };
const pressable = "transition-[transform,background-color,border-color,color] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]";

async function readJson<T>(response: Response): Promise<T> {
  const value: unknown = await response.json();
  if (!response.ok) {
    const message = value && typeof value === "object" && "error" in value
      ? String((value as { error: unknown }).error)
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return value as T;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function detailsText(value: unknown) {
  if (value === null || value === undefined) return "—";
  try {
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return "[無法顯示]";
  }
}

function statusStyle(status: SecurityStatus) {
  if (status === "CRITICAL") return "bg-rose-50 border-rose-200 text-rose-700";
  if (status === "WARNING") return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-emerald-50 border-emerald-200 text-emerald-700";
}

function resultStyle(result: AuditResult) {
  if (result === "FAILURE") return "bg-rose-50 text-rose-700 border-rose-200";
  if (result === "DENIED") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function alertLabel(alert: SecurityAlertDto) {
  const labels = {
    AUDIT_FAILURES: "應用失敗事件",
    DENIAL_SPIKE: "拒絕事件異常增加",
    LOGIN_BLOCKS: "登入封鎖生效",
    REPEATED_SOURCE: "單一來源重複觸發",
  } as const;
  return labels[alert.code];
}

export function AuditDashboard() {
  const [summary, setSummary] = useState<SecuritySummaryDto | null>(null);
  const [events, setEvents] = useState<AuditEventDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = async (activeFilters: Filters, cursor?: string, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ limit: "50" });
      if (activeFilters.action.trim()) query.set("action", activeFilters.action.trim());
      if (activeFilters.resource.trim()) query.set("resource", activeFilters.resource.trim());
      if (activeFilters.result) query.set("result", activeFilters.result);
      if (cursor) query.set("cursor", cursor);

      const eventPromise = fetch(`/api/audit?${query}`, { cache: "no-store" }).then((response) => readJson<AuditPageDto>(response));
      const [page, nextSummary] = await Promise.all([
        eventPromise,
        append && summary
          ? Promise.resolve(summary)
          : fetch("/api/audit/summary", { cache: "no-store" }).then((response) => readJson<SecuritySummaryDto>(response)),
      ]);

      setSummary(nextSummary);
      setEvents((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "無法載入稽核資料");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void load(EMPTY_FILTERS);
  }, []);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    const next = { ...filters };
    setAppliedFilters(next);
    void load(next);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    void load(EMPTY_FILTERS);
  };

  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
            <ShieldCheck className="h-4 w-4" />
            Admin security operations
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">安全稽核與告警</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            追蹤身份驗證、權限拒絕與重要資料異動。來源以不可逆 HMAC 假名顯示，不保存原始 IP。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(appliedFilters)}
          disabled={loading}
          className={`${pressable} inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:pointer-events-none disabled:opacity-50`}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          重新整理
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">稽核資料載入失敗</p>
            <p className="mt-0.5 text-xs text-rose-700">{error}</p>
          </div>
        </div>
      )}

      <section aria-label="安全狀態摘要" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="目前安全狀態"
          value={summary?.status ?? (loading ? "讀取中" : "未知")}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone={summary ? statusStyle(summary.status) : "bg-slate-50 border-slate-200 text-slate-600"}
        />
        <SummaryCard label="24 小時成功事件" value={summary?.last24h.success ?? "—"} icon={<CheckCircle2 className="h-5 w-5" />} tone="bg-emerald-50 border-emerald-200 text-emerald-700" />
        <SummaryCard label="15 分鐘拒絕事件" value={summary?.last15m.denied ?? "—"} icon={<Ban className="h-5 w-5" />} tone="bg-amber-50 border-amber-200 text-amber-700" />
        <SummaryCard label="15 分鐘失敗事件" value={summary?.last15m.failure ?? "—"} icon={<XCircle className="h-5 w-5" />} tone="bg-rose-50 border-rose-200 text-rose-700" />
        <SummaryCard label="生效中的登入封鎖" value={summary?.activeLoginBlocks ?? "—"} icon={<AlertTriangle className="h-5 w-5" />} tone="bg-indigo-50 border-indigo-200 text-indigo-700" />
      </section>

      {summary && summary.alerts.length > 0 && (
        <section aria-label="目前告警" className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            需要檢視的安全訊號
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {summary.alerts.map((alert, index) => (
              <div key={`${alert.code}-${alert.ipHash ?? "global"}-${index}`} className="rounded-xl border border-amber-200 bg-white/80 p-3 text-xs text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-900">{alertLabel(alert)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${alert.severity === "CRITICAL" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-1 text-slate-500">
                  {alert.count} 次{alert.windowMinutes ? `／${alert.windowMinutes} 分鐘` : ""}
                  {alert.ipHash ? ` · 來源 ${alert.ipHash.slice(0, 12)}…` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {summary && summary.topSources15m.length > 0 && (
        <section aria-label="高頻來源" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">15 分鐘內高頻拒絕／失敗來源</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.topSources15m.map((source) => (
              <span key={source.ipHash} title={source.ipHash} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-600">
                {source.ipHash.slice(0, 12)}… · {source.count}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">稽核事件</h2>
              <p className="mt-1 text-xs text-slate-500">每頁最多 50 筆；套用篩選後會從最新事件重新查詢。</p>
            </div>
            {activeFilterCount > 0 && <span className="text-xs font-bold text-indigo-600">已套用 {activeFilterCount} 個條件</span>}
          </div>

          <form onSubmit={applyFilters} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
            <label className="space-y-1 text-xs font-bold text-slate-600">
              <span>動作</span>
              <input value={filters.action} onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))} maxLength={50} placeholder="例如 login、create" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15" />
            </label>
            <label className="space-y-1 text-xs font-bold text-slate-600">
              <span>資源</span>
              <input value={filters.resource} onChange={(event) => setFilters((current) => ({ ...current, resource: event.target.value }))} maxLength={50} placeholder="例如 auth、users" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15" />
            </label>
            <label className="space-y-1 text-xs font-bold text-slate-600">
              <span>結果</span>
              <select value={filters.result} onChange={(event) => setFilters((current) => ({ ...current, result: event.target.value as Filters["result"] }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15">
                <option value="">全部結果</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="DENIED">DENIED</option>
                <option value="FAILURE">FAILURE</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className={`${pressable} inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700`}>
                <Search className="h-4 w-4" />套用
              </button>
              <button type="button" onClick={clearFilters} aria-label="清除篩選" className={`${pressable} rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800`}>
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">時間／結果</th>
                <th className="px-4 py-3">操作者</th>
                <th className="px-4 py-3">動作／資源</th>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">來源</th>
                <th className="px-5 py-3">細節</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => {
                const detail = detailsText(event.details);
                return (
                  <tr key={event.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${resultStyle(event.result)}`}>{event.result}</span>
                      <p className="mt-1.5 whitespace-nowrap text-[11px] text-slate-500">{dateTime(event.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800">{event.actorUsername ?? "匿名／系統"}</p>
                      <p className="mt-1 max-w-40 truncate font-mono text-[10px] text-slate-400" title={event.actorId ?? undefined}>{event.actorId ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800">{event.action}</p>
                      <p className="mt-1 text-slate-500">{event.resource}{event.resourceId ? ` · ${event.resourceId}` : ""}</p>
                    </td>
                    <td className="px-4 py-3.5"><code title={event.requestId} className="text-[10px] text-slate-500">{event.requestId.slice(0, 16)}…</code></td>
                    <td className="px-4 py-3.5"><code title={event.ipHash ?? undefined} className="text-[10px] text-slate-500">{event.ipHash ? `${event.ipHash.slice(0, 12)}…` : "—"}</code></td>
                    <td className="max-w-72 px-5 py-3.5"><code title={detail} className="block truncate text-[10px] text-slate-500">{detail}</code></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && events.length === 0 && (
          <div className="px-6 py-14 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">目前沒有符合條件的稽核事件</p>
            <p className="mt-1 text-xs text-slate-400">調整篩選條件，或稍後重新整理。</p>
          </div>
        )}

        {loading && events.length === 0 && (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-xs font-bold text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />正在載入安全資料…
          </div>
        )}

        {nextCursor && (
          <div className="border-t border-slate-200 bg-slate-50/60 p-4 text-center">
            <button type="button" disabled={loadingMore} onClick={() => void load(appliedFilters, nextCursor, true)} className={`${pressable} inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-indigo-200 hover:text-indigo-700 disabled:pointer-events-none disabled:opacity-50`}>
              {loadingMore ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
              {loadingMore ? "載入中…" : "載入更早事件"}
            </button>
          </div>
        )}
      </section>

      {summary && <p className="text-right text-[11px] text-slate-400">摘要產生時間：{dateTime(summary.generatedAt)}</p>}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">{label}</p>
        <span className="opacity-80">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
