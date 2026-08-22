"use client";

import React, { useEffect, useState } from "react";
import {
  Workflow,
  Plus,
  Zap,
  CheckCircle2,
  ArrowRight,
  Play,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("NEW_LEAD");
  const [submitting, setSubmitting] = useState(false);

  const fetchWorkflows = () => {
    setLoading(true);
    fetch("/api/marketing/workflows")
      .then((res) => res.json())
      .then((data) => {
        setWorkflows(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const toggleWorkflow = async (id: string, currentStatus: boolean) => {
    try {
      await fetch("/api/marketing/workflows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      fetchWorkflows();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketing/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          triggerEvent,
          conditions: { default: true },
          actions: [{ type: "SEND_EMAIL", note: "發送自動化通知信" }],
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setName("");
        setDescription("");
        fetchWorkflows();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Workflow className="w-6 h-6 text-indigo-600" />
            自動化工作流引擎 (Marketing Workflows)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            設定事件觸發規則、自動派單、發送郵件與跨部門任務指派。
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>建立自動化流程</span>
        </button>
      </div>

      {/* Workflows List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">載入自動化流程中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflows.map((wf) => {
            let actions = [];
            try {
              actions = typeof wf.actions === "string" ? JSON.parse(wf.actions) : wf.actions;
            } catch (e) {}

            return (
              <div
                key={wf.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-indigo-200 hover:shadow-md transition"
              >
                {/* Header & Toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        wf.isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{wf.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{wf.description || "未提供詳細說明"}</p>
                    </div>
                  </div>

                  {/* Switch */}
                  <button
                    onClick={() => toggleWorkflow(wf.id, wf.isActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      wf.isActive ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        wf.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Trigger -> Action Flow Diagram */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="font-bold text-indigo-600">⚡ 觸發事件：</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                      {wf.triggerEvent === "NEW_LEAD"
                        ? "建立新潛在線索 (New Lead)"
                        : wf.triggerEvent === "DEAL_WON"
                        ? "商機贏單成交 (Deal Won)"
                        : wf.triggerEvent}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="font-bold text-emerald-600">🎯 執行動作：</span>
                    <div className="flex flex-wrap gap-1.5">
                      {actions.map((act: any, idx: number) => (
                        <span
                          key={idx}
                          className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600"
                        >
                          {act.type === "SEND_EMAIL"
                            ? "✉️ 發送郵件"
                            : act.type === "CREATE_TASK"
                            ? "📋 建立跟進任務"
                            : act.type === "CREATE_TICKET"
                            ? "🎧 建立售後工單"
                            : act.type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Stats */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <span>累計觸發執行：{wf.executionCount} 次</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 運作狀態良好
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">建立自動化工作流程</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  工作流名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：新客戶諮詢自動指派"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">觸發事件</label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-white"
                >
                  <option value="NEW_LEAD">新潛在線索建立 (NEW_LEAD)</option>
                  <option value="DEAL_WON">商機結案贏單 (DEAL_WON)</option>
                  <option value="TICKET_CREATED">新客服工單建立 (TICKET_CREATED)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">流程描述</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="說明此自動化流程的目的與執行條件..."
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
