"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Users, Plus, Mail, Phone, Building2, ChevronRight } from "lucide-react";
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
  SearchInput,
  useToast,
} from "@/components/ui";

export default function ContactsPage() {
  const toast = useToast();
  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [accountId, setAccountId] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchContacts = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAllPages<any>(`/api/contacts?search=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error(err);
      setLoadError(apiErrorMessage(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // SearchInput 已 debounce；此 effect 會在停止輸入後才觸發查詢
  useEffect(() => {
    fetchContacts(search);
  }, [search, fetchContacts]);

  useEffect(() => {
    fetchAllPages<any>("/api/accounts")
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    setFormError("");
    try {
      await apiFetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, title, accountId, tags }),
      });
      setShowModal(false);
      setName("");
      setEmail("");
      setPhone("");
      setTitle("");
      setAccountId("");
      setTags("");
      toast.success(`已建立聯絡人「${name}」`);
      fetchContacts(search);
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
        icon={Users}
        title="聯絡人管理 (Contacts Hub)"
        description="維護客戶關鍵決策者、聯絡資訊與 360 度歷程記錄。"
      >
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          <span>新增聯絡人</span>
        </Button>
      </PageHeader>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="搜尋聯絡人姓名、Email、職稱或標籤..."
          ariaLabel="搜尋聯絡人"
        />
        <div className="text-xs text-slate-500 shrink-0">
          共 <strong className="text-slate-800">{contacts.length}</strong> 位聯絡人
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader label="載入聯絡人資料中..." />
        ) : loadError ? (
          <div className="p-6">
            <ErrorBanner message={loadError} onRetry={() => fetchContacts(search)} />
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title={search ? "尚無符合條件的聯絡人" : "尚無聯絡人資料"}
              description={search ? "請調整搜尋關鍵字後再試。" : "建立聯絡人後，即可檢視 360 度互動歷程。"}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">聯絡人姓名 / 職稱</th>
                  <th className="px-6 py-3.5">所屬企業 (Account)</th>
                  <th className="px-6 py-3.5">聯絡方式</th>
                  <th className="px-6 py-3.5">標籤 (Tags)</th>
                  <th className="px-6 py-3.5">關聯商機 / 工單</th>
                  <th className="px-6 py-3.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <Link href={`/contacts/${contact.id}`} className="group flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-xs">
                          {contact.name.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition">
                            {contact.name}
                          </p>
                          <p className="text-xs text-slate-400">{contact.title || "未設定職稱"}</p>
                        </div>
                      </Link>
                    </td>

                    <td className="px-6 py-4">
                      {contact.account ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {contact.account.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">個人 / 未關聯</span>
                      )}
                    </td>

                    <td className="px-6 py-4 space-y-1">
                      {contact.email && (
                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {contact.email}
                        </p>
                      )}
                      {contact.phone && (
                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {contact.phone}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {contact.tags ? (
                          contact.tags.split(",").map((t: string, i: number) => (
                            <span
                              key={i}
                              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {t.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500 space-x-2">
                        <span>
                          商機: <strong className="text-slate-800">{contact.dealCount || 0}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          工單: <strong className="text-slate-800">{contact.ticketCount || 0}</strong>
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        360視圖 <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      {showModal && (
        <Modal title="新增客戶聯絡人" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4 text-sm">
            {formError && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <Field label="姓名" required>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：林志遠"
                className={inputClassName}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="電子信箱">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={inputClassName}
                />
              </Field>
              <Field label="電話 / 手機">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912-345-678"
                  className={inputClassName}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="職稱">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：資訊長 (CIO)"
                  className={inputClassName}
                />
              </Field>
              <Field label="所屬企業">
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">選擇公司 (可選)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="標籤 (逗號分隔)">
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="例如：VIP, 決策主管, 2026年會"
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
