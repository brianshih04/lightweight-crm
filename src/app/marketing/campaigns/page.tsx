"use client";

import React, { useEffect, useState } from "react";
import {
  Megaphone,
  Plus,
  Send,
  Mail,
  Users,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function CampaignsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [referenceDataTruncated, setReferenceDataTruncated] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCampaigns = async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/marketing/campaigns?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      if (!response.ok) throw new Error(`Campaigns request failed: ${response.status}`);
      const json = await response.json();
      setNextCursor(response.headers.get("X-Next-Cursor"));
      setReferenceDataTruncated(response.headers.get("X-Reference-Data-Truncated") === "true");
      setData((current: any) => cursor && current
        ? { ...json, campaigns: [...current.campaigns, ...json.campaigns] }
        : json);
    } catch (error) {
      console.error(error);
      setLoadError("無法載入行銷活動，請稍後再試。");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, segmentId, templateId, subject, scheduledAt }),
      });
      if (res.ok) {
        setShowModal(false);
        setName("");
        setSegmentId("");
        setTemplateId("");
        setSubject("");
        setScheduledAt("");
        fetchCampaigns();
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
          載入行銷活動中...
        </div>
      </div>
    );
  }

  const campaigns = data?.campaigns || [];
  const segments = data?.segments || [];
  const templates = data?.templates || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-indigo-600" />
            行銷活動中心 (Campaigns)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            建立精準分群行銷推播、動態 EDM 範本並追蹤開信率與點擊率。
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>建立新活動</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((camp: any) => {
          const openRate = camp.sentCount > 0 ? Math.round((camp.openedCount / camp.sentCount) * 100) : 0;
          const clickRate = camp.sentCount > 0 ? Math.round((camp.clickedCount / camp.sentCount) * 100) : 0;
          return (
            <div
              key={camp.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 hover:border-indigo-200 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email EDM
                    </span>
                    {camp.status === "SENT" ? (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 已發送
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 排程中
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">{camp.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">主旨：{camp.subject || "未設定主旨"}</p>
                </div>
              </div>

              {/* Targeting and Template info */}
              <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">目標受眾分群：</span>
                  <span className="font-semibold text-slate-800">{camp.segment?.name || "全體客戶"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">使用範本：</span>
                  <span className="font-semibold text-slate-800">{camp.template?.name || "預設純文字"}</span>
                </div>
              </div>

              {/* Conversion Stats */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                  <p className="text-[10px] text-slate-400">發送總數</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{camp.sentCount}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                  <p className="text-[10px] text-slate-400">成功送達</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{camp.deliveredCount}</p>
                </div>
                <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                  <p className="text-[10px] text-indigo-600 font-medium">開信率</p>
                  <p className="text-sm font-bold text-indigo-700 mt-0.5">{openRate}%</p>
                </div>
                <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                  <p className="text-[10px] text-emerald-600 font-medium">點擊率</p>
                  <p className="text-sm font-bold text-emerald-700 mt-0.5">{clickRate}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {referenceDataTruncated && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          分群或郵件範本超過 100 筆；建立活動時僅提供前 100 筆選項，請先縮減或整理參考資料。
        </p>
      )}
      {loadError && <p role="alert" className="text-sm text-rose-600 text-center">{loadError}</p>}
      {nextCursor && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchCampaigns(nextCursor)}
            disabled={loadingMore}
            className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-60"
          >
            {loadingMore ? "載入中..." : "載入更多活動"}
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">建立行銷推播活動</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  活動名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：2026 Q4 年終產品促銷"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email 主旨</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="【專屬優惠】搶先體驗新一代解決方案"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">目標受眾分群</label>
                  <select
                    value={segmentId}
                    onChange={(e) => setSegmentId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="">選擇受眾</option>
                    {segments.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contactCount}人)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">套用範本</label>
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="">選擇範本</option>
                    {templates.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                  {submitting ? "建立中..." : "建立活動"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
