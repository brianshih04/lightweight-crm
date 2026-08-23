# NexCRM 嚴格架構審查與改善計畫

> 審查日期：2026-08-23  
> 審查基準：以「可安全暴露於公網、可由多人長期維護、可恢復、可稽核」的正式 CRM 系統為標準，而不是以 prototype/demo 標準評分。  
> 結論：**目前可編譯，但不具備安全上線條件。建議立即停止公網匿名存取，完成 P0 後才恢復服務。**

## 0. 執行進度（2026-08-23 起）

下列為開始執行改善計畫後的已驗證成果；第 1–3 節保留最初審查基線，方便比較改善前後差異。

- [x] 一次性首次 ADMIN bootstrap、強制自訂密碼與確認密碼。
- [x] 移除匿名 ADMIN fallback；改為資料庫可撤銷 opaque Session，並於每次請求重新讀取資料庫角色。
- [x] 建立集中式 role × action × resource 權限矩陣，所有受保護 API default-deny。
- [x] Contact、Lead、Deal、Ticket 單筆資源加入區域/負責人 scope，阻擋跨區 IDOR。
- [x] User response 使用 allowlist；96 個角色端點檢查確認回應不含密碼欄位與越權結果。
- [x] Lead conversion、Contact/Activity、Deal/Activity、Ticket/Message 與 mutation AuditEvent 改為原子 transaction。
- [x] Next.js 14.2.10 / React 18 升級至 Next.js 16.3.2 / React 19.2.8。
- [x] `npm audit --omit=dev --audit-level=high`：0 vulnerabilities。
- [x] 建立非互動 `npm run check`：lint、typecheck、20 unit tests、production build、security integration、dependency audit 全部通過。
- [x] 安全整合測試：96 個角色端點判斷、匿名 401、四類 IDOR、工單內部筆記與 AuditEvent 持久性。
- [x] 明確要求 Node.js 22.5+，確保 `npm run check` 的 `node:sqlite` 測試環境可重現。
- [x] `.env`、`cookies.txt` 已加入 ignore 並從目前 Git index 移除；本機副本保留，另提供無秘密的 `.env.example`。
- [x] 建立 `AuthSession` token hash、expiry、revocation、lastSeenAt 與 logout-all；密碼重設會撤銷既有 Session。
- [x] 登入加入 DB-backed identity/IP 節流；所有 mutation 加入嚴格同源 Origin 驗證。
- [x] 全域 request ID、安全回應標頭與持久化 AuditEvent；登入、登出、權限拒絕及所有現有 mutation 成功結果均可追蹤。
- [x] 所有 mutation 導入 Zod runtime contract、64 KiB body cap、strict unknown-field rejection 與統一 error/code/requestId envelope。
- [x] Account/Contact/Lead/Ticket/User 直接列表加入 1–100 page-size、查詢長度上限與 `X-Next-Cursor`。
- [x] 工單編號改用 transaction 內原子 `TicketSequence`；100 筆同時建立的整合測試全部成功且編號唯一。本機 SQLite 寫入使用 FIFO 序列化，PostgreSQL 保持原生並行。
- [x] 所有 API 成功回應導入 Zod response DTO allowlist；建立型 mutation 支援 24 小時持久化 `Idempotency-Key`，20 筆相同 key 並行請求驗證只建立一份資源。
- [x] 依實際 region/assignee/status/time/foreign-key 查詢路徑補齊複合索引；`Stage(pipelineId, order)` 加入唯一約束，SQLite query plan 已確認核心 Account/Ticket 查詢命中索引。
- [x] User 刪除改為 soft delete：停用帳號、記錄 `deletedAt`、撤銷 Session、解除下屬主管關係並保留歷史業務關聯與 AuditEvent。
- [x] Deal 金額由 `Float` 遷移為 Prisma `Decimal`；既有 7 筆資料遷移前後統計一致，內部彙總採 Decimal，DTO 邊界維持相容 number。
- [x] 新增 GitHub Actions Node 22 quality workflow；push/PR 自動執行 locked install、Prisma generate/validate 與完整 `npm run check`。
- [x] Dashboard/Executive Report 的全量載入改為 DB `groupBy/count/_sum`；region filter 同步約束業務排行榜查詢，另新增 DB readiness `/api/health`。
- [x] 建立由 SQLite 主 schema 生成的 PostgreSQL schema、16 個 native enum 與 baseline migration；空 PostgreSQL 16 migrate/status/drift 驗證通過。
- [x] PostgreSQL runtime integration：20 路冪等、100 路工單序號、Decimal、enum 拒絕、soft delete 與 audit 全數通過，並加入 CI service job。
- [x] 9 筆既有 legacy 明文密碼全部升級 scrypt；SQLite→PostgreSQL 原子搬遷在兩個空 DB 通過逐表筆數、Deal 總額與密碼格式驗證。
- [x] 完成一次 PostgreSQL custom-format backup/restore drill；Users/Deals/Deal total/Tickets/AuditEvent 前後一致並記錄 SHA-256。
- [x] 建立 digest-pinned Node/PostgreSQL container 部署：standalone non-root/read-only app、一次性 migration gate、file-mounted secrets、readiness、隔離網路與可回滾 image tag；乾淨 Compose E2E 已驗證首次 ADMIN 與強制密碼流程。
- [x] 新增 ADMIN-only security summary：15 分鐘／24 小時 AuditEvent 聚合、active login blocks、重複來源與可測試的 WARNING/CRITICAL 門檻；96 個角色端點檢查確認非 ADMIN default-deny。
- [x] 建立 Playwright Chromium E2E 與隔離 SQLite lifecycle；實際瀏覽器驗證首次訪客必須自行設定並確認密碼、取得唯一 ADMIN、Secure session 可用、bootstrap 關閉與重新登入，CI 失敗保留 screenshot/video/trace。
- [x] 建立 `/settings/audit` ADMIN-only 安全營運介面：server-side role gate、typed DTO、狀態／告警卡、高頻來源、事件篩選與 cursor 分頁；Playwright 驗證 ADMIN 可見、GM 導覽隱藏且直接 URL 被 redirect。
- [x] Deal、Campaign、Workflow 聚合列表改為穩定 cursor 分頁與前端明確「載入更多」；Deal 不再由 Pipeline/Stage nested include 全量展開，Campaign 的 Segment/Template 參考選項另設 100 筆硬上限與截斷警告。
- [x] Account/Contact 列表移除每列完整 contacts/deals/tickets payload；改用 `_count` 與 `groupBy/_sum` 最小摘要 DTO，並以整合測試驗證計數、Decimal 金額與關聯欄位不再外洩。
- [x] Executive Report 排行榜移除每位業務的完整 assignedDeals 載入，改為 DB `groupBy(assignedToId,status)` 聚合並限制前 20 名；SQLite 與真實 PostgreSQL runtime 均已驗證。
- [x] Contact 360 拆為最小 overview 與 deals/tickets/activities 三條獨立 cursor API；各分頁預設 25、最大 100 筆，前端提供個別載入更多、錯誤狀態，並維持 contact/deal 區域 scope。
- [x] 使用者主管循環驗證改為只沿祖先鏈逐層讀取，設 50 層上限並回傳 `MANAGER_HIERARCHY_TOO_DEEP`；cycle、pre-existing cycle、depth limit 皆有單元與安全整合測試。
- [x] 業務階層明確拆分為總經理（GM）、市場部主管（MARKETING_MANAGER）、區域主管（SALES_MANAGER）與 Sales；新增區域範圍的訂單管理員（ORDER_ADMIN，Sales Assistant），並同步權限、主管任命規則、seed、管理 UI、文件與 PostgreSQL enum migration。
- [x] 清除所有示範業務資料（客戶／商機／工單等），seed 改為只建立人員結構與標準管線；新增 `db:clear-business-data` 保留人員與設定的清理腳本。
- [x] 匯入實際組織編制：GM Thomas（雙帳號含市場部主管）、三個行銷部（Ivan/Jane/James ＋ Sales）、訂單管理員 Linda/Brenda 掛市場部主管下、客服主管 Kidd（雙帳號含企劃部主管）。
- [x] 區域槽位重新定義為三個市場＋總部（NORTH=中南美/菲律賓、CENTRAL=美歐/俄印/台灣、SOUTH=俄羅斯/中東、OVERSEAS=總部與其他）：僅改顯示名稱與人員指派，內部 enum 與 schema 不變，報表／人員頁／篩選器同步。
- [x] `ORDER_ADMIN` 權限模型調整為跨全市場商機支援（Deal/Contact/Lead scope 全域，可比照 GM 用 queryRegion 過濾），商機建立可比照 GM 指定區域；使用者管理與報表權限不變，96 項安全檢查通過。
- [x] UI 現代化：共用 UI 元件庫（Button/Modal focus-trap/ConfirmDialog/Toast/EmptyState/ErrorBanner/SearchInput debounce/Field）、(app) route group server-side auth gate、登入頁脫離 app 殼層、route-level loading/error/not-found 邊界、401 自動導回登入、API 錯誤信封解析（含 422 欄位訊息）、全部頁面的 mutation 成功／失敗回饋。
- [x] 商機看板改為真實 @dnd-kit 拖曳（樂觀更新＋失敗回滾＋DragOverlay＋下拉備援），移除換階段整頁重載；儀表板與報表改用 recharts 圖表（階段分佈、工單優先度、分市場長條圖、排行榜進度條），報表摘要文案改為數據驅動。
- [x] 初始密碼生命週期治理：`User.mustChangePassword` 旗標（SQLite＋PostgreSQL migration）、管理者建立／重設密碼自動標記、`/api/auth/change-password`（驗證舊密碼、12+ 字元、不可與舊密相同、撤銷其他裝置）、未改密前受保護 API 一律 `403 PASSWORD_CHANGE_REQUIRED`、`/change-password` 強制改密頁與登入自動導向；安全整合測試與 Playwright E2E 均涵蓋此流程。

