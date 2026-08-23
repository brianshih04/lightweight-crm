"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Users,
  Plus,
  Shield,
  Edit2,
  Trash2,
  Award,
  UserCheck,
} from "lucide-react";
import { REGIONS, roleLabel } from "@/lib/utils";
import { apiErrorMessage, apiFetch, fetchAllPages } from "@/lib/api-client";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  inputClassName,
  Modal,
  PageLoader,
  useToast,
} from "@/components/ui";

const ROLE_OPTIONS = [
  { value: "SALES", label: "Sales (負責所屬區域)" },
  { value: "ORDER_ADMIN", label: "訂單管理員 (Sales Assistant)" },
  { value: "SALES_MANAGER", label: "區域主管 (Regional Manager)" },
  { value: "MARKETING_MANAGER", label: "市場部主管 (Marketing Manager)" },
  { value: "GM", label: "總經理 (GM - 全域決策分析)" },
  { value: "ADMIN", label: "系統管理員 (Admin - 系統全管理)" },
  { value: "MARKETING", label: "市場部專員 (Marketing)" },
  { value: "SUPPORT", label: "客服專員 (Customer Support)" },
];

const REGION_OPTIONS = [
  { value: "NORTH", label: "第一市場 (中南美/菲律賓)" },
  { value: "CENTRAL", label: "第二市場 (美歐/俄印/台灣)" },
  { value: "SOUTH", label: "第三市場 (俄羅斯/中東)" },
  { value: "OVERSEAS", label: "總部與其他" },
  { value: "ALL", label: "全區 / 總部 (ALL)" },
];

const MANAGER_ROLES = ["GM", "MARKETING_MANAGER", "SALES_MANAGER", "ADMIN", "SUPPORT"];

