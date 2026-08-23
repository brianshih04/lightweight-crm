# NexCRM - 系統開發規劃與架構設計書 (Development Plan & Architecture)

---

## 📌 1. 專案背景與需求規劃 (Project Background & Requirements)

### 1.1 專案定位
NexCRM 是一套為企業自用設計的現代化、輕量級全功能 Web-based 客戶關係管理系統。系統旨在克服傳統大型 CRM 笨重、配置繁瑣、授權高昂的痛點，以最簡潔直覺的介面整合**銷售管理 (SFA)**、**行銷自動化 (Marketing)**、**客戶服務 (Support)** 與 **高階決策分析 (Executive Reports)**。

### 1.2 核心業務需求矩陣
1. **單一企業自用，輕量敏捷**：無多租戶冗餘負擔，架構簡潔直觀。
2. **多區域與階層組織架構**：支援北部 (NORTH)、中部 (CENTRAL)、南部 (SOUTH)、海外 (OVERSEAS) 與全區 (ALL)。
3. **多人獨立帳號密碼登入 (Authentication)**：每位業務與員工皆有自己的 Username 與 Password。
4. **嚴格分區權限與資料隔離 (Data Scoping)**：
   * **Sales (業務員)**：僅能檢視與操作自己負責區域的資料。
   * **Sales Manager (業務主管)**：能檢視該區域下所有下屬業務的商機與進展。
   * **Admin (系統管理者)**：獨立負責人員組織架構配置、責任區域分配與系統維護。
   * **GM (總經理)**：獨立高階決策帳號，具備全公司穿透視角與決策報表。
5. **總經理決策分析報表 (Executive Decision Reports)**：提供目標達成率、分區營運績效矩陣、業務排行榜與可列印視圖。
6. **Cloudflare 對外發布**：綁定正式域名 `crm.avision-gb10.org`，支援遠端安全訪問。
7. **開源版本控管**：同步維護於 GitHub `https://github.com/brianshih04/lightweight-crm`。

---

## 🏗️ 2. 系統架構與技術棧 (Architecture & Tech Stack)

```mermaid
graph TD
    Client["瀏覽器客戶端 (Web / Mobile Browser)"]
    Cloudflare["Cloudflare Edge Network (HTTPS SSL)"]
    Tunnel["Cloudflared Tunnel (crm-gb10)"]
    NextServer["Next.js 14 App Router (Node.js)"]
    AuthModule["Auth & RBAC Scoping Engine"]
    PrismaORM["Prisma ORM"]
    DB[(SQLite / PostgreSQL DB)]

    Client -->|HTTPS 443| Cloudflare
    Cloudflare -->|QUIC / gRPC| Tunnel
    Tunnel -->|HTTP 3000| NextServer
    NextServer --> AuthModule
    AuthModule --> PrismaORM
    PrismaORM --> DB
```

### 2.1 前端層 (Frontend Layer)
* **核心框架**：Next.js 14 (App Router) + React 18
* **樣式庫**：Tailwind CSS (響應式設計 + 現代化微圓角/毛玻璃質感)
* **圖示庫**：Lucide React
* **圖表視覺化**：Recharts
* **拖曳互動**：@dnd-kit (核心支援 Kanban 商機看板拖曳)

### 2.2 後端與服務層 (Backend & Service Layer)
* **API 架構**：Next.js Route Handlers (RESTful JSON APIs)
* **認證機制**：Cookie-based Session Authentication (`crm_auth_session`)
* **資料庫 ORM**：Prisma ORM 5.x
* **資料庫引擎**：SQLite (本地極速開發) / PostgreSQL (生產高併發部署)

### 2.3 網路與部署層 (Network & Deployment)
* **安全通道**：Cloudflare Tunnel (`cloudflared`)，無需對外開啟防火牆連接埠
* **正式網域名稱**：`crm.avision-gb10.org` (支援 Auto SSL 憑證)

---

## 🗄️ 3. 資料庫實體關聯模型 (Data Model / Prisma Schema)