**尚未解除的主要阻斷項**：Git history 機密清理與正式憑證輪替、MFA/SSO、外部 alert channel、正式 PostgreSQL cutover、registry/流量層自動 rollback、排程加密離機備份、擴充各核心流程的瀏覽器 E2E，以及集中式 logs/metrics/traces。

**交接閱讀順序**：先看 `handoff.md` 的目前交接狀態與驗證清單，再看 `development_plan.md` 的角色矩陣及本文件的未完成項；第 1–3 節是改善前基線，勿誤讀為目前實作狀態。角色相關變更必須同步 schema、contracts、permissions、users API、seed、UI、PostgreSQL migration 與安全測試。

## 1. 執行摘要

目前專案是一個約 7,243 行、38 個 TypeScript/TSX/CSS/Prisma 原始檔的 Next.js 14 單體應用。功能垂直面已涵蓋 CRM 的主要展示情境，TypeScript、Prisma schema 與 production build 均可通過；但安全模型、資料完整性、測試與交付治理仍停留在 demo 階段。

最關鍵的事實不是「缺少最佳實務」，而是現有安全邊界實際失效：

1. `src/lib/auth.ts:31-48` 在沒有 Session 時自動回退成 ADMIN。2026-08-23 實測未帶 Cookie 呼叫 `/api/auth/me`，回傳 `authenticated: true`、`role: ADMIN`。
2. `crm_auth_session` 是客戶端可自行組裝的未簽章 JSON；伺服器直接信任其中的 `role`、`region`、`id`。
3. 密碼以明文儲存、比較、建立與重設；多個 API 使用 Prisma `include: true` 或回傳完整 `User`，會把 `password` 一併送到客戶端。
4. 多數 API 沒有 authentication、role authorization 或 object-level scope 檢查，存在未授權讀寫、IDOR 與跨區域資料操作。
5. 完整專案沒有任何自動測試、ESLint 設定、CI、資料庫 migration、備份/還原證據或可觀測性。
6. `npm audit` 回報 1 個 critical 與 1 個 high 套件風險；Next.js 14.2.10 已落後且命中多項安全公告。

