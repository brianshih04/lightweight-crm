"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  DollarSign,
  TrendingUp,
  Headset,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Building2,
  KanbanSquare,
} from "lucide-react";
import { formatCurrency, formatRelativeTime, PRIORITY_CONFIG } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          載入儀表板數據中...
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const pipelineStages = data?.pipelineStages || [];
  const openTickets = data?.openTickets || [];
  const activities = data?.activities || [];
  const sentCampaigns = data?.sentCampaigns || [];

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            企業營運總覽
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            即時掌握銷售管線、客戶互動、行銷轉換與售後支援指標。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/sales/pipeline"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-indigo-600/20 transition"
          >
            <KanbanSquare className="w-4 h-4" />
            <span>開啟商機看板</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Pipeline Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              進行中商機總額
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(kpis.totalPipelineValue || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              共 <span className="font-semibold text-slate-700">{kpis.openDealsCount || 0}</span> 筆進行中商機
            </p>
          </div>
        </div>

        {/* Won Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              已成交贏單金額
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(kpis.wonValue || 0)}
            </div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" /> 成交勝率 {kpis.winRate || 0}%
            </p>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              客戶與聯絡人
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {kpis.totalContacts || 0} <span className="text-sm font-normal text-slate-500">位</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              跨 <span className="font-semibold text-slate-700">{kpis.totalAccounts || 0}</span> 家企業客戶
            </p>
          </div>
        </div>

        {/* Support Tickets */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              待處理售後工單
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Headset className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {kpis.openTicketsCount || 0} <span className="text-sm font-normal text-slate-500">件</span>
            </div>
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5" /> SLA 正常監控中
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Pipeline Funnel + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Pipeline Funnel Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">銷售管線各階段分布 (Sales Funnel)</h2>
              <p className="text-xs text-slate-500 mt-0.5">即時統計各階段商機數量與金額</p>
            </div>
            <Link
              href="/sales/pipeline"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              進入完整看板 <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {pipelineStages.map((stage: any, index: number) => {
              const maxVal = Math.max(...pipelineStages.map((s: any) => s.totalValue), 1);
              const percentage = Math.round((stage.totalValue / maxVal) * 100);
              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.name}
                    </span>
                    <span className="text-slate-500">
                      <strong className="text-slate-800">{stage.count}</strong> 筆商機 · {formatCurrency(stage.totalValue)}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(percentage, stage.count > 0 ? 5 : 0)}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">最新互動歷程 (Timeline)</h2>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              即時
            </span>
          </div>

          <div className="space-y-3.5">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">尚無活動紀錄</p>
            ) : (
              activities.map((act: any) => (
                <div key={act.id} className="flex items-start gap-3 text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    {act.type === "CALL" ? "📞" : act.type === "STAGE_CHANGE" ? "🚀" : "📝"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{act.title}</p>
                    <p className="text-slate-500 text-[11px] truncate mt-0.5">{act.content || act.contact?.name}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Open Tickets & Marketing Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Support Tickets Queue */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headset className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">售後客服工單佇列</h2>
            </div>
            <Link
              href="/support/tickets"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              工單收件箱 <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {openTickets.map((t: any) => {
              const priority = PRIORITY_CONFIG[t.priority] || { label: t.priority, badge: "bg-slate-100" };
              return (
                <Link
                  key={t.id}
                  href={`/support/tickets/${t.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600">{t.ticketNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${priority.badge}`}>
                        {priority.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 truncate mt-1">{t.subject}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t.contact?.name || "未知客戶"} · {t.account?.name || ""}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {formatRelativeTime(t.createdAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Marketing Campaign Performance */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">近期行銷推播與成效</h2>
            </div>
            <Link
              href="/marketing/campaigns"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              行銷活動中心 <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {sentCampaigns.map((c: any) => {
              const openRate = c.sentCount > 0 ? Math.round((c.openedCount / c.sentCount) * 100) : 0;
              const clickRate = c.sentCount > 0 ? Math.round((c.clickedCount / c.sentCount) * 100) : 0;
              return (
                <div key={c.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{c.name}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                      已發送
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded border border-slate-200/60">
                      <p className="text-[10px] text-slate-400">發送總數</p>
                      <p className="text-xs font-bold text-slate-800">{c.sentCount}</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200/60">
                      <p className="text-[10px] text-slate-400">開信率</p>
                      <p className="text-xs font-bold text-indigo-600">{openRate}%</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200/60">
                      <p className="text-[10px] text-slate-400">點擊率</p>
                      <p className="text-xs font-bold text-emerald-600">{clickRate}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