```mermaid
erDiagram
    USER ||--o{ USER : "reports to (manager)"
    USER ||--o{ DEAL : "assigned to"
    USER ||--o{ LEAD : "assigned to"
    USER ||--o{ TICKET : "assigned to"
    USER ||--o{ ACTIVITY : "created by"

    ACCOUNT ||--o{ CONTACT : "has"
    ACCOUNT ||--o{ DEAL : "has"
    ACCOUNT ||--o{ TICKET : "has"
    ACCOUNT ||--o{ ACTIVITY : "logs"

    CONTACT ||--o{ DEAL : "associated"
    CONTACT ||--o{ TICKET : "associated"
    CONTACT ||--o{ ACTIVITY : "timeline"

    PIPELINE ||--|{ STAGE : "contains"
    STAGE ||--o{ DEAL : "categorizes"

    TICKET ||--o{ TICKET_MESSAGE : "contains"
```

### 核心實體說明：
1. **`User` (使用者與組織)**：`id`, `username`, `password`, `name`, `email`, `role`, `department`, `region`, `title`, `managerId`。
2. **`Account` (企業客戶)**：`id`, `name`, `industry`, `region`, `phone`, `address`, `customFields`。
3. **`Contact` (客戶聯絡人)**：`id`, `name`, `email`, `phone`, `title`, `region`, `tags`, `accountId`。
4. **`Lead` (潛在線索)**：`id`, `name`, `company`, `email`, `phone`, `region`, `source`, `score`, `status`, `assignedToId`。
5. **`Pipeline` & `Stage` (銷售管線與階段)**：階段順序、代表顏色、成交機率 (Probability)。
6. **`Deal` (商機)**：`id`, `title`, `value`, `currency`, `region`, `stageId`, `contactId`, `accountId`, `assignedToId`, `status`。
7. **`Ticket` & `TicketMessage` (售後工單與雙軌對話)**：`ticketNumber`, `subject`, `status`, `priority`, `region`, `slaDueAt`, `isInternal`。
8. **`Activity` (統一活動時間軸)**：跨部門活動紀錄（會議、電話、階段變更、信件）。
9. **`Campaign` & `Workflow` (行銷活動與工作流程)**：動態受眾分群、觸發器與排程推播。

---

## 🛡️ 4. 角色權限與區域隔離設計 (RBAC & ABAC Security Architecture)

系統後端採用統一的安全中介模組 (`src/lib/auth.ts`)，在所有 API 請求執行前進行使用者鑑權與資料範圍過濾：

```
+---------------------------------------------------------------------------------------------------------+
| 使用者角色 (Role)    | 負責區域 (Region) | 資料檢視與操作範圍 (Scope Filter)                                   |
+---------------------------------------------------------------------------------------------------------+
| ADMIN (系統管理者)    | ALL               | 全公司穿透視角；可存取 /settings/users 建立與管理所有成員及責任區域 |
| GM (總經理)          | ALL               | 全公司穿透視角；可存取 /reports 決策報表與業績排行榜                |
| SALES_MANAGER (業務主管)| NORTH / CENTRAL...| 僅限所屬區域；可查看該區域下所有下屬業務代表的商機與進展            |
| SALES (業務代表)      | NORTH / CENTRAL...| 僅限所屬區域且指派給個人的商機與客戶 (assignedToId = user.id)       |
| MARKETING (行銷專員)  | ALL               | 行銷推播、受眾分群與工作流管理                                      |
| SUPPORT (客服專員)    | ALL               | 售後工單收件箱、SLA 監控與工單回覆                                  |
+---------------------------------------------------------------------------------------------------------+
```

---

## 🚀 5. 模組開發里程碑與完成進度 (Development Milestones)

| 里程碑階段 | 模組名稱 | 核心功能與成果 | 狀態 |
| :--- | :--- | :--- | :---: |
| **Phase 1** | **需求規劃與核心 SFA 看板** | 需求分析、Prisma Schema 設計、視覺化 Kanban 看板、線索評分與一鍵轉換 | ✅ 完成 |
| **Phase 2** | **客戶 360 與統一時間軸** | 企業客戶 (Accounts)、聯絡人 (Contacts)、跨模組 Activity 統一時間軸 | ✅ 完成 |
| **Phase 3** | **行銷自動化與客服工單** | 受眾分群、EDM 活動推播、工作流程引擎、工單收件箱、SLA 預警、雙軌回覆 | ✅ 完成 |
| **Phase 4** | **遠端部署與版本控管** | GitHub 倉庫建立、Cloudflare Tunnel 配置、綁定 `crm.avision-gb10.org` | ✅ 完成 |
| **Phase 5** | **多區域與總經理決策報表** | 北中南海外分區支援、`/reports` 總經理決策分析報表、分區營運矩陣 | ✅ 完成 |
| **Phase 6** | **認證權限與人員分區管理** | Admin 密碼 `Avi22099759`、GM 獨立帳號、`/settings/users` 人員與區域管理 | ✅ 完成 |