### 嚴格評分

| 面向 | 分數 | 滿分 | 判定 |
|---|---:|---:|---|
| 認證、授權與機密管理 | 0 | 25 | Fail-open、可偽造 Session、明文密碼與密碼外洩路徑 |
| 資料模型與一致性 | 5 | 15 | schema 可用，但缺 enum/index/transaction/migration，金額使用 Float |
| 程式結構與可維護性 | 7 | 15 | 功能清楚，但頁面與 handler 巨型化、無 domain/service 邊界 |
| API 合約與輸入安全 | 2 | 10 | 無 runtime schema、無 DTO、無分頁、錯誤語意不一致 |
| 測試與品質門檻 | 1 | 15 | typecheck/build 通過；lint 未配置，測試為零 |
| 部署、恢復與可觀測性 | 2 | 15 | 可本機啟動，但依賴單機、SQLite、外部 tunnel 設定，無恢復演練 |
| 文件可信度 | 1 | 5 | 文件完整但宣稱與實作不符，且直接記錄正式帳密 |
| **總分** | **18** | **100** | **Prototype；禁止直接視為 production-ready** |

## 2. 審查證據與實際驗證

### 2.1 已執行檢查

| 檢查 | 結果 | 說明 |
|---|---|---|
| `npx tsc --noEmit` | PASS | TypeScript 靜態檢查目前通過 |
| `npm run build` | PASS | Next.js 14.2.10 production build 成功，產生 14 個頁面 |
| `npx prisma validate` | PASS | 現有 SQLite schema 語法有效 |
| `npm run lint` | FAIL | 沒有 ESLint 設定，指令進入互動式初始化，不可用於 CI |
| 自動測試搜尋 | FAIL | 無 unit/integration/e2e 測試與測試設定 |
| `npm audit --json` | FAIL | 1 critical、1 high；直接風險來源包含 `next` |
| 未登入 `/api/auth/me` | FAIL | 未帶 Cookie 仍回傳 ADMIN 身分 |
| Prisma migrations | FAIL | `prisma/migrations/` 不存在，只提供 `db push` |
| CI / secret scan / dependency bot | FAIL | 無 `.github/workflows`、CodeQL、gitleaks、Dependabot/Renovate |

### 2.2 規模與結構觀察

- 15 個 UI 模組全部標記為 `"use client"`；主要頁面都在客戶端抓 API。
- 最大檔案：`src/app/settings/users/page.tsx` 664 行；另有多個 300–406 行頁面。
- 除 `SessionUser` 與 Sidebar 導航型別外，幾乎沒有明確 domain/API 型別；前端廣泛使用 `any`、`any[]`。
- Route Handler 直接同時負責 HTTP、身份、授權、輸入解析、業務流程、Prisma 寫入與 response shaping。
- 無 `middleware.ts`、protected route group、`loading.tsx`、`error.tsx`、API client、feature service 或 repository/policy 層。
- `.env`、`cookies.txt` 被 Git 追蹤；沒有 `.env.example`。`.next`、`node_modules`、SQLite DB 目前有被忽略。
- `reactStrictMode` 被關閉，會掩蓋部分副作用與 lifecycle 問題。

## 3. 發現清單（依嚴重度排序）

### P0 / Blocker：立即處置，未完成前不可對公網開放

#### SEC-001：未登入者自動成為 ADMIN

- 證據：`src/lib/auth.ts:18-50`；Session 不存在或無法解析時查詢第一個 ADMIN 並回傳。
- 額外問題：`getDealScopeFilter`、`getEntityScopeFilter`、`getLeadScopeFilter` 都把 `!user` 當成 unrestricted scope。
- 影響：所有匿名請求可取得全域資料與執行管理操作；這不是單一 bug，而是 default-allow 安全模型。
- 處置：立刻移除 fallback；所有未認證請求必須是 `401`，未知 role/action 必須是 `403`。

#### SEC-002：Session 可偽造、不可撤銷且會過期失真

