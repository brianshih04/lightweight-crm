"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Headset,
  Plus,
  Clock,
  Building2,
  User,
  ChevronRight,
} from "lucide-react";
import { formatDate, formatRelativeTime, PRIORITY_CONFIG, TICKET_STATUS_CONFIG } from "@/lib/utils";
import { apiErrorMessage, apiFetch, fetchAllPages } from "@/lib/api-client";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  inputClassName,
  Modal,
  PageHeader,
  PageLoader,
  useToast,
} from "@/components/ui";

const STATUS_FILTERS = [
  { value: "ALL", label: "全部工單" },
  { value: "OPEN", label: "待處理" },
  { value: "IN_PROGRESS", label: "處理中" },
  { value: "RESOLVED", label: "已解決" },
] as const;

export default function TicketsPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");

  // Form State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [contactId, setContactId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAllPages<any>(`/api/tickets?status=${statusFilter}&priority=${priorityFilter}`);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLoadError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchAllPages<any>("/api/contacts").then(setContacts).catch(console.error);
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;
    setSubmitting(true);
    setFormError("");
    try {
      await apiFetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description, priority, contactId }),
      });
      setShowModal(false);
      setSubject("");
      setDescription("");
      setContactId("");
      toast.success("已建立工單");
      fetchTickets();
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
        icon={Headset}
        title="售後客服工單中心 (Support Tickets)"
        description="集中管理客戶案件請求、即時監控 SLA 時效並支援內部團隊協同。"
      >
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          <span>建立新工單</span>
        </Button>
      </PageHeader>

      {/* Filter Tabs & Selectors */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="狀態篩選">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status.value}
              type="button"
              aria-pressed={statusFilter === status.value}
              onClick={() => setStatusFilter(status.value)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                statusFilter === status.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="priority-filter" className="text-xs text-slate-400">
            優先級：
          </label>
          <select
            id="priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="ALL">全部優先級</option>
            <option value="URGENT">緊急 (Urgent)</option>
            <option value="HIGH">高 (High)</option>
            <option value="MEDIUM">中 (Medium)</option>
            <option value="LOW">低 (Low)</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader label="載入工單中..." />
        ) : loadError ? (
          <div className="p-6">
            <ErrorBanner message={loadError} onRetry={fetchTickets} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Headset}
              title="尚無符合條件的工單"
              description="調整篩選條件，或建立第一張客戶支援工單。"
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((t) => {
              const ticketPriority = PRIORITY_CONFIG[t.priority] || { label: t.priority, badge: "bg-slate-100 text-slate-700" };
              const statusConfig = TICKET_STATUS_CONFIG[t.status] || { label: t.status, badge: "bg-slate-100" };

              return (
                <div
                  key={t.id}
                  className="p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {t.ticketNumber}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${ticketPriority.badge}`}>
                        {ticketPriority.label} 優先級
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${statusConfig.badge}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <Link href={`/support/tickets/${t.id}`} className="block group">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {t.subject}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                    </Link>

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {t.contact?.name || "未知提單者"}
                      </span>
                      {t.account && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {t.account.name}
                        </span>
                      )}
                      <span>建立於：{formatRelativeTime(t.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {t.slaDueAt && t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                      <div className="text-right text-xs">
                        <span className="text-slate-400 block text-[10px]">SLA 到期時限</span>
                        <span className="font-semibold text-amber-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(t.slaDueAt, "HH:mm")}
                        </span>
                      </div>
                    )}
                    <Link
                      href={`/support/tickets/${t.id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1"
                    >
                      <span>開啟處理</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <Modal title="建立客服售後工單" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreateTicket} className="space-y-4 text-sm">
            {formError && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <Field label="工單主旨" required>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="例如：登入授權憑證失效問題"
                className={inputClassName}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="優先級">
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClassName}>
                  <option value="LOW">低 (Low)</option>
                  <option value="MEDIUM">中 (Medium)</option>
                  <option value="HIGH">高 (High)</option>
                  <option value="URGENT">緊急 (Urgent)</option>
                </select>
              </Field>
              <Field label="提單聯絡人">
                <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClassName}>
                  <option value="">選擇客戶 (可選)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.account?.name || "個人"})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="詳細問題描述" required>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述客戶遇到的問題現象、發生頻率或操作步驟..."
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
