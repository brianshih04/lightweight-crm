# NexCRM - AI Agent 交接手冊 (Agent Handoff Document)

> 💡 **致接手本專案的 AI Coding Agent**：  
> 本文件旨在協助你快速掌握 **NexCRM** 的完整系統架構、程式碼組織、權限過濾規則、執行環境注意事項與未來的擴充方向。請在進行任何程式碼異動前仔細閱讀本文件。

---

## 📌 1. 專案核心背景與系統定位

* **專案名稱**：NexCRM (輕量級企業客戶關係管理系統)
* **架構定位**：單一企業自用，無多租戶負擔，兼具**多區域管理**、**多人獨立帳號密碼**、**階層式權限隔離**與**總經理營運決策分析**。
* **技術棧**：
  * **前端**：Next.js 14.2 (App Router) + React 18 + Tailwind CSS + Lucide Icons + Recharts
  * **拖曳元件**：@dnd-kit (Kanban 商機看板)
  * **後端**：Next.js Route Handlers (RESTful APIs)
  * **資料庫 & ORM**：Prisma ORM 5.22 + SQLite (本地 `prisma/dev.db`) / 支援 PostgreSQL
  * **認證機制**：Cookie-based Session (`crm_auth_session` cookie + `src/lib/auth.ts`)
  * **外部網路**：Cloudflare Tunnel (`cloudflared` 綁定 `crm.avision-gb10.org`)
* **主要程式庫**：`https://github.com/brianshih04/lightweight-crm`

---

## 🌐 2. 系統正式存取端點與設定

| 項目 | 網址 / 位置 | 說明 |
| :--- | :--- | :--- |
| **正式外網 (Cloudflare SSL)** | `https://crm.avision-gb10.org` | 由背景 `cloudflared` tunnel 代理轉發至本地 3000 port |
| **登入頁面 (Login)** | `https://crm.avision-gb10.org/login` | 支援手動帳密登入與一鍵身分切換面板 |
| **本地開發網址** | `http://localhost:3000` | Next.js 本地監聽端點 |
| **人員與區域管理 (Admin)** | `https://crm.avision-gb10.org/settings/users` | 僅 Admin / GM 可存取 |
| **總經理決策報表 (GM)** | `https://crm.avision-gb10.org/reports` | 僅 GM / Admin / 業務主管可存取 |
| **Cloudflare 設定檔** | `C:\Users\Brian\.cloudflared\config-crm.yml` | Tunnel UUID: `e069e611-2795-4929-9d40-486db6c1784c` |

---

## 🔐 3. 帳號矩陣與角色職責 (Account Matrix)

請特別注意 **「系統管理者 (Admin)」** 與 **「總經理 (GM)」** 為**兩個不同的獨立帳號**：

```
+--------------------------------------------------------------------------------------------------------------------+
| 角色類別         | 帳號 (Username) | 密碼 (Password) | 姓名           | 責任區域   | 核心職責與權限範圍                    |
+--------------------------------------------------------------------------------------------------------------------+
| 🛠️ 系統管理員   | admin           | Avi22099759     | 系統管理員     | 全區 (ALL) | 負責人員帳號建立、責任區域分配與系統維護 |
| 👑 總經理 (GM)   | peter_gm        | peter123        | 柯博文 (Peter) | 全區 (ALL) | 業務全域穿透視角、決策報表與業績排行   |
| 🏢 北部業務主管 | alice_mgr       | alice123        | 張雅婷 (Alice) | 北部 NORTH | 管轄北部全區商機，可看下屬 Kevin 業績  |
| 💼 北部業務代表 | kevin_sales     | kevin123        | 林凱文 (Kevin) | 北部 NORTH | 僅限查看北部個人負責之商機與客戶      |
| 💼 中部業務代表 | bob_sales       | bob123          | 李宗翰 (Bob)   | 中部CENTRAL| 僅限查看中部個人負責之商機與客戶      |
| 💼 南部業務代表 | charlie_sales   | charlie123      | 趙冠宇(Charlie)| 南部 SOUTH | 僅限查看南部個人負責之商機與客戶      |
| 💼 海外商務總監 | sophia_sales    | sophia123       | 孫佩華(Sophia) | 海外OVERSEAS 僅限查看海外個人負責之商機與客戶      |
| 📣 行銷企劃主管 | carol_mkt       | carol123        | 陳品妤 (Carol) | 全區 (ALL) | 受眾動態分群、EDM 活動與工作流程引擎  |
| 🎧 客服支援組長 | david_support   | david123        | 王建宏 (David) | 全區 (ALL) | 工單收件箱、SLA 時效監控與雙軌回覆    |
+--------------------------------------------------------------------------------------------------------------------+
```

---

## 🧱 4. 關鍵程式碼架構與模組劃分

### 4.1 認證與分區資料過濾引擎 (`src/lib/auth.ts`)
所有 API 進行資料查詢時，**必須**使用 `src/lib/auth.ts` 內的過濾器：
* `getCurrentUser()`：從 Cookie `crm_auth_session` 解析目前登入者。
* `getDealScopeFilter(user, queryRegion)`：
  * 若 `user` 為 `ADMIN` 或 `GM`：可查看所有區域資料（若選定區域則套用該區域）。
  * 若 `user` 為 `SALES_MANAGER`：自動鎖定 `region: user.region`，可見全區下屬商機。
  * 若 `user` 為 `SALES`：強制鎖定 `AND: [{ region: user.region }, { assignedToId: user.id }]`。