- 證據：`src/app/api/auth/login/route.ts:25-47` 將完整角色資料序列化成未簽章 Cookie；`src/lib/auth.ts:24-25` 直接信任 JSON。
- 影響：攻擊者可自行建立 `role: "ADMIN"`；使用者被停權、改角色、離職後，舊 Cookie 仍持續有效。
- 處置：改為伺服器端 opaque session。Cookie 只保存高熵 token，資料庫只保存 token hash、userId、expiresAt、revokedAt；每次授權從伺服器載入有效使用者與 role。

#### SEC-003：明文密碼與回應資料外洩

- 證據：
  - `prisma/schema.prisma:13` 的 `password` 預設為明文 `123456`。
  - `src/app/api/auth/login/route.ts:21` 以明文比較。
  - `src/app/api/users/route.ts:9-24` 回傳完整 User 列表，沒有排除密碼。
  - `src/app/api/users/route.ts:58-75` 與 `src/app/api/users/[id]/route.ts:31-39` 回傳包含密碼的 User。
  - 多處 `assignedTo: true`、`user: true` 會透過巢狀關聯回傳完整 User；例如 contact activity、dashboard、deal、ticket、report。
  - 登入頁、seed、README、development plan、handoff、user guide 與 Git history 直接保存測試/管理員密碼。
- 影響：任何能讀取相關 API 或 repo 的人都可能取得所有使用者密碼；若密碼重用，影響會超出 CRM。
- 處置：立即輪替所有帳密、使所有 Session 失效、刪除快速登入卡與文件密碼；使用 Argon2id 雜湊；所有 User 查詢與 response DTO 一律採 allowlist，永不序列化 `passwordHash`。

#### SEC-004：API 普遍缺少認證與角色授權

- 完全未呼叫身份檢查的路徑包含 contact detail/activity、tickets、marketing campaigns、marketing workflows。
- 看似有 `getCurrentUser()` 的 handler 多數也沒有檢查 `null`，且目前會回退 ADMIN。
- 前端 Sidebar 隱藏選單不等於授權；使用者仍可直接呼叫 API。
- 處置：每個 handler 第一行經由統一 `requireUser()`/`authorize()`；建立「role × action × resource」政策矩陣，handler 不可自行拼湊規則。

#### SEC-005：IDOR 與跨區域寫入

- `contacts/[id]`、`tickets/[id]`、`deals PATCH`、lead conversion 都用全域 ID 查詢/更新，未把授權 scope 放入 `where`。
- Account/Contact/Lead 建立接受客戶端 `region`；Deal/Lead 接受任意 `assignedToId`，未驗證負責人與資料區域的一致性。
- Lead conversion 先用全域 ID 讀取，接著建立多個實體並改狀態，既未驗權也未使用 transaction。
- 處置：所有單筆讀寫採 `where: { id, ...authorizedScope }` 或先以 policy 驗證 resource；外鍵關聯也要驗證可見性與區域一致性。

#### SEC-006：公開入口缺少基礎防護

- Cookie 明確設定 `secure: false`；登入無 rate limit、lockout、MFA、CSRF/origin 檢查或 session rotation。
- `next.config.mjs` 無 CSP/HSTS/frame/content-type/referrer/permissions 等安全 header。
- 登入 catch 直接回傳 `String(error)`，可能洩漏內部資訊。
- 處置：正式環境強制 Secure Cookie、HTTPS、HSTS；加入 rate limiting、漸進延遲/鎖定、CSRF 或嚴格 Origin 驗證、通用外部錯誤訊息。管理介面優先置於 Cloudflare Access/MFA 後方。

#### DEP-001：核心框架存在已知安全漏洞

- 實測 `npm audit`：1 critical、1 high。
- Next.js 目前為 14.2.10；audit 列出 authorization bypass、DoS、SSRF、request smuggling/cache 等多項公告。
- `npm outdated` 顯示 Next.js 最新為 16.3.2；這是 major migration，不應直接執行 `npm audit fix --force`。
- 處置：建立 migration branch，按官方 migration guide 升級 Next/React 與相依套件，完成 auth/route/e2e regression 後部署。若無法立即升級，先關閉公網或以 WAF/Access 限制來源，但補償控制不能取代升級。

### P1 / Critical：修復安全邊界後立即完成

#### DATA-001：多步驟寫入沒有 transaction

- Lead conversion、建立 Deal + Activity、Contact + Activity、Ticket + first message、Ticket first-response 更新都可能只完成一半。
- 處置：將 use case 移入 service，使用 `prisma.$transaction()`；針對重試與唯一鍵衝突定義 idempotency。

#### DATA-002：金額與狀態模型不可靠

- `Deal.value` 使用 IEEE-754 `Float`，不適合財務金額。
- role、region、status、priority、channel、activity type 等都是任意 String，資料庫無法阻止非法狀態。
- `parseFloat(value) || 0`、`parseInt(score)` 會把錯誤輸入靜默變成 0/NaN 或接受部分字串。
- 處置：PostgreSQL 使用 `Decimal(19,4)`（或明確 minor-unit 整數策略）；使用 Prisma enum + runtime enum；明確回傳 422，不可靜默修正輸入。

#### DATA-003：資料庫約束與索引不足

- 除主鍵、username/email/ticketNumber 外沒有 `@@index` 或複合 unique。
- 建議索引：所有 relation FK、`region`、`status`、`assignedToId`、`createdAt`、`slaDueAt`，以及實際查詢的複合索引，例如 `(region, status, createdAt)`。
- Stage 應有 `@@unique([pipelineId, order])`；只能有一個 default pipeline 的規則須由 transaction/service 保證。
- Pipeline/Stage 對 Deal 的 cascade delete 可能刪除商業歷史，應改 Restrict/soft-delete/封存政策。

