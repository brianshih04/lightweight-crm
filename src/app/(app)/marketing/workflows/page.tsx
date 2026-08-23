"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Workflow, Plus, Zap, ShieldCheck } from "lucide-react";
import { apiErrorMessage, apiFetch, fetchApiResponse } from "@/lib/api-client";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  inputClassName,
  LoadMoreButton,
  Modal,
  PageHeader,
  PageLoader,
  useToast,
} from "@/components/ui";

export default function WorkflowsPage() {
  const toast = useToast();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("NEW_LEAD");
  const [submitting, setSubmitting] = useState(false);

  const fetchWorkflows = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setLoadError("");
    try {
      const response = await fetchApiResponse(
        `/api/marketing/workflows?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
      );
      const result = await response.json();
      setNextCursor(response.headers.get("X-Next-Cursor"));
      setWorkflows((current) =>
        cursor ? [...current, ...(Array.isArray(result) ? result : [])] : Array.isArray(result) ? result : []
      );
    } catch (error) {
      console.error(error);
      setLoadError(apiErrorMessage(error));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const toggleWorkflow = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      await apiFetch("/api/marketing/workflows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      toast.success(currentStatus ? "已暫停自動化流程" : "已啟用自動化流程");
      fetchWorkflows();
    } catch (err) {
      console.error(err);
      toast.error(apiErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setFormError("");
    try {
      await apiFetch("/api/marketing/workflows", {
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
      setShowModal(false);
      setName("");
      setDescription("");
      toast.success(`已建立自動化流程「${name}」`);
      fetchWorkflows();
    } catch (err) {
      console.error(err);
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Workflow}
        title="自動化工作流引擎 (Marketing Workflows)"
        description="設定事件觸發規則、自動派單、發送郵件與跨部門任務指派。"
      >
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          <span>建立自動化流程</span>
        </Button>
      </PageHeader>

      {loadError && !loading && <ErrorBanner message={loadError} onRetry={() => fetchWorkflows()} />}

      {/* Workflows List */}
      {loading ? (
        <PageLoader label="載入自動化流程中..." />
      ) : workflows.length === 0 && !loadError ? (
        <EmptyState
          icon={Workflow}
          title="尚無自動化流程"
          description="建立事件觸發的工作流，例如新線索進單自動發送通知信。"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflows.map((wf) => {
            let actions: any[] = [];
            try {
              actions = typeof wf.actions === "string" ? JSON.parse(wf.actions) : wf.actions;
            } catch {
              actions = [];
            }

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
                    type="button"
                    role="switch"
                    aria-checked={wf.isActive}
                    aria-label={`${wf.isActive ? "暫停" : "啟用"}工作流 ${wf.name}`}
                    disabled={togglingId === wf.id}
                    onClick={() => toggleWorkflow(wf.id, wf.isActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-50 ${
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
                    <span className="font-bold text-indigo-600">觸發事件：</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                      {wf.triggerEvent === "NEW_LEAD"
                        ? "建立新潛在線索 (New Lead)"
                        : wf.triggerEvent === "DEAL_WON"
                          ? "商機贏單成交 (Deal Won)"
                          : wf.triggerEvent === "TICKET_CREATED"
                            ? "新客服工單建立 (Ticket Created)"
                            : wf.triggerEvent}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="font-bold text-emerald-600">執行動作：</span>
                    <div className="flex flex-wrap gap-1.5">
                      {actions.map((act: any, idx: number) => (
                        <span
                          key={idx}
                          className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600"
                        >
                          {act.type === "SEND_EMAIL"
                            ? "發送郵件"
                            : act.type === "CREATE_TASK"
                              ? "建立跟進任務"
                              : act.type === "CREATE_TICKET"
                                ? "建立售後工單"
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

      {nextCursor && !loading && (
        <LoadMoreButton loading={loadingMore} onClick={() => fetchWorkflows(nextCursor!)} label="載入更多流程" />
      )}

      {/* Modal */}
      {showModal && (
        <Modal title="建立自動化工作流程" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4 text-sm">
            {formError && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <Field label="工作流名稱" required>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：新客戶諮詢自動指派"
                className={inputClassName}
              />
            </Field>

            <Field label="觸發事件">
              <select
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                className={inputClassName}
              >
                <option value="NEW_LEAD">新潛在線索建立 (NEW_LEAD)</option>
                <option value="DEAL_WON">商機結案贏單 (DEAL_WON)</option>
                <option value="TICKET_CREATED">新客服工單建立 (TICKET_CREATED)</option>
              </select>
            </Field>

            <Field label="流程描述">
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="說明此自動化流程的目的與執行條件..."
                className={`${inputClassName} resize-none`}
              />
            </Field>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "建立中..." : "確認建立"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
