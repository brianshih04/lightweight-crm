# NexCRM - 輕量級企業客戶關係管理系統 (Lightweight CRM)

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Cloudflare Tunnel](https://img.shields.io/badge/Cloudflare-Tunnel-F38020?style=flat&logo=cloudflare)](https://www.cloudflare.com/)

一個專為企業自用打造的現代化輕量級 Web CRM 系統。整合**人員與區域管理**、**分區嚴格隔離**、**總經理營運決策報表**、**銷售自動化 (SFA)**、**客戶 360 度統一視圖**、**行銷自動化**與**客戶服務支援**。

---

## 🌐 系統存取與正式網址

* 🔗 **正式對外網址 (Cloudflare SSL)**：**[https://crm.avision-gb10.org](https://crm.avision-gb10.org)**
* 🔑 **登入頁面 (Login)**：**[https://crm.avision-gb10.org/login](https://crm.avision-gb10.org/login)**
* 👥 **人員與負責區域管理**：**[https://crm.avision-gb10.org/settings/users](https://crm.avision-gb10.org/settings/users)**
* 📊 **總經理決策分析報表**：**[https://crm.avision-gb10.org/reports](https://crm.avision-gb10.org/reports)**
* 🐙 **GitHub 程式碼倉庫**：**[https://github.com/brianshih04/lightweight-crm](https://github.com/brianshih04/lightweight-crm)**

---

## 🔐 預設帳號與身分切換一覽表

系統登入頁面具備「**一鍵快速切換身分**」面板，方便快速驗證不同層級的權限與分區隔離效果：

| 角色類別 | 成員姓名 | 登入帳號 (Username) | 預設密碼 (Password) | 責任區域 (Territory) | 權限與資料隔離說明 (Data Scope) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 🛠️ **系統管理員 (Admin)** | **系統管理員** | `admin` | **`Avi22099759`** | **全區 (ALL)** | **系統最高管理**：負責建立所有人員帳號、指派各 Sales 負責區域與直屬主管、管理系統配置與查看全貌。 |
| 👑 **總經理 (GM / CEO)** | **柯博文 (Peter)** | `peter_gm` | `peter123` | **全區總覽 (ALL)** | **全域業務決策**：可查看全公司所有區域的商機、客戶、工單，檢視總經理決策分析報表與各區業績排行榜。 |
| 🏢 **北部業務處主管** | **張雅婷 (Alice)** | `alice_mgr` | `alice123` | **北部 (NORTH)** | **轄區全貌**：可檢視北部區域所有商機、客戶，以及其下屬業務（Kevin）的業績與推進進度。 |
| 💼 **北部業務代表** | **林凱文 (Kevin)** | `kevin_sales` | `kevin123` | **北部 (NORTH)** | **個人責任區**：僅能檢視北部其個人負責之商機、線索與客戶。 |
| 💼 **中部資深業務** | **李宗翰 (Bob)** | `bob_sales` | `bob123` | **中部 (CENTRAL)** | **個人責任區**：僅能檢視中部地區之商機與客戶。 |
| 💼 **南部業務代表** | **趙冠宇 (Charlie)** | `charlie_sales` | `charlie123` | **南部 (SOUTH)** | **個人責任區**：僅能檢視南部地區之商機與客戶。 |
| 💼 **海外商務總監** | **孫佩華 (Sophia)** | `sophia_sales` | `sophia123` | **海外 (OVERSEAS)** | **個人責任區**：僅能檢視海外亞太區之商機與客戶。 |
| 📣 **行銷企劃主管** | **陳品妤 (Carol)** | `carol_mkt` | `carol123` | **全區 (ALL)** | 專屬行銷活動、動態受眾分群與自動化工作流。 |
| 🎧 **客服支援組長** | **王建宏 (David)** | `david_support` | `david123` | **全區 (ALL)** | 專屬售後工單收件箱、SLA 時效監控與雙軌回覆模式。 |

---

## 🌟 六大核心功能模組

### 1. 👥 人員帳號與負責區域管理 (`/settings/users`)
* **Admin 專屬管理面板**：建立新成員帳號，設定 Username 與 Password。
* **分區指派**：配置每位業務之負責區域（北部、中部、南部、海外、全區）與直屬業務主管。
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
* **跨部門統一活動時間軸 (Timeline)**：整合通話、拜訪筆記、商機進展、客服工單與行銷歷程。

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

* **前端框架**：Next.js 14 (App Router) + React 18
* **樣式設計**：Tailwind CSS + Lucide React
* **圖表視覺化**：Recharts
* **拖曳互動**：@dnd-kit (Kanban Board)
* **ORM & 資料庫**：Prisma ORM + SQLite (本地快速開發) / PostgreSQL (生產環境)
* **身分驗證**：Cookie-based Session Authentication (`crm_auth_session`)
* **外網通道**：Cloudflare Tunnel (`crm-gb10` -> `https://crm.avision-gb10.org`)

---

## 🚀 快速開始 (Quick Start)

### 1. 安裝相依套件
```bash
npm install
```

### 2. 資料庫結構初始化
```bash
npx prisma db push
```

### 3. 匯入完整測試帳號與展示資料
```bash
npm run db:seed
```

### 4. 啟動開發或生產伺服器
```bash
# 開發模式
npm run dev

# 或 生產模式
npm run build
npm run start
```

開啟瀏覽器造訪 `http://localhost:3000/login` 或 `https://crm.avision-gb10.org/login` 即可開始體驗。

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
│   │   ├── login/             # 登入頁面 (含一鍵快速測試身分切換)
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
│       ├── auth.ts            # RBAC 認證中介與分區資料過濾引擎
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
