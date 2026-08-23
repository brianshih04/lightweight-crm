"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Shield,
  MapPin,
  Building2,
  KeyRound,
  Edit2,
  Trash2,
  Award,
  CheckCircle2,
  X,
  Lock,
  UserCheck,
} from "lucide-react";
import { REGIONS } from "@/lib/utils";
import { fetchAllPages } from "@/lib/api-client";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const fetchUsers = () => {
    setLoading(true);
    fetchAllPages<any>("/api/users")
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setCurrentUser(d.user);
        }
      });
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/users", {
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

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "建立人員失敗");
        setSubmitting(false);
        return;
      }

      setShowAddModal(false);
      setUsername("");
      setPassword("");
      setName("");
      setEmail("");
      setTitle("業務代表");
      setManagerId("");
      fetchUsers();
    } catch (err) {
      console.error(err);
      setErrorMsg("伺服器連線異常");
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
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
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

      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`確定要刪除成員「${user.name} (${user.username})」嗎？`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.error || "刪除失敗");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";
  const isGM = currentUser?.role === "GM";
  const isFullManager = isAdmin || isGM;

  const managers = users.filter((u) => ["GM", "MARKETING_MANAGER", "SALES_MANAGER", "ADMIN"].includes(u.role));
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
            人員帳號與負責區域管理 (Personnel & Territory Management)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin 系統管理者可在此建立成員帳號，配置「總經理／市場部主管／區域主管／Sales」階層與訂單管理員支援角色。
          </p>
        </div>

        {isFullManager && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>建立新成員帳號</span>
          </button>
        )}
      </div>

      {/* Territory Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(REGIONS).map(([key, reg]) => {
          const count = users.filter((u) => (key === "ALL" ? true : u.region === key)).length;
          return (
            <button
              key={key}
              onClick={() => setFilterRegion(key)}
              className={`p-4 rounded-2xl border text-left transition ${
                filterRegion === key
                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                  : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold truncate">{reg.label.split(" ")[0]}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: reg.dot }}
                />
              </div>
              <p className={`text-2xl font-extrabold mt-2 ${filterRegion === key ? "text-white" : "text-indigo-600"}`}>
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
          <div className="py-16 text-center text-sm text-slate-500">載入人員資料中...</div>
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
                            <Shield className="w-3 h-3 text-rose-600" /> 系統管理員 (Admin)
                          </span>
                        ) : isUserGM ? (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <Award className="w-3 h-3 text-amber-600" /> 總經理 (GM)
                          </span>
                        ) : isUserMarketingMgr ? (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            市場部主管 (Marketing Manager)
                          </span>
                        ) : isUserMgr ? (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            區域主管 (Regional Manager)
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                            {user.role === "SALES" ? "Sales" : user.role === "ORDER_ADMIN" ? "訂單管理員 (Sales Assistant)" : user.role === "MARKETING" ? "市場部專員" : "客服專員"}
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
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition"
                              title="編輯人員與分配區域"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {!isUserAdmin && (
                              <button
                                onClick={() => handleDeleteUser(user)}
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                建立新成員帳號與分配責任區域
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    登入帳號 (Username) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="例如：john_sales"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    預設登入密碼 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="設定登入密碼"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    成員姓名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：王小明"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    電子信箱 (Email) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">角色權限 (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="SALES">Sales (負責所屬區域)</option>
                    <option value="ORDER_ADMIN">訂單管理員 (Sales Assistant)</option>
                    <option value="SALES_MANAGER">區域主管 (Regional Manager)</option>
                    <option value="MARKETING_MANAGER">市場部主管 (Marketing Manager)</option>
                    <option value="GM">總經理 (GM - 全域決策分析)</option>
                    <option value="ADMIN">系統管理員 (Admin - 系統全管理)</option>
                    <option value="MARKETING">市場部專員 (Marketing)</option>
                    <option value="SUPPORT">客服專員 (Customer Support)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">負責區域 (Territory)</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="NORTH">北部區域 (台北/新竹)</option>
                    <option value="CENTRAL">中部區域 (台中/彰化)</option>
                    <option value="SOUTH">南部區域 (高雄/台南)</option>
                    <option value="OVERSEAS">海外亞太區</option>
                    <option value="ALL">全區 / 總部 (ALL)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">職稱</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：北部業務專員"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">直屬主管 (Reports To)</label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    <option value="">選擇直屬主管 (可選)</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-xl text-xs"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  {submitting ? "建立中..." : "確認建立帳號"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                編輯成員「{editingUser.name}」與調整負責區域
              </h2>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">姓名</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">負責區域 (Territory)</label>
                  <select
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="NORTH">北部區域 (台北/新竹)</option>
                    <option value="CENTRAL">中部區域 (台中/彰化)</option>
                    <option value="SOUTH">南部區域 (高雄/台南)</option>
                    <option value="OVERSEAS">海外亞太區</option>
                    <option value="ALL">全區 (ALL)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">職稱</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">角色權限</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="SALES">Sales</option>
                    <option value="ORDER_ADMIN">訂單管理員 (Sales Assistant)</option>
                    <option value="SALES_MANAGER">區域主管 (Regional Manager)</option>
                    <option value="MARKETING_MANAGER">市場部主管 (Marketing Manager)</option>
                    <option value="GM">總經理 (GM)</option>
                    <option value="ADMIN">系統管理員 (Admin)</option>
                    <option value="MARKETING">市場部專員</option>
                    <option value="SUPPORT">客服專員</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">直屬主管</label>
                  <select
                    value={editManagerId}
                    onChange={(e) => setEditManagerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="">無主管</option>
                    {managers
                      .filter((m) => m.id !== editingUser.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.title})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">重設密碼 (若不修改請留空)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="輸入新密碼"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-xl text-xs"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  {submitting ? "儲存中..." : "儲存修改"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
