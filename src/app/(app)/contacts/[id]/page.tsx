"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Headset,
  Send,
  Clock,
  Briefcase,
} from "lucide-react";
import { formatCurrency, formatDate, formatRelativeTime, TICKET_STATUS_CONFIG } from "@/lib/utils";
import { apiErrorMessage, apiFetch, fetchApiResponse } from "@/lib/api-client";
import { Button, EmptyState, ErrorBanner, PageLoader, useToast } from "@/components/ui";

type RelatedType = "deals" | "tickets" | "activities";

async function fetchRelatedPage(id: string, type: RelatedType, cursor?: string) {
  const response = await fetchApiResponse(
    `/api/contacts/${id}/related?type=${type}&limit=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
  );
  return { items: await response.json(), nextCursor: response.headers.get("X-Next-Cursor") };
}

export default function ContactDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();

  const [contact, setContact] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [nextCursors, setNextCursors] = useState<Record<RelatedType, string | null>>({ deals: null, tickets: null, activities: null });
  const [relatedLoading, setRelatedLoading] = useState<RelatedType | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TIMELINE" | "DEALS" | "TICKETS">("TIMELINE");

  // New Note state
  const [noteType, setNoteType] = useState("NOTE");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const fetchContact = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [overview, dealPage, ticketPage, activityPage] = await Promise.all([
        apiFetch<any>(`/api/contacts/${id}`),
        fetchRelatedPage(id, "deals"),
        fetchRelatedPage(id, "tickets"),
        fetchRelatedPage(id, "activities"),
      ]);
      setContact(overview);
      setDeals(dealPage.items);
      setTickets(ticketPage.items);
      setActivities(activityPage.items);
      setNextCursors({
        deals: dealPage.nextCursor,
        tickets: ticketPage.nextCursor,
        activities: activityPage.nextCursor,
      });
    } catch (error) {
      console.error(error);
      setLoadError(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMore = async (type: RelatedType) => {
    const cursor = nextCursors[type];
    if (!cursor) return;
    setRelatedLoading(type);
    try {
      const page = await fetchRelatedPage(id, type, cursor);
      if (type === "deals") setDeals((current) => [...current, ...page.items]);
      else if (type === "tickets") setTickets((current) => [...current, ...page.items]);
      else setActivities((current) => [...current, ...page.items]);
      setNextCursors((current) => ({ ...current, [type]: page.nextCursor }));
    } catch (error) {
      console.error(error);
      toast.error(apiErrorMessage(error));
    } finally {
      setRelatedLoading(null);
    }
  };

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent && !noteTitle) return;
    setAddingNote(true);
    try {
      await apiFetch(`/api/contacts/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: noteType,
          title: noteTitle || (noteType === "CALL" ? "電話溝通記錄" : "會議與跟進記錄"),
          content: noteContent,
        }),
      });
      setNoteTitle("");
      setNoteContent("");
      toast.success("已新增互動紀錄");
      fetchContact();
    } catch (err) {
      console.error(err);
      toast.error(apiErrorMessage(err));
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return <PageLoader label="載入客戶 360 度資訊中..." />;
  }

  if (loadError) {
    return (
      <div className="py-4">
        <ErrorBanner message={loadError} onRetry={fetchContact} />
        <div className="mt-4 text-center">
          <Link href="/contacts" className="text-indigo-600 font-semibold text-sm inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> 返回聯絡人列表
          </Link>
        </div>
      </div>
    );
  }

  if (!contact || contact.error) {
    return (
      <div className="py-8">
        <EmptyState title="找不到該聯絡人資料" description="此聯絡人可能已被刪除，或您沒有檢視權限。">
          <Link href="/contacts" className="text-indigo-600 font-semibold text-sm inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> 返回聯絡人列表
          </Link>
        </EmptyState>
      </div>
    );
  }

  const tabs = [
    { key: "TIMELINE" as const, icon: Clock, label: "全歷程時間軸 (360° Timeline)" },
    { key: "DEALS" as const, icon: Briefcase, label: `關聯商機 (${contact.dealCount || 0})` },
    { key: "TICKETS" as const, icon: Headset, label: `售後工單 (${contact.ticketCount || 0})` },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button & Top Profile Header */}
      <div>
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> 返回聯絡人列表
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
              {contact.name.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-md border border-indigo-100">
                  {contact.title || "職稱未填"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                {contact.account?.name || "未關聯企業"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            {contact.email && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 block text-[10px]">Email</span>
                <span className="font-semibold text-slate-800">{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 block text-[10px]">電話</span>
                <span className="font-semibold text-slate-800">{contact.phone}</span>
              </div>
            )}
            <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-400 block text-[10px]">商機總數</span>
              <span className="font-semibold text-indigo-600">{contact.dealCount || 0} 筆</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="客戶 360 資料分頁" className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 transition flex items-center gap-2 border-b-2 -mb-px ${
                isActive
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === "TIMELINE" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Add Activity / Note Box */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <form onSubmit={handleAddActivity} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700">記錄互動：</span>
                  <div className="flex gap-1.5 text-xs" role="group" aria-label="互動類型">
                    {(["NOTE", "CALL", "MEETING"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={noteType === t}
                        onClick={() => setNoteType(t)}
                        className={`px-2.5 py-1 rounded-md font-medium transition ${
                          noteType === t
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {t === "NOTE" ? "備忘筆記" : t === "CALL" ? "通話" : "會議"}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="標題（例如：Q3 導入預算討論會議）"
                  aria-label="互動標題"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />

                <textarea
                  rows={3}
                  required
                  aria-label="互動內容"
                  placeholder="輸入詳細溝通內容、決策重點或客戶需求..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />

                <div className="flex justify-end">
                  <Button type="submit" size="sm" loading={addingNote}>
                    <Send className="w-3.5 h-3.5" />
                    <span>{addingNote ? "儲存中..." : "新增紀錄"}</span>
                  </Button>
                </div>
              </form>
            </div>

            {/* Timeline Stream */}
            <div className="space-y-3">
              {activities.map((act: any) => (
                <div
                  key={act.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3.5"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">{act.title}</p>
                      <span className="text-[11px] text-slate-400">
                        {formatRelativeTime(act.createdAt)}
                      </span>
                    </div>
                    {act.content && (
                      <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-line">
                        {act.content}
                      </p>
                    )}
                    {act.user && (
                      <span className="text-[10px] text-slate-400 mt-1.5 block">
                        記錄人員：{act.user.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <EmptyState title="尚無互動紀錄" description="使用上方輸入框記錄通話、會議或備忘筆記。" />
              )}
              {nextCursors.activities && (
                <button
                  type="button"
                  onClick={() => loadMore("activities")}
                  disabled={relatedLoading === "activities"}
                  className="w-full py-2 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-60"
                >
                  {relatedLoading === "activities" ? "載入中..." : "載入更多互動紀錄"}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Custom Attributes & Tags */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">標籤與屬性</h3>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags ? (
                  contact.tags.split(",").map((t: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100"
                    >
                      {t.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">無自訂標籤</span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">企業公司資料</h3>
              {contact.account ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">公司名稱</span>
                    <span className="font-semibold text-slate-800">{contact.account.name}</span>
                  </div>
                  {contact.account.industry && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">產業領域</span>
                      <span className="text-slate-700">{contact.account.industry}</span>
                    </div>
                  )}
                  {contact.account.phone && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">公司總機</span>
                      <span className="text-slate-700">{contact.account.phone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">尚未綁定企業客戶</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deals Tab */}
      {activeTab === "DEALS" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {deals.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Briefcase} title="尚無關聯商機" description="在商機看板建立商機時選擇此聯絡人，即會顯示於此。" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">商機名稱</th>
                  <th className="px-6 py-3.5">金額</th>
                  <th className="px-6 py-3.5">目前階段</th>
                  <th className="px-6 py-3.5">預計結案日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.map((deal: any) => (
                  <tr key={deal.id}>
                    <td className="px-6 py-4 font-semibold text-slate-900">{deal.title}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{formatCurrency(deal.value)}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {deal.stage?.name || "未知"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {deal.expectedCloseDate ? formatDate(deal.expectedCloseDate, "yyyy-MM-dd") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {nextCursors.deals && (
            <button
              type="button"
              onClick={() => loadMore("deals")}
              disabled={relatedLoading === "deals"}
              className="w-full py-3 text-xs font-semibold text-indigo-700 border-t border-indigo-100 hover:bg-indigo-50 disabled:opacity-60"
            >
              {relatedLoading === "deals" ? "載入中..." : "載入更多商機"}
            </button>
          )}
        </div>
      )}

      {/* Tickets Tab */}
      {activeTab === "TICKETS" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Headset} title="尚無售後工單記錄" description="建立工單時選擇此聯絡人，即會顯示於此。" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">工單號碼</th>
                  <th className="px-6 py-3.5">主旨</th>
                  <th className="px-6 py-3.5">狀態</th>
                  <th className="px-6 py-3.5">建立時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t: any) => {
                  const statusConfig = TICKET_STATUS_CONFIG[t.status] || { label: t.status, badge: "bg-slate-100" };
                  return (
                    <tr key={t.id}>
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        <Link href={`/support/tickets/${t.id}`}>{t.ticketNumber}</Link>
                      </td>
                      <td className="px-6 py-4 text-slate-900">{t.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded border ${statusConfig.badge}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{formatRelativeTime(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {nextCursors.tickets && (
            <button
              type="button"
              onClick={() => loadMore("tickets")}
              disabled={relatedLoading === "tickets"}
              className="w-full py-3 text-xs font-semibold text-indigo-700 border-t border-indigo-100 hover:bg-indigo-50 disabled:opacity-60"
            >
              {relatedLoading === "tickets" ? "載入中..." : "載入更多工單"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
