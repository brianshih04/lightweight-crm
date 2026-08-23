"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Headset,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  ChevronRight,
  X,
  Filter,
} from "lucide-react";
import { formatRelativeTime, PRIORITY_CONFIG, TICKET_STATUS_CONFIG } from "@/lib/utils";
import { fetchAllPages } from "@/lib/api-client";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [contactId, setContactId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = () => {
    setLoading(true);
    fetchAllPages<any>(`/api/tickets?status=${statusFilter}&priority=${priorityFilter}`)
      .then((data) => {
        setTickets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchAllPages<any>("/api/contacts").then(setContacts).catch(console.error);
    fetchAllPages<any>("/api/accounts").then(setAccounts).catch(console.error);
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description, priority, contactId }),
      });
      if (res.ok) {
        setShowModal(false);
        setSubject("");
        setDescription("");
        setContactId("");
        fetchTickets();
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
            <Headset className="w-6 h-6 text-indigo-600" />
            售後客服工單中心 (Support Tickets)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            集中管理客戶案件請求、即時監控 SLA 時效並支援內部團隊協同。
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>建立新工單</span>
        </button>
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((status) => {
            const label =
              status === "ALL"
                ? "全部工單"
                : status === "OPEN"
                ? "待處理"
                : status === "IN_PROGRESS"
                ? "處理中"
                : "已解決";
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  statusFilter === status
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">優先級：</span>
          <select
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
          <div className="py-12 text-center text-sm text-slate-500">載入工單中...</div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">尚無符合條件的工單</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((t) => {
              const priority = PRIORITY_CONFIG[t.priority] || { label: t.priority, badge: "bg-slate-100 text-slate-700" };
              const statusConfig = TICKET_STATUS_CONFIG[t.status] || { label: t.status, badge: "bg-slate-100" };
              const isUrgent = t.priority === "URGENT";

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
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${priority.badge}`}>
                        {priority.label} 優先級
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
                          {new Date(t.slaDueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">建立客服售後工單</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  工單主旨 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="例如：登入授權憑證失效問題"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">優先級</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="LOW">低 (Low)</option>
                    <option value="MEDIUM">中 (Medium)</option>
                    <option value="HIGH">高 (High)</option>
                    <option value="URGENT">緊急 (Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">提單聯絡人</label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="">選擇客戶 (可選)</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.account?.name || "個人"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  詳細問題描述 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述客戶遇到的問題現象、發生頻率或操作步驟..."
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
