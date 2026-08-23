"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Plus,
  Sparkles,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
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

export default function LeadsPage() {
  const toast = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [convertingLead, setConvertingLead] = useState<any>(null);
  const [addFormError, setAddFormError] = useState("");
  const [convertFormError, setConvertFormError] = useState("");

  // Add Lead Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("Website");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Convert Form
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("300000");
  const [converting, setConverting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAllPages<any>("/api/leads");
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLoadError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setAddFormError("");
    try {
      await apiFetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, company, source, notes }),
      });
      setShowAddModal(false);
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setNotes("");
      toast.success(`已建立線索「${name}」`);
      fetchLeads();
    } catch (err) {
      console.error(err);
      setAddFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;
    setConverting(true);
    setConvertFormError("");
    try {
      await apiFetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONVERT",
          leadId: convertingLead.id,
          dealTitle,
          dealValue,
        }),
      });
      const leadName = convertingLead.name;
      setConvertingLead(null);
      toast.success(`已將「${leadName}」轉換為聯絡人與商機`);
      fetchLeads();
    } catch (err) {
      console.error(err);
      setConvertFormError(apiErrorMessage(err));
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserPlus}
        title="潛在客戶線索 (Leads Management)"
        description="收集跨渠道線索、意向度評分（Scoring）並支援一鍵轉換為正式商機與聯絡人。"
      >
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          <span>建立新線索</span>
        </Button>
      </PageHeader>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader label="載入線索中..." />
        ) : loadError ? (
          <div className="p-6">
            <ErrorBanner message={loadError} onRetry={fetchLeads} />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={UserPlus}
              title="目前尚無潛在線索"
              description="建立線索後，可依意向度評分排序並一鍵轉換為正式客戶與商機。"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">線索姓名 / 公司</th>
                  <th className="px-6 py-3.5">來源渠道</th>
                  <th className="px-6 py-3.5">意向度評分</th>
                  <th className="px-6 py-3.5">狀態</th>
                  <th className="px-6 py-3.5">聯絡方式</th>
                  <th className="px-6 py-3.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => {
                  const isConverted = lead.status === "CONVERTED";
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{lead.name}</p>
                        <p className="text-xs text-slate-500">{lead.company || "未填公司"}</p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium border border-slate-200">
                          {lead.source}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              lead.score >= 80
                                ? "bg-emerald-100 text-emerald-800"
                                : lead.score >= 50
                                  ? "bg-indigo-100 text-indigo-800"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {lead.score} 分
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isConverted ? (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> 已轉換商機
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                            {lead.status}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 space-y-1 text-xs text-slate-600">
                        {lead.email && <div className="truncate">{lead.email}</div>}
                        {lead.phone && <div>{lead.phone}</div>}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {!isConverted ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="!bg-indigo-50 !border-indigo-200 !text-indigo-700 hover:!bg-indigo-100"
                            onClick={() => {
                              setConvertingLead(lead);
                              setConvertFormError("");
                              setDealTitle(`${lead.company || lead.name} - 新業務機會`);
                            }}
                          >
                            <span>轉換為商機</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">完成轉換</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Convert Modal */}
      {convertingLead && (
        <Modal title="一鍵轉換為正式客戶與商機" onClose={() => setConvertingLead(null)} size="md">
          <form onSubmit={handleConvertLead} className="space-y-4 text-sm">
            {convertFormError && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {convertFormError}
              </p>
            )}

            <p className="text-xs text-slate-500 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-px" />
              <span>
                即將為線索 <strong className="text-slate-800">{convertingLead.name}</strong> 自動建立正式聯絡人檔案、公司檔案並生成首筆商機卡片至銷售看板。
              </span>
            </p>

            <Field label="商機名稱" required>
              <input
                type="text"
                required
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="預估成交金額 (TWD)">
              <input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                className={inputClassName}
              />
            </Field>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setConvertingLead(null)}>
                取消
              </Button>
              <Button type="submit" loading={converting}>
                {converting ? "轉換中..." : "立即轉換"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <Modal title="建立潛在客戶線索 (Lead)" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleCreateLead} className="space-y-4 text-sm">
            {addFormError && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {addFormError}
              </p>
            )}

            <Field label="姓名" required>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：周威宇"
                className={inputClassName}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="所屬公司">
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="智流物聯網科技"
                  className={inputClassName}
                />
              </Field>
              <Field label="來源渠道">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className={inputClassName}
                >
                  <option value="Website">官網表單 (Website)</option>
                  <option value="Ads">數位廣告 (Ads)</option>
                  <option value="Event">展覽年會 (Event)</option>
                  <option value="Referral">客戶轉介紹 (Referral)</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="電話">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClassName}
                />
              </Field>
            </div>

            <Field label="需求紀要">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="客戶諮詢項目與意向..."
                className={`${inputClassName} resize-none`}
              />
            </Field>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
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
