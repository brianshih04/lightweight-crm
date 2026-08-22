"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  TrendingUp,
  DollarSign,
  Award,
  Globe2,
  Users,
  Building2,
  Headset,
  Target,
  Sparkles,
  Printer,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { formatCurrency, REGIONS } from "@/lib/utils";

export default function ExecutiveReportsPage() {
  const [data, setData] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const fetchReport = () => {
    setLoading(true);
    fetch(`/api/reports/executive?region=${selectedRegion}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReport();
  }, [selectedRegion]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          生成總經理決策分析報表中...
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const regionalBreakdown = data?.regionalBreakdown || [];
  const salesLeaderboard = data?.salesLeaderboard || [];
  const executiveTakeaways = data?.executiveTakeaways || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-600 text-white flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> 總經理決策專區
            </span>
            <span className="text-xs text-slate-400">2026 Q3 季度營運分析</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            全公司營運決策與分區業績報表
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            整合跨區域銷售管線、業務團隊績效貢獻與售後支援指標之宏觀分析。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>列印 / 匯出報表</span>
          </button>
        </div>
      </div>

      {/* Regional Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Object.entries(REGIONS).map(([key, reg]) => (
          <button
            key={key}
            onClick={() => setSelectedRegion(key)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition shrink-0 flex items-center gap-2 ${
              selectedRegion === key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: reg.dot }} />
            {reg.label}
          </button>
        ))}
      </div>

      {/* Top Level Target & Revenue Progress (GM High-level Goal) */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-indigo-400" /> 2026 Q3 總營收目標達成進度
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-extrabold text-white">
                {formatCurrency(kpis.totalWonValue)}
              </span>
              <span className="text-indigo-200 text-sm">
                / 目標 {formatCurrency(kpis.totalTarget)}
              </span>
            </div>

            {/* Target Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-indigo-200">
                <span>目前達成率</span>
                <span className="font-bold text-emerald-400">{kpis.targetAchievementRate}%</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(kpis.targetAchievementRate, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <span className="text-xs text-indigo-200 font-medium">進行中商機儲備 (Pipeline)</span>
            <p className="text-2xl font-bold text-white mt-2">{formatCurrency(kpis.totalPipelineValue)}</p>
            <p className="text-[11px] text-indigo-300 mt-1">涵蓋 {kpis.totalDealsCount} 筆跨區商機</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
            <span className="text-xs text-indigo-200 font-medium">全公司綜合勝率 (Win Rate)</span>
            <p className="text-2xl font-bold text-emerald-400 mt-2">{kpis.winRate}%</p>
            <p className="text-[11px] text-indigo-300 mt-1">高於業界 B2B 平均水準</p>
          </div>
        </div>
      </div>

      {/* Regional Performance Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-indigo-600" />
              分區域營運績效矩陣 (Regional Territory Matrix)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">北部、中部、南部與海外各區域的商機規模與服務指標對比</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">區域</th>
                <th className="px-6 py-3.5">已贏單成交額</th>
                <th className="px-6 py-3.5">進行中商機總額</th>
                <th className="px-6 py-3.5">商機總數</th>
                <th className="px-6 py-3.5">企業客戶數</th>
                <th className="px-6 py-3.5 text-right">待處理工單</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regionalBreakdown.map((reg: any) => (
                <tr key={reg.region} className="hover:bg-slate-50/70 transition">
                  <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REGIONS[reg.region]?.dot }} />
                    {reg.name}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600">
                    {formatCurrency(reg.wonValue)}
                  </td>
                  <td className="px-6 py-4 font-semibold text-indigo-600">
                    {formatCurrency(reg.pipelineValue)}
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">
                    {reg.dealsCount} 筆
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {reg.accountsCount} 家
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        reg.openTicketsCount > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {reg.openTicketsCount} 件
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Sales Leaderboard + GM Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Rep Leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              業務團隊業績排行榜 (Sales Leaderboard)
            </h2>
            <span className="text-xs text-slate-400">依贏單金額排序</span>
          </div>

          <div className="space-y-3">
            {salesLeaderboard.map((user: any, index: number) => {
              const regConfig = REGIONS[user.region] || { label: user.region, badge: "bg-slate-100" };
              return (
                <div
                  key={user.id}
                  className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                        index === 0
                          ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300"
                          : index === 1
                          ? "bg-slate-200 text-slate-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{user.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${regConfig.badge}`}>
                          {regConfig.label.split(" ")[0]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{user.title}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-600 block">
                      {formatCurrency(user.wonAmount)}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      進行中：{formatCurrency(user.pipelineAmount)} ({user.openCount} 筆)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Executive AI & GM Decision Insights */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">總經理營運決策洞察 (Executive Insights)</h2>
          </div>

          <div className="space-y-3">
            {executiveTakeaways.map((item: any, i: number) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  {item.type === "HIGHLIGHT" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : item.type === "OPPORTUNITY" ? (
                    <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-6">{item.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