* `getEntityScopeFilter(user, queryRegion)`：用於 Account 與 Contact 的分區過濾。
* `getLeadScopeFilter(user, queryRegion)`：用於 Lead 的分區與負責人過濾。
* `isAdmin(user)`、`isGM(user)`、`isGMOrAdmin(user)`、`isSalesManager(user)`。

### 4.2 後端 API 結構 (`src/app/api/`)
* `/api/auth/login`：驗證帳密並寫入 `crm_auth_session` cookie。
* `/api/auth/logout`：清除 cookie。
* `/api/auth/me`：前端組件獲取當前登入者資訊。
* `/api/users` & `/api/users/[id]`：Admin 專用，建立/編輯成員帳號、分配區域、直屬主管與重設密碼。
* `/api/reports/executive`：總經理營運報表數據聚合（限制僅 GM、Admin、Manager 存取）。
* `/api/deals`：商機 Kanban 看板資料（自動套用 RBAC 過濾）。
* `/api/leads`：潛在線索與一鍵轉換 API。
* `/api/contacts` & `/api/accounts`：客戶 360 資料。
* `/api/tickets` & `/api/tickets/[id]`：售後工單與雙軌對話（Public Reply vs Internal Note）。

### 4.3 前端頁面結構 (`src/app/`)
* `/login`：登入頁面（含快速測試身分卡片）。
* `/dashboard` 或 `/`：總覽儀表板。
* `/settings/users`：人員帳號與負責區域管理（Admin 專屬）。
* `/reports`：總經理決策分析報表（支援一鍵列印）。
* `/sales/pipeline`：視覺化商機看板（支援 @dnd-kit 拖曳）。
* `/sales/leads`：線索意向評分與轉換。
* `/contacts` & `/accounts`：客戶 360 與統一活動時間軸。
* `/marketing/campaigns` & `/marketing/workflows`：行銷活動與自動化流程。
* `/support/tickets`：工單收件箱與 SLA 監控。

---

## ⚠️ 5. 重要操作守則與地雷排查 (Critical Gotchas)

### ⚠️ Gotcha 1: Windows 環境下 Node.js 行程鎖定 Prisma DLL (EPERM Error)
* **現象**：在執行 `npx prisma generate`、`npx prisma db push` 或 `npm run db:seed` 時，若 Next.js 伺服器在背景執行，會鎖定 `node_modules/@prisma/client/query_engine-windows.dll.node` 或 `dev.db` 導致 `EPERM` 權限錯誤。
* **正確處置方式**：
  ```powershell
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 1
  npx prisma db push
  npm run db:seed
  ```

### ⚠️ Gotcha 2: 背景常駐服務 (Daemons)
* 本專案依賴兩個主要背景行程：
  1. **Next.js 伺服器**：`npm run start` (生產模式，監聽 `localhost:3000`)
  2. **Cloudflare Tunnel**：
     ```powershell
     cloudflared tunnel --config C:\Users\Brian\.cloudflared\config-crm.yml run crm-gb10
     ```
* 當執行 `npm run build` 前，請確保先關閉舊的 node 常駐行程以釋放 3000 port。

### ⚠️ Gotcha 3: PowerShell 下 curl JSON 轉義問題
* 在 Windows PowerShell 下使用原生 `curl` 發送 JSON POST 時，雙引號容易被剝除導致 `SyntaxError`。
* **推薦使用 PowerShell 原生指令測試 API**：
  ```powershell
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession;
  $res = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body (@{username="admin"; password="Avi22099759"} | ConvertTo-Json) -ContentType "application/json" -WebSession $session;
  ```

---

## 🛠️ 6. 日常維護與快速啟動指令 (Cheat Sheet)

```powershell
# 1. 停止所有 Node 相關行程
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. 同步資料庫結構與重新產生 Prisma Client
npx prisma db push

# 3. 重新匯入測試種子資料 (包含 Admin Avi22099759 與各區業務)
npm run db:seed

# 4. 建立 Next.js 生產建置
npm run build

# 5. 啟動 Next.js 生產伺服器 (背景常駐)
npm run start

# 6. 啟動 Cloudflare Tunnel (背景常駐)
cloudflared tunnel --config C:\Users\Brian\.cloudflared\config-crm.yml run crm-gb10
```

---

## 🔮 7. 後續升級規劃建議 (Phase 7+ Roadmap)

若使用者提出後續進階需求，建議優先依循以下模組架構擴展：
1. **企業真實 SMTP 郵件發送**：在 `/src/lib/mail.ts` 中整合 `nodemailer` 或 SendGrid API，讓 EDM 行銷活動與工作流能實際對外寄信。
2. **社群渠道 Webhook (LINE OA / WhatsApp)**：建立 `/api/webhooks/line` 將訪客諮詢直接轉為 CRM Lead 或 Ticket。
3. **PWA 外勤支援**：配置 `next-pwa`，支援外勤業務離線查閱客戶與 GPS 拜訪打卡。
4. **PostgreSQL 生產資料庫切換**：修改 `prisma/schema.prisma` 中的 `datasource db` 為 `postgresql` 並於 `.env` 配置 `DATABASE_URL`。

---
*NexCRM Agent 交接小組 · 2026*