#### DATA-004：工單編號有競態條件

- `ticket.count() + 1` 在併發下會產生相同 ticketNumber，並在刪除後重用號碼。
- 處置：使用資料庫 sequence/獨立 counter table transaction，或以不可碰撞 ID 作主識別並將顯示編號視為唯一 sequence。

#### API-001：沒有 runtime input validation 或穩定 response contract

- 所有 body 都直接 `request.json()` 解構；沒有大小、長度、格式、enum、未知欄位、日期、URL、email、關聯 ID 驗證。
- 目前 response 直接序列化 Prisma entity，造成密碼/PII 外洩並讓 DB schema 等同公開 API。
- 處置：導入 Zod/Valibot；每個 endpoint 有 request schema、response DTO、error envelope；從 schema 推導 TypeScript 型別與 OpenAPI。

#### API-002：列表無分頁、資料最小化與查詢上限

- Accounts、Contacts、Leads、Deals、Tickets、Users、Campaigns 等會載入全表及大型關聯。
- 報表在記憶體載入所有 deals/tickets/accounts 後運算，資料增長後會明顯退化。
- 處置：cursor pagination、最大 page size、欄位 allowlist；報表改 DB aggregate/groupBy 或預聚合；為慢查詢建立觀測指標。

#### DB-001：沒有 migration 與可驗證的 production DB 策略

- 專案只提供 `prisma db push`，沒有 `prisma/migrations`。
- README 宣稱 SQLite/PostgreSQL，但 schema provider 固定為 sqlite；「支援 PostgreSQL」尚未被 migration、CI 或部署驗證。
- 處置：建立 baseline migration；開發/測試/正式統一以 PostgreSQL 驗證；部署只執行 `prisma migrate deploy`，禁止 production `db push`。

#### OPS-001：seed 具有誤刪正式資料風險

- `prisma/seed.ts:7-21` 一開始即 deleteMany 全部核心資料。
- 處置：seed 啟動時檢查環境與資料庫 host/name，production hard fail；將 destructive demo reset 與 idempotent reference seed 分開，並要求明確旗標。

### P2 / High：建立可長期維護的結構

#### ARCH-001：Route Handler 是業務邏輯與資料存取的集中耦合點

- Handler 同時處理 transport、policy、validation、transaction、query、mapping、error handling。
- 結果是相同授權規則分散、無法單元測試、未來 queue/webhook/CLI 無法重用 use case。
- 處置：採「務實的垂直切片 modular monolith」，不要一開始拆 microservices。

#### ARCH-002：前端頁面巨型化且全 Client Component

- 15 個 UI 模組皆為 Client Component；最大頁面 664 行，多個頁面超過 300 行。
- 資料抓取、表單、modal、table/card、格式化與 mutation 混在同一檔案。
- 處置：預設 Server Component；只有互動區塊使用 Client Component。依 feature 拆成 query/mutation hook、form schema、table/card、dialog 與 page composition。

#### ARCH-003：沒有共享型別與資料存取層

- 前端大量 `any`，API/Prisma schema 改動不會在 consumer 形成可靠錯誤。
- Header 與 Sidebar 重複抓 `/api/auth/me`；頁面各自以原生 fetch 實作 loading/error/mutation。
- 處置：共享 DTO schema 與 typed API client；根層取得一次 session/context；採一致的 server fetch 或 TanStack Query（只在確實需要 client cache 時）。

#### ARCH-004：App layout 沒有區分登入與受保護區域

- Root layout 永遠 render Sidebar/Header，登入頁也套用應用殼層。
- 無 server-side redirect；目前僅靠 client fetch 與 UI 隱藏導覽。
- 處置：使用 route groups `(auth)`、`(app)`；`(app)/layout.tsx` server-side `requireUser()`，登入者/未登入者做明確 redirect。Middleware 可作 defense-in-depth，但 API handler 仍須獨立授權。

#### QUAL-001：品質門檻名存實亡

- `lint` script 會進互動精靈；無 formatter、測試、coverage、pre-commit 或 CI。
- `strict: true` 的價值被廣泛 `any` 抵消；`allowJs`、`skipLibCheck` 未說明理由。
- 處置：ESLint flat config + Next/TypeScript rules、Prettier、`tsc --noEmit`、測試、build、secret scan 全部納入非互動 CI。

### P3 / Medium：可靠性、體驗與治理

- 加入 `loading.tsx`、`error.tsx`、not-found、重試與可辨識的 empty/error state。
- 搜尋加入 debounce/AbortController；mutation 防重送並提供 optimistic rollback 或明確 pending state。
- 依 WCAG 2.2 AA 檢查 label、focus、keyboard、dialog、色彩對比與表格語意。
- 恢復 `reactStrictMode: true`，修正暴露出的 effect 問題。
- 統一 i18n、日期/時區與金額格式；正式規則不可硬編碼 Q3 目標、摘要文案與人名。
- 建立資料保存、匯出、刪除、PII 遮罩、稽核與最小權限政策。
- 文件分為 user guide、runbook、architecture decision record；刪除帳密、UUID、個人電腦路徑與「完成」但未驗證的宣稱。

## 4. 建議目標架構

維持單一 Next.js repository，但把 transport、application、domain、infrastructure 邊界建立起來。建議目錄如下：

