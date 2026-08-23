# NexCRM - AI Agent 交接手冊 (Agent Handoff Document)

> 💡 **致接手本專案的 AI Coding Agent**：  
> 本文件旨在協助你快速掌握 **NexCRM** 的完整系統架構、程式碼組織、權限過濾規則、執行環境注意事項與未來的擴充方向。請在進行任何程式碼異動前仔細閱讀本文件。

> **目前交接狀態（2026-08-23）**：首次 ADMIN bootstrap、密碼強制設定、opaque Session、RBAC/ABAC、Contact 360 分頁、主管循環防護與 PostgreSQL migration 已完成。**已匯入實際組織編制**（GM Thomas、三個行銷部對應三個市場區域、訂單管理員跨全市場支援、客服與企劃主管），區域槽位重新定義為 NORTH=第一市場(中南美/菲律賓)、CENTRAL=第二市場(美歐/俄印/台灣)、SOUTH=第三市場(俄羅斯/中東)、OVERSEAS=總部與其他（內部 enum 值不變，僅顯示名稱與人員指派調整）。前端已完成 UI 現代化：共用 UI 元件庫、(app) route group server auth gate、拖曳 Kanban、recharts 圖表、統一載入/空/錯誤狀態與操作回饋。SQLite `npm run check`、PostgreSQL migration/runtime、96 個角色安全檢查與 Playwright E2E 均已通過。接手者先讀本段與第 8 節，再執行 `npm run db:pg:check`、`npm run typecheck`。

---

## 📌 1. 專案核心背景與系統定位

* **專案名稱**：NexCRM (輕量級企業客戶關係管理系統)
* **架構定位**：單一企業自用，無多租戶負擔，兼具**多區域管理**、**多人獨立帳號密碼**、**階層式權限隔離**與**總經理營運決策分析**。
* **技術棧**：
  * **前端**：Next.js 16.3 (App Router) + React 19 + Tailwind CSS + Lucide Icons + Recharts
  * **拖曳元件**：@dnd-kit (Kanban 商機看板)
  * **後端**：Next.js Route Handlers (RESTful APIs)
  * **資料庫 & ORM**：Prisma ORM 5.22 + SQLite（本地）/ PostgreSQL 16 generated schema、baseline migration 與 CI runtime test
  * **認證機制**：資料庫可撤銷 opaque Session (`crm_auth_session` cookie + `AuthSession` table)
  * **稽核機制**：`src/proxy.ts` 產生 request ID/安全標頭；`AuditEvent` 保存登入、拒絕與 mutation 結果
  * **API contract**：`src/lib/contracts.ts` 定義 Zod runtime schemas；`api-response.ts` 統一 JSON/query parsing、錯誤格式與 cursor headers
  * **Response DTO / 冪等**：`src/lib/response-contracts.ts` 是輸出 allowlist；`src/lib/idempotency.ts` 將建立型 mutation、AuditEvent 與 24 小時 replay snapshot 納入同一 transaction
  * **SQLite 寫入保護**：`src/lib/write-serialization.ts` 僅在 `DATABASE_URL=file:` 時序列化工單建立；PostgreSQL 直接使用資料庫並行與 transaction
  * **金額處理**：Deal.value 是 Prisma Decimal；報表一律使用 `src/lib/money.ts` 加總，不可先轉 JS number 再累加
  * **外部網路**：Cloudflare Tunnel (`cloudflared` 綁定 `crm.avision-gb10.org`)
* **主要程式庫**：`https://github.com/brianshih04/lightweight-crm`

---

## 🌐 2. 系統正式存取端點與設定

| 項目 | 網址 / 位置 | 說明 |
| :--- | :--- | :--- |
| **正式外網 (Cloudflare SSL)** | `https://crm.avision-gb10.org` | 由背景 `cloudflared` tunnel 代理轉發至本地 3000 port |
| **登入頁面 (Login)** | `https://crm.avision-gb10.org/login` | 手動帳密登入；空資料庫時提供一次性首位 ADMIN 設定 |
| **本地開發網址** | `http://localhost:3000` | Next.js 本地監聽端點 |
| **人員與區域管理 (Admin)** | `https://crm.avision-gb10.org/settings/users` | 僅 Admin / GM 可存取 |
| **總經理決策報表 (GM)** | `https://crm.avision-gb10.org/reports` | 僅 GM / Admin / 業務主管可存取 |
| **Cloudflare 設定檔** | `C:\Users\Brian\.cloudflared\config-crm.yml` | Tunnel UUID: `e069e611-2795-4929-9d40-486db6c1784c` |