---

## 📡 6. 後端 API 規格表 (RESTful Endpoints)

| 方法 | 路徑 | 存取權限 | 功能說明 |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | 公開 | 驗證帳號密碼，簽發 `crm_auth_session` Cookie |
| `POST` | `/api/auth/logout` | 公開 | 清除 Session Cookie 登出 |
| `GET` | `/api/auth/me` | 已登入 | 取得當前登入者資訊與責任區域 |
| `GET` | `/api/users` | 已登入 | 取得組織人員名單與主管階層關聯 |
| `POST` | `/api/users` | Admin / GM | 建立新成員帳號並指派負責區域與主管 |
| `PATCH`| `/api/users/[id]` | Admin / GM | 編輯人員資料、重設密碼與調整責任區域 |
| `DELETE`| `/api/users/[id]` | Admin / GM | 刪除指定成員帳號 (保護 Admin 不被刪除) |
| `GET` | `/api/reports/executive` | GM / Admin / Manager | 取得高階營運指標、分區矩陣與業務排行榜 |
| `GET` | `/api/deals` | 依角色過濾 | 取得銷售管線階段與商機列表 (自動區域隔離) |
| `POST` | `/api/deals` | 業務人員 | 建立新商機並關聯客戶與區域 |
| `PATCH`| `/api/deals` | 業務人員 | 拖曳切換商機階段或更新狀態 |
| `GET` | `/api/leads` | 依角色過濾 | 取得潛在線索列表 (自動區域隔離) |
| `POST` | `/api/leads` | 業務人員 | 建立新線索或一鍵轉換為客戶與商機 |
| `GET` | `/api/contacts` | 依角色過濾 | 搜尋與取得聯絡人資料 |
| `POST` | `/api/contacts` | 業務人員 | 建立新聯絡人並寫入活動紀錄 |
| `GET` | `/api/accounts` | 依角色過濾 | 取得企業客戶資料與關聯商機工單 |
| `GET` | `/api/tickets` | 客服 / 全員 | 取得工單列表與 SLA 到期狀態 |
| `POST` | `/api/tickets/[id]` | 客服人員 | 發布公開回覆或內部協作筆記 |

---

## 🌐 7. 網路拓撲與 Cloudflare Tunnel 部署架構

1. **本機服務**：Next.js Production 服務監聽於 `http://localhost:3000`。
2. **Cloudflare Connector**：
   * Tunnel UUID: `e069e611-2795-4929-9d40-486db6c1784c`
   * 設定檔路徑: `C:\Users\Brian\.cloudflared\config-crm.yml`
   * Ingress 規則: `hostname: crm.avision-gb10.org` -> `service: http://localhost:3000`
3. **DNS 路由**：CNAME `crm.avision-gb10.org` 路由至 Cloudflare Edge Anycast 網路，享有全自動 SSL 加密保護。

---

## 🔮 8. 未來升級規劃與功能藍圖 (Phase 7+ Roadmap)

* [ ] **真實 SMTP / SendGrid 郵件發送整合**：串接企業專屬 SMTP 伺服器，直接對外發送真實行銷活動信件。
* [ ] **LINE Official Account & WhatsApp Webhook 串接**：將客戶社群訊息即時轉化為客服工單與潛在線索。
* [ ] **行動端 PWA (Progressive Web App)**：支援外勤業務手機離線查閱客戶與即時打卡備忘。
* [ ] **AI 銷售預測與 Copilot 助手**：透過 LLM 自動分析客戶對話摘要並預測商機結案機率。

---
*NexCRM 架構研發小組 · 2026*
