"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Megaphone,
  Plus,
  Mail,
  CheckCircle2,
  Clock,
} from "lucide-react";
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

export default function CampaignsPage() {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [referenceDataTruncated, setReferenceDataTruncated] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCampaigns = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setLoadError("");
    try {
      const response = await fetchApiResponse(
        `/api/marketing/campaigns?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
      );
      const json = await response.json();
      setNextCursor(response.headers.get("X-Next-Cursor"));
      setReferenceDataTruncated(response.headers.get("X-Reference-Data-Truncated") === "true");
      setData((current: any) =>
        cursor && current
          ? { ...json, campaigns: [...current.campaigns, ...json.campaigns] }
          : json
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
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setFormError("");
    try {
      await apiFetch("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, segmentId, templateId, subject, scheduledAt }),
      });
      setShowModal(false);
      setName("");
      setSegmentId("");
      setTemplateId("");
      setSubject("");
      setScheduledAt("");
      toast.success(`已建立行銷活動「${name}」`);
      fetchCampaigns();
    } catch (err) {
      console.error(err);
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const campaigns = data?.campaigns || [];
  const segments = data?.segments || [];
  const templates = data?.templates || [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Megaphone}
        title="行銷活動中心 (Campaigns)"
        description="建立精準分群行銷推播、動態 EDM 範本並追蹤開信率與點擊率。"
      >
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          <span>建立新活動</span>
        </Button>
      </PageHeader>

      {loadError && <ErrorBanner message={loadError} onRetry={() => fetchCampaigns()} />}

      {/* Campaigns Grid */}
      {loading ? (
        <PageLoader label="載入行銷活動中..." />
      ) : campaigns.length === 0 && !loadError ? (
        <EmptyState
          icon={Megaphone}
          title="尚無行銷活動"
          description="建立第一個受眾分群行銷活動，追蹤發送與開信成效。"
        />
      ) : (
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
      )}

      {referenceDataTruncated && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          分群或郵件範本超過 100 筆；建立活動時僅提供前 100 筆選項，請先縮減或整理參考資料。
        </p>
      )}
      {nextCursor && !loading && (
        <LoadMoreButton loading={loadingMore} onClick={() => fetchCampaigns(nextCursor!)} label="載入更多活動" />
      )}

      {/* Modal */}
      {showModal && (
        <Modal title="建立行銷推播活動" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreateCampaign} className="space-y-4 text-sm">
            {formError && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <Field label="活動名稱" required>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：2026 Q4 年終產品促銷"
                className={inputClassName}
              />
            </Field>

            <Field label="Email 主旨">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="【專屬優惠】搶先體驗新一代解決方案"
                className={inputClassName}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="目標受眾分群">
                <select value={segmentId} onChange={(e) => setSegmentId(e.target.value)} className={inputClassName}>
                  <option value="">選擇受眾</option>
                  {segments.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.contactCount}人)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="套用範本">
                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputClassName}>
                  <option value="">選擇範本</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "建立中..." : "建立活動"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
