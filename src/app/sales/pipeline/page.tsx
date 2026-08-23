"use client";

import React, { useEffect, useState } from "react";
import {
  KanbanSquare,
  Plus,
  DollarSign,
  Calendar,
  Building2,
  User,
  ChevronRight,
  MoreVertical,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatCurrency, STAGE_COLORS } from "@/lib/utils";
import { fetchAllPages } from "@/lib/api-client";

function mergePipelinePage(current: any, incoming: any) {
  const mergeOne = (existing: any, page: any) => ({
    ...existing,
    ...page,
    stages: existing.stages.map((stage: any) => {
      const nextStage = page.stages.find((candidate: any) => candidate.id === stage.id);
      return nextStage ? { ...nextStage, deals: [...stage.deals, ...nextStage.deals] } : stage;
    }),
  });

  return {
    ...current,
    ...incoming,
    pipelines: current.pipelines.map((pipeline: any) => {
      const nextPipeline = incoming.pipelines.find((candidate: any) => candidate.id === pipeline.id);
      return nextPipeline ? mergeOne(pipeline, nextPipeline) : pipeline;
    }),
    activePipeline: current.activePipeline && incoming.activePipeline
      ? mergeOne(current.activePipeline, incoming.activePipeline)
      : incoming.activePipeline || current.activePipeline,
  };
}

export default function SalesPipelinePage() {
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);

  // New Deal Form State
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState("");
  const [contactId, setContactId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPipeline = async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/deals?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      if (!response.ok) throw new Error(`Deals request failed: ${response.status}`);
      const data = await response.json();
      setNextCursor(response.headers.get("X-Next-Cursor"));
      setPipelineData((current: any) => cursor && current ? mergePipelinePage(current, data) : data);
      if (data.activePipeline?.stages?.length > 0 && !stageId) {
        setStageId(data.activePipeline.stages[0].id);
      }
    } catch (error) {
      console.error(error);
      setLoadError("無法載入商機看板，請稍後再試。");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
    fetchAllPages<any>("/api/contacts").then(setContacts).catch(console.error);
    fetchAllPages<any>("/api/accounts").then(setAccounts).catch(console.error);
  }, []);

  const handleStageChange = async (dealId: string, targetStageId: string, targetStageName: string) => {
    try {
      let status = "OPEN";
      if (targetStageName.includes("贏單") || targetStageName.includes("Won")) status = "WON";
      if (targetStageName.includes("輸單") || targetStageName.includes("Lost")) status = "LOST";

      await fetch("/api/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, stageId: targetStageId, status }),
      });
      fetchPipeline();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !pipelineData?.activePipeline?.id) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          value: parseFloat(value) || 0,
          pipelineId: pipelineData.activePipeline.id,
          stageId: stageId || pipelineData.activePipeline.stages[0]?.id,
          contactId: contactId || null,
          accountId: accountId || null,
          expectedCloseDate: expectedCloseDate || null,
          notes,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setTitle("");
        setValue("");
        setContactId("");
        setAccountId("");
        setExpectedCloseDate("");
        setNotes("");
        fetchPipeline();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          載入銷售商機看板中...
        </div>
      </div>
    );
  }

  const stages = pipelineData?.activePipeline?.stages || [];
  const totalPipelineValue = stages.reduce(
    (sum: number, s: any) => sum + s.deals.reduce((dSum: number, d: any) => dSum + d.value, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Kanban Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <KanbanSquare className="w-6 h-6 text-indigo-600" />
            商機銷售看板 (Sales Kanban)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            已載入商機總值：<strong className="text-indigo-600 font-semibold">{formatCurrency(totalPipelineValue)}</strong> · 視覺化推動各階段成交進展。
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>建立新商機</span>
        </button>
      </div>

      {/* Kanban Columns Horizontal Scroll Area */}
      <div className="flex gap-5 overflow-x-auto pb-6 items-start">
        {stages.map((stage: any) => {
          const stageTotal = stage.deals.reduce((sum: number, d: any) => sum + d.value, 0);
          return (
            <div
              key={stage.id}
              className="w-80 shrink-0 bg-slate-100/90 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col max-h-[calc(100vh-220px)]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="font-bold text-slate-800 text-sm">{stage.name}</span>
                  <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                    {stage.deals.length}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {formatCurrency(stageTotal)}
                </span>
              </div>

              {/* Deal Cards Stream */}
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {stage.deals.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    暫無商機
                  </div>
                ) : (
                  stage.deals.map((deal: any) => (
                    <div
                      key={deal.id}
                      className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition space-y-3"
                    >
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{deal.title}</h4>
                        <div className="flex items-center gap-1 text-base font-bold text-indigo-600 mt-1">
                          <DollarSign className="w-4 h-4 -mr-1" />
                          <span>{formatCurrency(deal.value)}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                        {deal.account && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{deal.account.name}</span>
                          </div>
                        )}
                        {deal.contact && (
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{deal.contact.name} ({deal.contact.title || "聯絡人"})</span>
                          </div>
                        )}
                        {deal.expectedCloseDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>預計結案：{new Date(deal.expectedCloseDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Move Stage Selector */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">移動階段：</span>
                        <select
                          value={deal.stageId}
                          onChange={(e) => {
                            const target = stages.find((s: any) => s.id === e.target.value);
                            if (target) handleStageChange(deal.id, target.id, target.name);
                          }}
                          className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
                        >
                          {stages.map((st: any) => (
                            <option key={st.id} value={st.id}>
                              {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {loadError && <p role="alert" className="text-sm text-rose-600 text-center">{loadError}</p>}
      {nextCursor && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchPipeline(nextCursor)}
            disabled={loadingMore}
            className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-60"
          >
            {loadingMore ? "載入中..." : "載入更多商機"}
          </button>
        </div>
      )}

      {/* Create Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">建立新商機 (New Deal)</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  商機名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：宏威科技 - CRM 系統擴充採購案"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">預估金額 (TWD)</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">初始階段</label>
                  <select
                    value={stageId}
                    onChange={(e) => setStageId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    {stages.map((st: any) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">關聯企業客戶</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="">選擇企業 (可選)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">主要聯絡人</label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="">選擇聯絡人 (可選)</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.title || "聯絡人"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">預計結案日期</label>
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">商機備註 / 需求說明</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="輸入客戶預算、重要決策里程碑或跟進事項..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm"
                >
                  {submitting ? "建立中..." : "確認建立"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