---

## 🔐 3. 帳號矩陣與角色職責 (Account Matrix)

系統不保存任何文件化預設帳密。當 `User` 表為空時，`/login` 會進入一次性 bootstrap：第一位完成姓名、Email、帳號及至少 12 字元密碼設定的人會成為 `ADMIN`/`ALL`；建立成功後 `/api/auth/setup` 拒絕第二次初始化。請在 Cloudflare Access 或受控內網後方完成此步驟。

展示資料 seed 只有在明確提供 `DEMO_SEED_PASSWORD` 時才執行；不可將 demo seed 用於正式環境或管理員密碼恢復。

`ADMIN` 是獨立的系統管理角色，不代表業務階層。業務主線為「GM → 市場部主管／區域主管 → Sales」；`ORDER_ADMIN` 是跨市場的訂單管理支援角色（組織上掛在市場部主管下）。

**實際編制（2026-08-23 起，定義於 `prisma/seed.ts`）**：GM=`thomas`（另有 `thomas_mkt` 市場部主管帳號）；第一行銷部=`ivan`+`maite`（NORTH 第一市場：中南美/菲律賓）；第二行銷部=`jane`+`lauren`（CENTRAL 第二市場：美歐/俄印/台灣）；第三行銷部=`james`+`vivien`（SOUTH 第三市場：俄羅斯/中東）；訂單管理員=`linda`+`brenda`（掛 `thomas_mkt` 下，全市場商機權限）；客服主管=`kidd`（另有 `kidd_planning` 企劃部主管帳號）。兼任兩個職務者比照「一職務一帳號」模式。

| Role | Scope | 主要職責與限制 |
| --- | --- | --- |
| `ADMIN` | `ALL` | 系統管理、使用者／區域／主管設定、安全稽核；首次 bootstrap 的唯一固定角色。 |
| `GM` | `ALL` | 全公司業務資料、決策報表與組織管理；可任命各業務線主管。 |
| `MARKETING_MANAGER` | `ALL` | 市場部專員與行銷 campaign/workflow；不可存取銷售報表、使用者管理或 audit API。 |
| `SALES_MANAGER` | 指定區域 | 管理該區域的 Sales 與 `ORDER_ADMIN`，可查看區域商機與線索。 |
| `ORDER_ADMIN` | 總部與其他 | 訂單管理員（跨市場支援）；可讀取／建立／更新全市場 Deal，不能管理使用者、報表或安全稽核。 |
| `SALES` | 指定區域 | 僅能操作自己負責的商機／線索與所屬區域客戶資料。 |
| `MARKETING` / `SUPPORT` | `ALL` | 分別執行核准的行銷流程與客服工單工作。 |

---

## 🧱 4. 關鍵程式碼架構與模組劃分

### 4.1 認證與分區資料過濾引擎 (`src/lib/auth.ts`)
所有 API 進行資料查詢時，**必須**使用 `src/lib/auth.ts` 內的過濾器：
* `getCurrentUser()`：雜湊 Cookie token、驗證資料庫 Session expiry/revocation，再重新載入目前使用者角色。
* `createAuthSession()` / `revokeCurrentSession()` / `revokeAllUserSessions()`：建立及撤銷伺服器端 Session。
* User DELETE 是 soft delete：設定 `isActive=false`/`deletedAt`、撤銷全部 Session、解除下屬 managerId；不可改回 hard delete 以免破壞業務與稽核歷史。
* `getDealScopeFilter(user, queryRegion)`：
  * 若 `user` 為 `ADMIN` 或 `GM`：可查看所有區域資料（若選定區域則套用該區域）。
  * 若 `user` 為 `SALES_MANAGER`：自動鎖定 `region: user.region`，可見全區下屬商機。
  * 若 `user` 為 `ORDER_ADMIN`：跨市場支援單位，可見全部市場商機（可比照 GM 用 queryRegion 過濾）。
  * 若 `user` 為 `SALES`：強制鎖定 `AND: [{ region: user.region }, { assignedToId: user.id }]`。
