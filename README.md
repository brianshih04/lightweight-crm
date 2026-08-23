# NexCRM - 輕量級企業客戶關係管理系統 (Lightweight CRM)

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Cloudflare Tunnel](https://img.shields.io/badge/Cloudflare-Tunnel-F38020?style=flat&logo=cloudflare)](https://www.cloudflare.com/)

一個專為企業自用打造的現代化輕量級 Web CRM 系統。整合**人員與區域管理**、**分區嚴格隔離**、**總經理營運決策報表**、**銷售自動化 (SFA)**、**客戶 360 度統一視圖**、**行銷自動化**與**客戶服務支援**。

> **目前狀態（2026-08-23）**：本機品質門檻、PostgreSQL 16 migration/runtime、96 個角色安全檢查與瀏覽器 E2E 已通過。業務階層為 `GM` → `MARKETING_MANAGER`／`SALES_MANAGER` → `SALES`；`ORDER_ADMIN` 是區域主管下的 Sales Assistant。這代表「可驗證」而非「已完成正式上線」；正式切換、MFA/SSO、外部告警、離機備份與集中式觀測仍在改善計畫中。

---

## 🌐 系統存取與正式網址

* 🔗 **正式對外網址 (Cloudflare SSL)**：**[https://crm.avision-gb10.org](https://crm.avision-gb10.org)**
* 🔑 **登入頁面 (Login)**：**[https://crm.avision-gb10.org/login](https://crm.avision-gb10.org/login)**
* 👥 **人員與負責區域管理**：**[https://crm.avision-gb10.org/settings/users](https://crm.avision-gb10.org/settings/users)**
* 📊 **總經理決策分析報表**：**[https://crm.avision-gb10.org/reports](https://crm.avision-gb10.org/reports)**
* 🐙 **GitHub 程式碼倉庫**：**[https://github.com/brianshih04/lightweight-crm](https://github.com/brianshih04/lightweight-crm)**

---

## 🔐 首次管理員與登入

系統**不提供預設帳號或預設密碼**。當資料庫沒有任何使用者時，`/login` 會顯示一次性的首次啟用表單：第一位完成姓名、Email、帳號及密碼設定的人會成為 `ADMIN`。密碼至少 12 個字元且必須再次確認；建立成功後初始化入口即永久關閉。

請只在受控網路或 Cloudflare Access 保護下進行首次啟用，避免未授權訪客搶先取得 ADMIN。之後由 ADMIN 在 `/settings/users` 建立其他使用者。

---

## 🌟 六大核心功能模組

### 1. 👥 人員帳號與負責區域管理 (`/settings/users`)
* **Admin / GM 管理面板**：建立新成員帳號，設定 Username 與 Password；安全稽核頁仍僅限 Admin。
* **四層業務階層**：總經理、市場部主管、區域主管、Sales；另有訂單管理員（Sales Assistant）、市場部專員與客服支援角色，依權限與區域嚴格隔離。
* **訂單管理員範圍**：`ORDER_ADMIN` 僅限所屬區域，可讀取／建立／更新商機；不可管理使用者、決策報表或安全稽核。
* **即時編輯與重設密碼**：支援彈性調動業務區域與重設登入憑證。

### 2. 📊 總經理全公司營運決策報表 (`/reports`)
* **季度目標達成度追蹤**：對比季度營收目標金額 ($10,000,000) vs 已贏單金額 vs 儲備管線總值。
* **分區營運績效矩陣**：視覺化呈現北中南與海外之商機總額、客戶數與工單健全度。
* **業務團隊業績排行榜**：即時統計與排行全體業務個人的贏單貢獻。
* **列印與匯出支援**：支援一鍵生成乾淨的列印/PDF 報表視圖。

### 3. 💼 銷售管理 (Sales Force Automation - SFA)
* **視覺化商機看板 (Kanban Pipeline)**：拖曳切換商機階段，自動重算成交機率與管線金額。
* **潛在線索 (Leads)**：評估意向分數 (Lead Scoring)，支援一鍵轉換為正式客戶與商機。

### 4. 👥 客戶 360 度統一視圖 (Customer Hub)
* **企業客戶 (Accounts) 與 聯絡人 (Contacts)**：完整記錄組織資料與自訂 JSON 擴充欄位。
* **跨部門統一活動時間軸 (Timeline)**：整合通話、拜訪筆記、商機進展、客服工單與行銷歷程；商機、工單、活動各自採 25 筆 cursor 分頁與明確載入更多。

### 5. 📣 行銷自動化 (Marketing Automation)
* **受眾動態分群 (Audience Segmentation)**：依屬性與行為標籤精準過濾目標受眾。
* **EDM 行銷活動與變數置換**：支援範本變數（`{{contact.name}}`），追蹤發送數與開信率。
* **事件觸發型自動化工作流程**：例如新線索進單自動發信或建立待辦任務。

### 6. 🎧 客戶服務與售後支援 (Customer Support)
* **集中式工單收件箱 (Ticket Inbox)**：多維度狀態與優先級篩選。
* **SLA 時效預警**：即時計算逾期倒數，避免延誤重要客戶服務。
* **雙軌回覆模式**：公開回覆客戶 vs 內部團隊備忘 (Internal Note)。

---

## 🛠️ 技術架構

* **前端框架**：Next.js 16 (App Router) + React 19
* **樣式設計**：Tailwind CSS + Lucide React
* **圖表視覺化**：Recharts
* **拖曳互動**：@dnd-kit (Kanban Board)
* **ORM & 資料庫**：Prisma ORM + SQLite（本地快速開發）/ PostgreSQL 16（generated schema、native enums、baseline migration 與真實整合測試）
* **身分驗證**：資料庫可撤銷 opaque Session；Cookie 僅保存 256-bit 隨機 token，資料庫只保存 SHA-256 token hash
* **登入防護**：持久化帳號/IP 節流、同源 Origin 驗證、Secure/HttpOnly/SameSite Cookie
* **安全稽核**：全域 request ID、安全標頭與持久化 AuditEvent；僅 ADMIN 可在 `/settings/audit` 查看狀態卡、告警、高頻來源、篩選與 cursor 分頁，底層 `/api/audit/summary` 提供 15 分鐘／24 小時聚合與 WARNING/CRITICAL 訊號
* **API 合約**：Zod request validation 與 response DTO allowlist、64 KiB JSON body cap、統一 error/code/requestId；Account、Contact、Lead、Ticket、User、Deal、Campaign、Workflow 採最大 100 筆的 cursor pagination
* **資料一致性**：核心多步驟流程、AuditEvent 與可選 `Idempotency-Key` 回應快照同 transaction；工單使用年度原子 TicketSequence；本機 SQLite 寫入以 FIFO 序列化，PostgreSQL 保持資料庫原生並行
* **列表資料最小化**：Account/Contact 卡片只回傳 DB 聚合的關聯計數與商機總額，不在每一列展開完整 contacts/deals/tickets payload
* **查詢索引**：region、assignee、status、時間排序及關聯外鍵均有對應索引；同一 Pipeline 的 Stage order 具唯一約束
* **人員生命週期**：刪除人員採 soft delete，立即撤銷 Session 並排除登入／指派，同時保留商機、活動與稽核歷史
* **組織階層安全**：主管變更只沿祖先鏈逐層檢查，最多 50 層並阻擋自我／循環／過深階層
* **金額精度**：Deal 金額以 Prisma Decimal 儲存與彙總，JSON DTO 邊界轉為安全範圍 number 以維持前端相容
* **Readiness**：`GET /api/health` 執行最小 DB 查詢；就緒回 `200`，資料庫不可用回 `503 SERVICE_NOT_READY`

建立型 mutation 可帶 `Idempotency-Key`（1–128 個可見 ASCII 字元）。同一使用者、HTTP method、path、key 與相同 payload 在 24 小時內會回放原始 status/body，並附上 `Idempotency-Replayed: true`；同 key 搭配不同 payload 回 `409 IDEMPOTENCY_CONFLICT`。資料庫只保存 key 的 SHA-256，不保存原始值。

瀏覽器回歸測試使用 Playwright + 隔離 SQLite DB，執行 `npm run test:e2e` 可驗證首次 ADMIN 密碼必填／確認、一次性 bootstrap、Secure session 與後續登入；測試 DB 與 screenshot/trace/video 產物均位於 Git ignore 範圍。

PostgreSQL 指令與正式 cutover/rollback/restore 流程請參考 [PostgreSQL schema 說明](prisma/postgresql/README.md)、[資料切換手冊](docs/postgresql-cutover.md) 與 [immutable container 部署手冊](docs/container-deployment.md)；告警門檻與事件處理流程見 [security monitoring runbook](docs/security-monitoring.md)。PostgreSQL schema 不手動編輯，必須由 `npm run db:pg:schema` 生成並以 `npm run db:pg:check` 驗證同步。

接手開發請先閱讀 [AI Agent 交接手冊](handoff.md) 與 [嚴格改善計畫](improve_plan.md)；前者列出可直接執行的驗證清單，後者區分已完成項、歷史審查基線與正式上線阻斷項。
* **外網通道**：Cloudflare Tunnel (`crm-gb10` -> `https://crm.avision-gb10.org`)

---

## 🚀 快速開始 (Quick Start)

需求：Node.js 22.5 以上（安全整合測試使用內建 `node:sqlite`）。

### 1. 安裝相依套件
```bash
npm install
```

### 2. 資料庫結構初始化
```bash
npx prisma db push
```

### 3. 啟動開發或生產伺服器
```bash
# 開發模式
npm run dev

# 或 生產模式
npm run build
npm run start
```

開啟瀏覽器造訪 `http://localhost:3000/login` 或受 Cloudflare Access 保護的正式 `/login`，依畫面設定首位 ADMIN 與密碼。

如需在隔離的 demo DB 建立人員組織結構（角色、區域、主管階層）與標準銷售管線，可於啟動前自行提供 demo 密碼；seed 不會建立任何示範業務資料（客戶、商機、工單等）：

```powershell
$env:DEMO_SEED_PASSWORD = Read-Host "Demo password" -MaskInput
npm run db:seed
```

既有資料庫若含示範業務資料，可用下列指令清除，僅保留人員結構、銷售管線、Session 與稽核記錄：

```powershell
npm run db:clear-business-data -- --confirm
```

---

## 📂 專案檔案結構

```
CRM/
├── prisma/
│   ├── schema.prisma          # 資料庫模型結構 (User, Deal, Contact, Ticket 等)
│   └── seed.ts                # 組織階層、帳號密碼與分區測試種子資料
├── src/
│   ├── app/
│   │   ├── accounts/          # 企業客戶列表
│   │   ├── contacts/          # 聯絡人管理與 360 時間軸
│   │   ├── dashboard/         # 總覽儀表板
│   │   ├── login/             # 登入與一次性首次 ADMIN 設定頁面
│   │   ├── marketing/         # 行銷活動與自動化工作流程
│   │   ├── reports/           # 總經理營運決策分析報表
│   │   ├── sales/             # 商機看板 (Kanban) 與線索管理 (Leads)
│   │   ├── settings/users/    # Admin 人員帳號與負責區域管理
│   │   ├── support/           # 客服工單收件箱與詳情
│   │   └── api/               # RESTful API 路由 (含 RBAC 分區資料過濾)
│   ├── components/
│   │   ├── layout/            # Sidebar 側邊欄與 Header 頂部導航
│   │   └── sales/             # Kanban 看板與卡片元件
│   └── lib/
│       ├── auth.ts            # opaque Session 與分區資料過濾引擎
│       ├── authorization.ts   # default-deny 權限矩陣入口
│       ├── csrf.ts            # mutation 同源驗證
│       ├── login-throttle.ts  # DB-backed 登入節流
│       ├── audit.ts           # 安全事件、request ID 與 keyed IP pseudonym
│       ├── contracts.ts       # 共用 Zod request/query contracts
│       ├── api-response.ts    # JSON parser、error envelope 與 cursor response
│       ├── prisma.ts          # Prisma Client 單例實例
│       └── utils.ts           # 區域定義、顏色與通用工具函式
├── development_plan.md        # 系統開發規劃與架構設計書
├── userguide.md               # 完整使用者操作手冊
└── README.md                  # 專案總覽說明文件
```

---

## 📚 延伸文件

* 📖 **[使用者操作手冊 (userguide.md)](userguide.md)**：詳細各模組操作指南、截圖說明與常見問題 FAQ。
* 📐 **[系統開發規劃書 (development_plan.md)](development_plan.md)**：完整需求分析、系統架構、Prisma 資料模型、API 規範與未來 Roadmap。

---
*NexCRM · 2026*
