"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  DollarSign,
  TrendingUp,
  Headset,
  ArrowUpRight,
  Clock,
  Plus,
  Send,
  KanbanSquare,
  Phone,
  Rocket,
  StickyNote,
} from "lucide-react";
import { formatCurrency, formatRelativeTime, PRIORITY_CONFIG } from "@/lib/utils";
import { apiErrorMessage, apiFetch } from "@/lib/api-client";
import { EmptyState, ErrorBanner, PageHeader, PageLoader } from "@/components/ui";
import { StageFunnelChart } from "@/components/charts/StageFunnelChart";
import { TicketPriorityDonut, TICKET_PRIORITY_COLORS } from "@/components/charts/TicketPriorityDonut";

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  MEETING: Users,
  STAGE_CHANGE: Rocket,
  NOTE: StickyNote,
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const json = await apiFetch<any>("/api/dashboard");
      setData(json);
    } catch (err) {
      console.error(err);
      setLoadError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <PageLoader label="載入儀表板數據中..." />;
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="企業營運總覽" description="即時掌握銷售管線、客戶互動、行銷轉換與售後支援指標。" />
        <ErrorBanner message={loadError} onRetry={fetchDashboard} />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const pipelineStages = data?.pipelineStages || [];
  const openTickets = data?.openTickets || [];
  const activities = data?.activities || [];
  const sentCampaigns = data?.sentCampaigns || [];

  const priorityData = ["URGENT", "HIGH", "MEDIUM", "LOW"]
    .map((priority) => ({
      name: PRIORITY_CONFIG[priority]?.label ?? priority,
      value: openTickets.filter((t: any) => t.priority === priority).length,
      color: TICKET_PRIORITY_COLORS[priority],
    }))
    .filter((item) => item.value > 0);

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <PageHeader title="企業營運總覽" description="即時掌握銷售管線、客戶互動、行銷轉換與售後支援指標。">
        <Link
          href="/sales/pipeline"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-indigo-600/20 transition"
        >
          <KanbanSquare className="w-4 h-4" />
          <span>開啟商機看板</span>
        </Link>
      </PageHeader>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Pipeline Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">進行中商機總額</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.totalPipelineValue || 0)}</div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              共 <span className="font-semibold text-slate-700">{kpis.openDealsCount || 0}</span> 筆進行中商機
            </p>
          </div>
        </div>

        {/* Won Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">已成交贏單金額</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.wonValue || 0)}</div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" /> 成交勝率 {kpis.winRate || 0}%
            </p>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">客戶與聯絡人</span>
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">待處理售後工單</span>
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

          {pipelineStages.length === 0 ? (
            <EmptyState
              icon={KanbanSquare}
              title="尚無商機資料"
              description="建立第一筆商機後，這裡會顯示各階段的金額分佈圖。"
            >
              <Link
                href="/sales/pipeline"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> 前往建立商機
              </Link>
            </EmptyState>
          ) : (
            <StageFunnelChart
              stages={pipelineStages.map((stage: any) => ({
                name: stage.name,
                color: stage.color,
                count: stage.count,
                totalValue: stage.totalValue,
              }))}
            />
          )}
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">最新互動歷程 (Timeline)</h2>
            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">即時</span>
          </div>

          <div className="space-y-3.5">
            {activities.length === 0 ? (
              <EmptyState icon={StickyNote} title="尚無活動紀錄" description="聯絡人 360 頁面記錄的通話、會議與備註會顯示在這裡。" />
            ) : (
              activities.map((act: any) => {
                const Icon = ACTIVITY_ICONS[act.type] ?? StickyNote;
                return (
                  <div key={act.id} className="flex items-start gap-3 text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{act.title}</p>
                      <p className="text-slate-500 text-[11px] truncate mt-0.5">{act.content || act.contact?.name}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{formatRelativeTime(act.createdAt)}</span>
                    </div>
                  </div>
                );
              })
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

          {openTickets.length === 0 ? (
            <EmptyState icon={Headset} title="目前沒有待處理工單" description="新的客戶支援案件會即時顯示在這裡。" />
          ) : (
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="sm:w-48 shrink-0">
                <TicketPriorityDonut data={priorityData} />
              </div>
              <div className="flex-1 space-y-2.5 min-w-0">
                {openTickets.slice(0, 5).map((t: any) => {
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
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${priority.badge}`}>{priority.label}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 truncate mt-1">{t.subject}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {t.contact?.name || "未知客戶"} · {t.account?.name || ""}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">{formatRelativeTime(t.createdAt)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
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
            {sentCampaigns.length === 0 ? (
              <EmptyState icon={Send} title="尚無行銷活動成效" description="發送第一個 EDM 行銷活動後，開信與點擊成效會顯示在這裡。" />
            ) : (
              sentCampaigns.map((c: any) => {
                const openRate = c.sentCount > 0 ? Math.round((c.openedCount / c.sentCount) * 100) : 0;
                const clickRate = c.sentCount > 0 ? Math.round((c.clickedCount / c.sentCount) * 100) : 0;
                return (
                  <div key={c.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{c.name}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded">已發送</span>
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
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