* `getEntityScopeFilter(user, queryRegion)`：用於 Account 與 Contact 的分區過濾。
* `getLeadScopeFilter(user, queryRegion)`：用於 Lead 的分區與負責人過濾。
* `ORDER_ADMIN` 為全市場 scope；`MARKETING_MANAGER` 雖是 `ALL`，其銷售／報表權限仍由 permission matrix 拒絕，不可只依 region 判斷授權。區域槽位對應：NORTH=第一市場(中南美/菲律賓)、CENTRAL=第二市場(美歐/俄印/台灣)、SOUTH=第三市場(俄羅斯/中東)、OVERSEAS=總部與其他。
* `isAdmin(user)`、`isGM(user)`、`isGMOrAdmin(user)`、`isSalesManager(user)`、`isMarketingManager(user)`、`isOrderAdmin(user)`。
* `roleRequiresRegionalScope(role)` 與 `canManageUserRole(managerRole, subordinateRole)`：集中驗證區域角色與主管任命規則；`inspectManagerHierarchy()` 只沿祖先鏈檢查，最多 50 層。

### 4.2 後端 API 結構 (`src/app/api/`)
* `/api/auth/login`：驗證帳密、套用帳號/IP 登入節流，建立伺服器端 Session 並寫入 opaque cookie。
* `/api/auth/logout`：撤銷目前 Session；可選擇登出全部裝置。
* `/api/auth/me`：前端組件獲取當前登入者資訊（含 `mustChangePassword`）。
* `/api/auth/change-password`：使用者自行更改密碼（驗證目前密碼、新密碼至少 12 字元、清除 `mustChangePassword`、撤銷其他裝置 Session）。`mustChangePassword=true` 的使用者存取任何其他受保護 API 都會回 `403 PASSWORD_CHANGE_REQUIRED`（見 `authorization.ts` 閘門），前端會導向 `/change-password`。管理者建立使用者或重設密碼都會設定此旗標。
* `/api/audit`：僅 ADMIN 可查詢的 cursor-paginated 稽核事件 API。
* `/api/users` & `/api/users/[id]`：Admin / GM 專用，建立/編輯成員帳號、分配區域、直屬主管與重設密碼；會拒絕不相容的角色主管、跨區主管、循環與過深階層。
* `/api/reports/executive`：總經理營運報表數據聚合（限制僅 GM、Admin、Manager 存取）。
* `/api/deals`：商機 Kanban 看板資料（自動套用 RBAC 過濾）。
* `/api/leads`：潛在線索與一鍵轉換 API。
* `/api/contacts` & `/api/accounts`：客戶 360 資料。
* `/api/tickets` & `/api/tickets/[id]`：售後工單與雙軌對話（Public Reply vs Internal Note）。

### 4.3 前端架構 (`src/app/` 與 `src/components/`)

**Route groups 與殼層**：
* `src/app/layout.tsx`：根 layout——只含 html/body 與 `ToastProvider`（全域操作通知）。
* `src/app/(app)/layout.tsx`：server component，呼叫 `getCurrentUser()` 做 **server-side auth gate**（未登入 redirect `/login`），並把 `SessionUser` 以 props 傳給 Sidebar/Header（不再各自 fetch `/api/auth/me`）。
* `src/app/login/page.tsx`：獨立於 app 殼層的登入／首次 ADMIN 設定頁。
* `(app)/loading.tsx`、`(app)/error.tsx`（含重試）、`src/app/not-found.tsx`：路由邊界。

**頁面（全部在 `(app)/` 內，URL 不變）**：
* `/`：總覽儀表板（recharts 階段分佈圖＋工單優先度甜甜圈）。
* `/settings/users`：人員帳號與負責區域管理（Admin / GM）；`/settings/audit`：ADMIN 安全稽核主控台。
* `/reports`：總經理決策分析報表（分市場長條圖、排行榜進度條、一鍵列印）。
* `/sales/pipeline`：@dnd-kit 拖曳看板（`src/components/sales/PipelineBoard.tsx`）——樂觀更新＋失敗回滾＋下拉選單備援。
* `/sales/leads`：線索意向評分與轉換。
* `/contacts` & `/accounts`：客戶 360 與統一活動時間軸（tabs 具 `role="tab"` 語意）。
* `/marketing/campaigns` & `/marketing/workflows`：行銷活動與自動化流程（toggle 具 `role="switch"`）。
* `/support/tickets`：工單收件箱與 SLA 監控。