```text
src/
  app/
    (auth)/
      login/page.tsx
      layout.tsx
    (app)/
      layout.tsx                 # server-side auth gate
      page.tsx
      contacts/
      sales/
      marketing/
      support/
      settings/
    api/
      .../route.ts               # thin adapter: parse -> authorize -> use case -> DTO
  features/
    auth/
      auth.service.ts
      auth.policy.ts
      auth.schemas.ts
      auth.types.ts
    contacts/
      contacts.service.ts
      contacts.repository.ts
      contacts.policy.ts
      contacts.schemas.ts
      contacts.dto.ts
      components/
    deals/
    leads/
    tickets/
    marketing/
    users/
    reports/
  server/
    db/prisma.ts
    http/errors.ts
    http/response.ts
    security/session.ts
    security/csrf.ts
    observability/logger.ts
  shared/
    contracts/
    ui/
    lib/
prisma/
  schema.prisma
  migrations/
  seed.reference.ts
  seed.demo.ts
tests/
  integration/
  e2e/
```

### 邊界規則

1. `app/api` 不可直接寫跨多實體流程；只做 HTTP adapter。
2. 授權必須在 application service 執行，不能只在 UI 或 route path 判斷。
3. Repository method 接受已解析的 scope，不可提供無限制 `findById` 給一般 use case。
4. API 只回傳 DTO；禁止直接回傳 Prisma model 或 `include: { user: true }`。
5. Feature 之間透過公開 service/contract 溝通，避免跨 feature 深層 import。
6. shared 只放真正跨域且穩定的 primitive；不要建立無邊界的 `utils` 垃圾桶。

## 5. 分階段執行計畫

### Phase 0：緊急圍堵（0–1 天）

- [ ] 暫停公開 tunnel，或先以 Cloudflare Access + MFA 限制受信使用者。
- [x] 移除匿名 ADMIN fallback；所有 API 在未登入時回 `401`。
- [ ] 使現有 Session 全部失效；輪替 repo/文件/seed 中出現的所有密碼。
- [x] 移除登入頁快速帳號與明文密碼；清理 README、handoff、plan、user guide。
- [x] 將 `.env`、`cookies.txt` 加入 `.gitignore`，提供無秘密的 `.env.example`；歷史清理與秘密輪替另列 SEC-003。
- [ ] 以 `git filter-repo` 清理歷史敏感資料，force-push 前通知所有協作者重新 clone；輪替優先於清歷史。
- [x] 對所有 User response 立即改成 allowlist select，封鎖任何 password 欄位輸出。
- [x] 升級到無已知 high/critical 的 Next.js/React 組合，或在升級完成前保持入口受限。

**已採用的首次啟用規則（2026-08-23）**：資料庫無使用者時，`/login` 開放一次性 bootstrap；第一位完成帳號、姓名、Email、密碼及確認密碼的人建立為 `ADMIN`/`ALL`。密碼沒有預設值且至少 12 字元；成功後初始化入口立即關閉。首次啟用期間必須以 Cloudflare Access 或受控內網限制訪客，避免「第一位外部訪客」搶先取得管理權。

**Phase 0 驗收**

- 無 Cookie、無效 Cookie、偽造 ADMIN Cookie皆回 `401`。
- `rg` 與 secret scanner 不再於目前 tree 找到真實密碼；歷史清理後重新掃描全 history。
- 所有 API response 與 build artifact 不含 `password`/`passwordHash`。
- `npm audit --omit=dev --audit-level=high` 無 high/critical，或有核准且有期限的 exception。

### Phase 1：認證與授權重建（2–5 天）

- [ ] 建立 Argon2id 密碼 hash migration；第一次安全登入可強制重設密碼。
- [x] 建立 `AuthSession` table 與 opaque token：每次登入簽發新 token、expiry、revocation、logout-all、lastSeenAt。
- [x] 建立 `requireUser`、`requireRole`、`authorize(action, resource)` 與 scope policy。
- [x] 定義完整 role × action matrix，至少涵蓋 list/read/create/update/delete/export/admin。
- [x] 所有現有 ID endpoint 補 object-level authorization 與外鍵 scope validation。
- [x] 登入加入持久化 identity/IP rate limit 與暫時封鎖；不保存原始帳號/IP 節流 key。
- [x] 建立登入、登出、授權拒絕與 mutation AuditEvent；IP 使用 keyed HMAC pseudonym，事件不依賴 User 外鍵。
- [ ] 管理角色啟用 MFA/SSO 或由 Cloudflare Access 強制 MFA。
- [x] State-changing request 加嚴格 Origin 防護；正式 Cookie 強制 Secure/HttpOnly/SameSite。

**Phase 1 驗收**

- 權限矩陣每一格都有 integration test；deny case 與 allow case都測。
- SALES 僅能讀/改自己的責任資料；SALES_MANAGER 可管理所屬區域；ORDER_ADMIN 可在所屬區域處理商機／訂單但不可管理帳號；MARKETING_MANAGER 僅管理市場部流程與專員；MARKETING/SUPPORT 只能執行核准動作。
- 停權、改角色、登出全部裝置後，舊 Session 立刻失效。
- 所有 mutation 產生 actor、action、resource、result、requestId 的 audit record。

### Phase 2：API 合約與資料一致性（3–6 天）

