"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Building2, Plus, Globe, Phone, MapPin, Users, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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

export default function AccountsPage() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAllPages<any>("/api/accounts");
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLoadError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const resetForm = () => {
    setName("");
    setIndustry("");
    setWebsite("");
    setPhone("");
    setAddress("");
    setFormError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setFormError("");
    try {
      await apiFetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, industry, website, phone, address }),
      });
      setShowModal(false);
      resetForm();
      toast.success(`已建立企業客戶「${name}」`);
      fetchAccounts();
    } catch (err) {
      console.error(err);
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Building2} title="企業客戶 (Enterprise Accounts)" description="維護企業客戶組織結構、關聯商機與多位聯絡人。">
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          <span>新增企業客戶</span>
        </Button>
      </PageHeader>

      {/* Accounts Grid */}
      {loading ? (
        <PageLoader label="載入企業客戶清單中..." />
      ) : loadError ? (
        <ErrorBanner message={loadError} onRetry={fetchAccounts} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="尚無企業客戶資料"
          description="建立第一筆企業客戶後，即可關聯聯絡人與銷售商機。"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            return (
              <div
                key={acc.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-indigo-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{acc.name}</h3>
                    <span className="inline-block text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded mt-1 border border-indigo-100">
                      {acc.industry || "未分類產業"}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  {acc.website && (
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={acc.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">
                        {acc.website}
                      </a>
                    </div>
                  )}
                  {acc.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{acc.phone}</span>
                    </div>
                  )}
                  {acc.address && (
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{acc.address}</span>
                    </div>
                  )}
                </div>

                {/* Aggregated stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block">聯絡人數</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" /> {acc.contactCount || 0} 位
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block">商機規模</span>
                    <span className="font-bold text-indigo-600 flex items-center gap-1 mt-0.5">
                      <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> {formatCurrency(acc.totalDealValue || 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title="新增企業公司 (Account)" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4 text-sm">
            {formError && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <Field label="公司名稱" required>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：宏威智能科技股份有限公司"
                className={inputClassName}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="產業類別">
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="例如：資訊軟體 / AI"
                  className={inputClassName}
                />
              </Field>
              <Field label="總機電話">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="02-2718-8888"
                  className={inputClassName}
                />
              </Field>
            </div>

            <Field label="官方網站">
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.example.com"
                className={inputClassName}
              />
            </Field>

            <Field label="公司地址">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="台北市內湖區瑞光路..."
                className={inputClassName}
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