**共用前端基礎**：
* `src/components/ui/`：共用 UI 元件庫——Button（loading 狀態）、Modal（focus trap／Escape／點外關閉／多層堆疊）、ConfirmDialog、ToastProvider/useToast（成功／錯誤通知）、EmptyState、ErrorBanner（含重試）、PageHeader、LoadMoreButton、SearchInput（300ms debounce）、Field/inputClassName。新頁面一律使用這套元件，不要手刻 modal／按鈕／狀態。
* `src/lib/api-client.ts`：`apiFetch`／`fetchApiResponse`／`fetchAllPages`——解析統一錯誤信封為 `ApiError`（含 422 issues 欄位訊息）、401 UNAUTHENTICATED 自動 redirect `/login`（登入頁除外）、支援 AbortSignal；`apiErrorMessage()` 供 toast／inline 顯示。
* `src/components/charts/`：recharts 圖表（StageFunnelChart、TicketPriorityDonut、RegionalPerformanceChart）。
* 所有 mutation 失敗必須顯示回饋：modal 內用 inline banner，背景操作用 toast；成功用 toast.success。

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
* **推薦使用 PowerShell 原生指令測試 API**，帳密由操作者安全輸入，不要寫入文件或 shell history：
  ```powershell
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession;
  $credential = Get-Credential;
  $res = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Headers @{Origin="http://localhost:3000"} -Body (@{username=$credential.UserName; password=$credential.GetNetworkCredential().Password} | ConvertTo-Json) -ContentType "application/json" -WebSession $session;
  ```

### ⚠️ Gotcha 3b: 跑完 test:postgres 後必須重新產生 SQLite client
* `npm run test:postgres` 前需執行 `npx prisma generate --schema prisma/postgresql/schema.prisma`，這會把 `node_modules/.prisma/client` 覆蓋為 PostgreSQL 版；之後直接 `npm run start` 會因 `DATABASE_URL=file:` 與 postgresql provider 不符而讓 `/api/health` 回 503。
* **跑完 PostgreSQL 相關工作後，一律執行 `npx prisma generate`（主 schema，SQLite）再啟動本機伺服器。**

### ⚠️ Gotcha 4: SQLite 不適合作為正式高併發資料庫
* `TicketSequence` 在 transaction 內原子遞增，可保證工單號唯一；但 SQLite 同一時間只能有單一 writer。
* 本機 `file:` 資料庫因此以 process-global FIFO 序列化工單建立，並已通過 100 筆同時請求測試。這只保護單一 Node.js process，不是多副本部署方案。
* staging/production 使用 `prisma/postgresql/schema.prisma` 與 migrations；CI 已在 PostgreSQL 16 驗證 100 路併發。不要直接修改 generated schema。

### ⚠️ Gotcha 5: 建立型 mutation 的安全重試
* 呼叫端若可能因 timeout、斷線或使用者重按而重送，應在第一次請求產生 `Idempotency-Key` 並於重試時沿用；不要每次重送產生新 key。
* key scope 是 actor + method + path，保留 24 小時；相同 payload 回放原始 status/body 並附 `Idempotency-Replayed: true`，不同 payload 回 `409`。
* idempotency record 只保存 SHA-256 key hash，過期紀錄會在後續帶 key 的 mutation 中清理。

---

## 🛠️ 6. 日常維護與快速啟動指令 (Cheat Sheet)

```powershell
# 1. 停止所有 Node 相關行程
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. 同步資料庫結構與重新產生 Prisma Client
npx prisma db push

# 3. 僅在隔離的 demo DB 匯入展示資料；必須自行設定至少 12 字元密碼
$env:DEMO_SEED_PASSWORD = Read-Host "Demo password" -MaskInput
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
4. **PostgreSQL 正式切換**：依 `docs/postgresql-cutover.md` 執行備份、`migrate deploy`、SQLite importer、readiness 與 rollback gate；禁止直接修改 SQLite 主 schema provider。

### 7.1 尚未完成、不可假設已上線

Git history 機密清理與正式憑證輪替、MFA/SSO、外部 alert channel、正式 PostgreSQL cutover、registry／流量層自動 rollback、加密離機備份、更多核心流程的瀏覽器 E2E，以及集中式 logs/metrics/traces 仍待正式環境治理。不要因本機測試通過就宣稱 production-ready。

---

## ✅ 8. 接手驗證清單（先做這些）

```powershell
# SQLite 本機品質門檻
npm run check

# PostgreSQL schema drift / migration / runtime（需要 Docker 與 5432 測試 DB）
npm run db:pg:check
npm run db:pg:generate
npm run db:pg:migrate
npm run test:postgres

# 瀏覽器首次 ADMIN 流程
npm run test:e2e
```

接手修改角色或授權時，至少同步檢查 `src/lib/auth.ts`、`src/lib/permissions.ts`、`src/lib/contracts.ts`、`src/app/api/users/**`、`src/app/settings/users/page.tsx`、`prisma/schema.prisma`、`scripts/generate-postgres-schema.mjs`、`prisma/postgresql/migrations/`、`tests/permissions.test.ts`、`tests/security.integration.mjs` 與本文件群組。

---
*NexCRM Agent 交接小組 · 2026*