- [x] 所有 mutation 與核心 query 導入 Zod request schema、body/query 上限及統一 error envelope。
- [x] 建立 response schema 並在邊界驗證 DTO。
- [x] 建立 DTO allowlist；回應只包含頁面所需欄位。
- [x] 核心直接列表、Deal/Campaign/Workflow 聚合列表與 Contact 360 關聯資料加入 cursor pagination、查詢長度與 page size 上限；Account/Contact 列表與 Executive leaderboard 關聯改為 DB aggregate 摘要。排序 allowlist 仍列為後續工作。
- [x] Lead conversion、Deal/Activity、Contact/Activity、Ticket/Message 改成 transaction；成功 AuditEvent 與資料寫入同 transaction。
- [x] ticket number 改用年度原子 sequence；first response 使用 transaction + conditional update。
- [x] 為建立型 mutation 建立 24 小時持久化 idempotency key 與 replay contract；key hash、response 與資源寫入同 transaction。
- [x] Deal `Float` 金額遷移為 Decimal，彙總使用 Decimal 精確加總。
- [ ] 狀態欄位改 Prisma enum（目前 SQLite connector 不支援，必須與 PostgreSQL migration 同步完成）。
- [x] 建立 region/assignee/status/time/foreign-key 必要索引與 `Stage(pipelineId, order)` unique。
- [x] User 安全刪除政策完成；停用帳號無法登入或被重新指派。
- [ ] 補齊資料庫 check 與 default-pipeline 唯一邏輯；其他實體需定義 archive/retention policy。

**Phase 2 驗收**

- 任意非法 enum、日期、NaN、過長字串、未知欄位、不可見外鍵均回穩定 4xx，不寫入資料。
- 故障注入後，不會留下半完成 Lead conversion 或孤兒 activity/message。
- [x] 併發建立 100 張工單無編號碰撞（SQLite 以 FIFO 寫入序列化通過整合測試）。
- [x] 20 筆並行相同 idempotency key 只建立一份資源；不同 payload 回穩定 `409 IDEMPOTENCY_CONFLICT`。

### Phase 3：資料庫與部署基礎（3–7 天）

- [x] 建立 PostgreSQL generated schema、native enums、baseline migration 與 SQLite 原子搬遷工具；正式環境 cutover 仍待執行。
- [x] CI 以暫時 PostgreSQL 16 執行 migration from zero、status/drift、build 與 runtime/concurrency integration tests。
- [x] 建立 `migrate deploy`、health/readiness、cutover/rollback 操作手冊；immutable artifact 與自動 rollback 仍待完成。
- [ ] 將本機 Cloudflare 設定與單一 Windows 主機依賴改成可版本化的 IaC/runbook；機密放 secret manager。
- [x] 完成一次有證據的 PostgreSQL backup/restore drill 並定義 RPO/RTO；排程、加密、保留與離機副本仍待自動化。
- [x] destructive demo seed 在 `NODE_ENV=production` hard fail。
- [ ] 建立非破壞、可重跑的 reference seed。

**Phase 3 驗收**

- 全新環境可只靠文件與 automation 建置；無需個人電腦絕對路徑或手動改 DB。
- migration 可從空 DB 到最新版，也能在 staging 以 production-size sample data 完成。
- 完成一次有時間紀錄的備份還原演練，明確 RPO/RTO。

### Phase 4：模組化與前端整理（5–10 天，可逐 feature 漸進）

- [ ] 先抽 auth/session/policy，再依序抽 users、contacts、deals/leads、tickets、marketing、reports。
- [ ] Route Handler 瘦身，只保留 schema parse、policy call、service call、DTO response。
- [ ] 用 route groups 分開登入與應用 layout；session 在 server layout 取得一次。
- [ ] 大頁面拆成 feature components/hooks；以 Server Component 為預設，保留必要 client islands。
- [ ] 移除 `any`，從 schema/DTO 產生共享型別；建立 typed API client。
- [ ] 加入 loading/error/empty states、AbortController、debounce 與 mutation pending protection。
- [ ] 恢復 React Strict Mode，完成基本可及性檢查。

**Phase 4 驗收**

- 新增一個 use case 不需要在 page、route、Prisma 三處重複定義不一致型別。
- Domain/application service 可不啟動 Next.js 即單元測試。
- 頁面不直接依賴 Prisma 型別；敏感欄位無法經由型別進入 client bundle。
- 建議 page/component 上限 250 行、function 上限 60 行；超過須有具體理由。

### Phase 5：測試、CI 與可觀測性（5–8 天）

- [ ] Vitest：policy、validation、計算與 service unit tests。
- [ ] Integration：真實 PostgreSQL、Route Handler/service、migration、transaction、authorization。
- [ ] Playwright：登入、登出、角色隔離、核心 CRM happy path、錯誤與 recovery。
- [x] Security regression：匿名、角色矩陣、IDOR、跨區寫入、內部筆記、敏感 response、opaque Session expiry/revocation/logout-all、CSRF 與登入節流。
- [x] 基礎 CI：Node 22 locked install、Prisma generate/validate、lint、typecheck、unit、SQLite security integration、build、dependency audit。
- [ ] 進階 CI：真實 PostgreSQL migration/integration、Playwright smoke、gitleaks、CodeQL。
- [ ] structured logging、request ID、錯誤追蹤、latency/error/auth metrics、關鍵 audit dashboard 與 alert。

**Phase 5 驗收**