export default function UsersManagementPage() {
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filterRegion, setFilterRegion] = useState("ALL");

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SALES");
  const [department, setDepartment] = useState("業務部");
  const [region, setRegion] = useState("NORTH");
  const [title, setTitle] = useState("業務代表");
  const [managerId, setManagerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editManagerId, setEditManagerId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editErrorMsg, setEditErrorMsg] = useState("");

  // Delete confirm state
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchAllPages<any>("/api/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLoadError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiFetch<any>("/api/auth/me")
      .then((d) => {
        if (d.authenticated && d.user) setCurrentUser(d.user);
      })
      .catch((err) => console.error(err));
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          name,
          email,
          role,
          department,
          region,
          title,
          managerId: managerId || null,
        }),
      });
      setShowAddModal(false);
      setUsername("");
      setPassword("");
      setName("");
      setEmail("");
      setTitle("業務代表");
      setManagerId("");
      toast.success(`已建立成員帳號「${name}」`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setErrorMsg(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditRegion(user.region);
    setEditDepartment(user.department);
    setEditTitle(user.title);
    setEditManagerId(user.managerId || "");
    setEditPassword("");
    setEditErrorMsg("");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setEditErrorMsg("");
    try {
      await apiFetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          role: editRole,
          region: editRegion,
          department: editDepartment,
          title: editTitle,
          managerId: editManagerId || null,
          password: editPassword || undefined,
        }),
      });
      setEditingUser(null);
      toast.success(`已更新「${editName}」的資料`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      setEditErrorMsg(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/users/${deletingUser.id}`, { method: "DELETE" });
      toast.success(`已停用並移除「${deletingUser.name}」（軟刪除，歷史紀錄保留）`);
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error(apiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";
  const isGM = currentUser?.role === "GM";
  const isFullManager = isAdmin || isGM;

  const managers = users.filter((u) => MANAGER_ROLES.includes(u.role));
  const filteredUsers = filterRegion === "ALL" ? users : users.filter((u) => u.region === filterRegion);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-red-600 text-white flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> 系統管理員權限
            </span>
            <span className="text-xs text-slate-400">組織人員與責任區域配置</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600" />
            人員帳號與負責區域管理
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin 系統管理者可在此建立成員帳號，配置「總經理／市場部主管／區域主管／Sales」階層與訂單管理員支援角色。
          </p>
        </div>

        {isFullManager && (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            <span>建立新成員帳號</span>
          </Button>
        )}
      </div>

      {/* Territory Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" role="group" aria-label="依區域篩選">
        {Object.entries(REGIONS).map(([key, reg]) => {
          const count = users.filter((u) => (key === "ALL" ? true : u.region === key)).length;
          const active = filterRegion === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilterRegion(key)}
              className={`p-4 rounded-2xl border text-left transition ${
                active
                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                  : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold truncate">{reg.label.split(" ")[0]}</span>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: reg.dot }} />
              </div>
              <p className={`text-2xl font-extrabold mt-2 ${active ? "text-white" : "text-indigo-600"}`}>
                {count} <span className="text-xs font-normal">人</span>
              </p>
            </button>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">組織成員清單</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              共 {filteredUsers.length} 位人員
            </span>
          </div>
        </div>

        {loading ? (
          <PageLoader label="載入人員資料中..." />
        ) : loadError ? (
          <div className="p-6">
            <ErrorBanner message={loadError} onRetry={fetchUsers} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="此區域尚無成員" description="點擊上方區域卡切換篩選，或建立新成員帳號。" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">成員姓名 / 登入帳號</th>
                  <th className="px-6 py-3.5">職稱 / 部門</th>
                  <th className="px-6 py-3.5">角色權限 (Role)</th>
                  <th className="px-6 py-3.5">負責區域 (Territory)</th>
                  <th className="px-6 py-3.5">直屬主管 (Manager)</th>
                  <th className="px-6 py-3.5">負責商機</th>
                  <th className="px-6 py-3.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const regConfig = REGIONS[user.region] || { label: user.region, badge: "bg-slate-100" };
                  const isUserAdmin = user.role === "ADMIN";
                  const isUserGM = user.role === "GM";
                  const isUserMgr = user.role === "SALES_MANAGER";
                  const isUserMarketingMgr = user.role === "MARKETING_MANAGER";

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs text-white ${
                              isUserAdmin
                                ? "bg-rose-600"
                                : isUserGM
                                  ? "bg-amber-600"
                                  : isUserMarketingMgr
                                    ? "bg-emerald-600"
                                    : isUserMgr
                                      ? "bg-indigo-600"
                                      : "bg-slate-600"
                            }`}
                          >
                            {user.name.slice(0, 1)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-400 font-mono">帳號: {user.username}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 text-xs">{user.title}</p>
                        <p className="text-xs text-slate-400">{user.department}</p>
                      </td>

                      <td className="px-6 py-4">
                        {isUserAdmin ? (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                            <Shield className="w-3 h-3 text-rose-600" /> {roleLabel(user.role)}
                          </span>
                        ) : isUserGM ? (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <Award className="w-3 h-3 text-amber-600" /> {roleLabel(user.role)}
                          </span>
                        ) : isUserMarketingMgr ? (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {roleLabel(user.role)}
                          </span>
                        ) : isUserMgr ? (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {roleLabel(user.role)}
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                            {roleLabel(user.role)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${regConfig.badge}`}>
                          {regConfig.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {user.manager ? (
                          <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            {user.manager.name} ({user.manager.title})
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">- 最高主管 -</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {user.assignedDeals?.length || 0} 筆商機
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        {isFullManager && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(user)}
                              aria-label={`編輯 ${user.name}`}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition"
                              title="編輯人員與分配區域"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!isUserAdmin && (
                              <button
                                onClick={() => setDeletingUser(user)}
                                aria-label={`刪除 ${user.name}`}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition"
                                title="刪除帳號"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
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

      {/* Add User Modal */}
      {showAddModal && (
        <Modal title="建立新成員帳號與分配責任區域" onClose={() => setShowAddModal(false)} size="lg">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700" role="alert">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="登入帳號 (Username)" required>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例如：john_sales"
                  className={inputClassName}
                />
              </Field>
              <Field label="預設登入密碼" required>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 12 個字元"
                  className={inputClassName}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="成員姓名" required>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：王小明"
                  className={inputClassName}
                />
              </Field>
              <Field label="電子信箱 (Email)" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@company.com"
                  className={inputClassName}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="角色權限 (Role)">
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClassName}>
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="負責區域 (Territory)">
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={inputClassName}>
                  {REGION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="職稱">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：北部業務專員"
                  className={inputClassName}
                />
              </Field>
              <Field label="直屬主管 (Reports To)">
                <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputClassName}>
                  <option value="">選擇直屬主管 (可選)</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.title})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "建立中..." : "確認建立帳號"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Modal title={`編輯成員「${editingUser.name}」與調整負責區域`} onClose={() => setEditingUser(null)} size="lg">
          {editErrorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700" role="alert">
              {editErrorMsg}
            </div>
          )}

          <form onSubmit={handleUpdateUser} className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="姓名" required>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="負責區域 (Territory)">
                <select value={editRegion} onChange={(e) => setEditRegion(e.target.value)} className={inputClassName}>
                  {REGION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="職稱">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="角色權限">
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className={inputClassName}>
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="部門">
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="直屬主管">
                <select value={editManagerId} onChange={(e) => setEditManagerId(e.target.value)} className={inputClassName}>
                  <option value="">無主管</option>
                  {managers
                    .filter((m) => m.id !== editingUser.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.title})
                      </option>
                    ))}
                </select>
              </Field>
            </div>

            <Field label="重設密碼 (若不修改請留空)">
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="輸入新密碼（至少 12 個字元）"
                className={inputClassName}
              />
            </Field>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
                取消
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "儲存中..." : "儲存修改"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingUser && (
        <ConfirmDialog
          title="刪除成員帳號"
          message={`確定要刪除成員「${deletingUser.name} (${deletingUser.username})」嗎？帳號將立即停用並撤銷所有登入 Session，歷史商機與稽核紀錄會保留。`}
          confirmLabel="確認刪除"
          loading={deleting}
          onConfirm={handleDeleteUser}
          onCancel={() => setDeletingUser(null)}
        />
      )}
    </div>
  );
}
