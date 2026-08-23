"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Lock,
  MessageSquare,
  CheckCircle2,
  MessagesSquare,
} from "lucide-react";
import { formatRelativeTime, PRIORITY_CONFIG, TICKET_STATUS_CONFIG } from "@/lib/utils";
import { apiErrorMessage, apiFetch } from "@/lib/api-client";
import { Button, EmptyState, ErrorBanner, PageLoader, useToast } from "@/components/ui";

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await apiFetch<any>(`/api/tickets/${id}`);
      setTicket(data);
    } catch (err) {
      console.error(err);
      setLoadError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message, isInternal }),
      });
      setMessage("");
      toast.success(isInternal ? "已儲存內部筆記" : "已送出回覆");
      fetchTicket();
    } catch (err) {
      console.error(err);
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setUpdatingStatus(true);
    try {
      await apiFetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast.success(status === "RESOLVED" ? "已標記為已解決" : "工單已正式結案");
      fetchTicket();
    } catch (err) {
      console.error(err);
      toast.error(apiErrorMessage(err));
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <PageLoader label="載入工單詳情中..." />;
  }

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto py-4">
        <ErrorBanner message={loadError} onRetry={fetchTicket} />
        <div className="mt-4 text-center">
          <Link
            href="/support/tickets"
            className="text-indigo-600 font-semibold text-sm inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> 返回工單列表
          </Link>
        </div>
      </div>
    );
  }

  if (!ticket || ticket.error) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <EmptyState title="找不到該工單資料" description="此工單可能已被刪除，或您沒有檢視權限。">
          <Link
            href="/support/tickets"
            className="text-indigo-600 font-semibold text-sm inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> 返回工單列表
          </Link>
        </EmptyState>
      </div>
    );
  }

  const priority = PRIORITY_CONFIG[ticket.priority] || { label: ticket.priority, badge: "bg-slate-100" };
  const statusConfig = TICKET_STATUS_CONFIG[ticket.status] || { label: ticket.status, badge: "bg-slate-100" };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/support/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> 返回工單收件箱
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  {ticket.ticketNumber}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${priority.badge}`}>
                  {priority.label} 優先級
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${statusConfig.badge}`}>
                  {statusConfig.label}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-2">{ticket.subject}</h1>
            </div>

            {/* Quick Status Actions */}
            <div className="flex items-center gap-2">
              {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus("RESOLVED")}
                  loading={updatingStatus}
                  className="!bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{updatingStatus ? "更新中..." : "標記已解決"}</span>
                </Button>
              )}
              {ticket.status === "RESOLVED" && (
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus("CLOSED")}
                  loading={updatingStatus}
                  className="!bg-slate-700 hover:!bg-slate-800"
                >
                  <span>{updatingStatus ? "更新中..." : "正式結案"}</span>
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
              <span className="text-slate-400 block text-[10px]">提單客戶</span>
              <span className="font-semibold text-slate-800">{ticket.contact?.name || "未知"}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
              <span className="text-slate-400 block text-[10px]">企業公司</span>
              <span className="font-semibold text-slate-800">{ticket.account?.name || "-"}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
              <span className="text-slate-400 block text-[10px]">指派客服</span>
              <span className="font-semibold text-slate-800">{ticket.assignedTo?.name || "待分派"}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
              <span className="text-slate-400 block text-[10px]">建立時間</span>
              <span className="font-semibold text-slate-800">{formatRelativeTime(ticket.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Message Thread */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">對話歷程與內部筆記</h2>

        {(!ticket.messages || ticket.messages.length === 0) ? (
          <EmptyState
            icon={MessagesSquare}
            title="尚無對話記錄"
            description="使用下方輸入框回覆客戶，或新增內部備忘筆記。"
          />
        ) : (
          <div className="space-y-4">
            {ticket.messages.map((msg: any) => {
              const isInternalMsg = msg.isInternal;
              const isAgent = msg.senderType === "AGENT";

              return (
                <div
                  key={msg.id}
                  className={`rounded-2xl p-5 border text-sm transition ${
                    isInternalMsg
                      ? "bg-amber-50/70 border-amber-200 text-amber-950"
                      : isAgent
                        ? "bg-indigo-50/50 border-indigo-100 text-slate-900 ml-6 md:ml-12"
                        : "bg-white border-slate-200 text-slate-900 mr-6 md:mr-12"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-black/5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{msg.senderName}</span>
                      {isInternalMsg && (
                        <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Lock className="w-3 h-3" /> 內部備忘 (僅團隊可見)
                        </span>
                      )}
                      {!isInternalMsg && isAgent && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                          客服專員回覆
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px]">{formatRelativeTime(msg.createdAt)}</span>
                  </div>

                  <div className="pt-3 leading-relaxed whitespace-pre-line text-xs md:text-sm">
                    {msg.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply / Internal Note Input Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        {/* Toggle Mode */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex gap-2" role="group" aria-label="回覆模式">
            <button
              type="button"
              onClick={() => setIsInternal(false)}
              aria-pressed={!isInternal}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                !isInternal
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>公開回覆客戶 (Public Reply)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsInternal(true)}
              aria-pressed={isInternal}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                isInternal
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>內部備忘筆記 (Internal Note)</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            {isInternal ? "此訊息僅內部團隊可見" : "回覆將發送至客戶信箱"}
          </span>
        </div>

        <form onSubmit={handleSendMessage} className="space-y-3">
          <textarea
            rows={4}
            required
            aria-label={isInternal ? "內部備忘內容" : "回覆客戶內容"}
            placeholder={
              isInternal
                ? "輸入供團隊內部協調的處理進度或技術備忘..."
                : "輸入要回覆給客戶的說明與排查進度..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 resize-none ${
              isInternal
                ? "border-amber-200 bg-amber-50/20 focus:ring-amber-500/20"
                : "border-slate-200 focus:ring-indigo-500/20"
            }`}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              className={isInternal ? "!bg-amber-600 hover:!bg-amber-700 shadow-amber-600/20" : undefined}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "傳送中..." : isInternal ? "儲存內部筆記" : "送出回覆給客戶"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