- PR 未通過任何 gate 不可合併；CI 全程非互動且可重現。
- access-control policy decision branches 100% 覆蓋；核心 application layer line/branch coverage 至少 80%。
- 5xx、登入異常、權限拒絕突增、DB pool、慢查詢、備份失敗都有告警與 owner。

## 6. 最小 CI Gate

```json
{
  "scripts": {
    "format:check": "prettier --check .",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "db:validate": "prisma validate",
    "db:migrate:check": "prisma migrate diff ...",
    "security:audit": "npm audit --omit=dev --audit-level=high",
    "check": "npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build"
  }
}
```

上例是目標，不應直接複製 `...` 佔位符進 package.json。migration check 應在 CI 依實際 shadow/test DB 設定為可執行命令。

## 7. 第一批可直接開工的工作單

| ID | 工作 | 優先級 | 預估 | 依賴 | Done 定義 |
|---|---|---:|---:|---|---|
| CRM-SEC-001 | 關閉匿名 ADMIN fallback | P0 | 0.5d | 無 | 所有匿名 API 401；測試覆蓋 |
| CRM-SEC-002 | User DTO allowlist、封鎖密碼輸出 | P0 | 0.5–1d | 無 | 全 API/巢狀 relation 無敏感欄位 |
| CRM-SEC-003 | 輪替/移除 repo 帳密與快速登入 | P0 | 1d | 協作者通知 | tree/history scan 通過、所有舊密碼無效 |
| CRM-SEC-004 | opaque session + Argon2id | P0 | 2–3d | DB migration | 可撤銷/輪替/過期；Cookie 安全旗標 |
| CRM-SEC-005 | 統一 policy 與 role/action matrix | P0 | 2–4d | SEC-004 | 全 endpoint default-deny；矩陣測試 |
| CRM-DEP-001 | Next/React 安全升級 | P0 | 1–3d | regression tests | audit 無 high/critical、build/e2e 通過 |
| CRM-API-001 | Zod + DTO + error envelope | P1 | 2–4d | policy interface | 核心 endpoint 套用 contract |
| CRM-DATA-001 | 核心流程 transaction/idempotency | P1 | 2–3d | schemas | 故障與併發測試通過 |
| CRM-DB-001 | PostgreSQL baseline migrations | P1 | 2–4d | data decisions | 空 DB migration + staging migration 通過 |
| CRM-QA-001 | ESLint/Vitest/Playwright/CI | P1 | 3–5d | 可平行 | PR gates 可重現、非互動 |
| CRM-ARCH-001 | Route groups + protected layout | P2 | 1–2d | session | `/login` 無 app shell；受保護頁 server redirect |
| CRM-ARCH-002 | 依 feature 漸進拆分巨型頁面 | P2 | 5–10d | contracts | 無跨層 Prisma 型別與大範圍 `any` |
| CRM-OPS-001 | 備份/還原/health/observability | P2 | 3–5d | production DB | restore drill 與 alert 驗證完成 |

## 8. 發布 Go/No-Go 檢查表

以下任一項未完成即為 **No-Go**：

- [x] 匿名、偽造、過期、撤銷 Session 無法取得任何受保護資料。
- [x] 全 role/action/resource 權限矩陣有自動化測試。
- [ ] Password 只以 Argon2id hash 保存，且不出現在任何 API、log、文件或 Git history。
- [x] 無已知 high/critical production dependency 漏洞，或有正式核准的短期例外與到期日。
- [ ] 所有 migration 在 staging 驗證，且有 rollback/roll-forward 決策。
- [ ] 最近一次備份與 restore drill 成功，RPO/RTO 符合要求。
- [ ] lint、typecheck、unit、integration、e2e smoke、build、secret scan 全部通過。
- [ ] 5xx/auth anomaly/backup failure 告警已實際觸發驗證。
- [ ] Cloudflare Access/WAF/TLS/secure cookie/security headers 已驗證。
- [ ] production seed/reset 不可能在一般部署流程被誤觸。

## 9. 明確不建議的作法

1. 不要只加 middleware 就宣稱安全；Route Handler 與 service 仍必須獨立授權。
2. 不要只對 JSON Cookie 加 Base64；Base64 不是簽章，也無法撤銷。
3. 不要執行 `npm audit fix --force` 後直接上線；major migration 必須跑權限與核心流程 regression。
4. 不要在尚無 transaction/constraint/test 時先拆 microservices；會放大一致性與部署成本。
5. 不要把 TypeScript build 通過視為 API 安全；runtime input 與 response 都需要 schema。
6. 不要以 UI 隱藏按鈕代替 authorization。
7. 不要在 production 使用 `prisma db push`、destructive demo seed 或未演練的 SQLite 單檔備份。
8. 不要只從目前 branch 刪密碼；一旦進入 Git history，必須先輪替，再清歷史與通知協作者。

## 10. 最終建議

本專案最合理的演進路線不是重寫，而是先「封鎖與重建信任邊界」，再以垂直切片逐 feature 整理。建議排序固定為：

> **入口圍堵 → 身份與 Session → 密碼/DTO → 授權矩陣 → runtime validation → transaction/constraint → migration/production DB → tests/CI → 模組化與 UX → observability/DR**

在 P0、P1 完成前，任何新功能都只會擴大攻擊面與重構成本。當 Phase 0–3 的驗收條件全部通過後，才可把專案定位從 prototype 提升為受控的 internal beta；完成 Phase 5、備份還原與正式安全驗證後，才應考慮 production Go-Live。
