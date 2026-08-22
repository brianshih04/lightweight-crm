# NexCRM - 輕量級企業客戶關係管理系統

一個基於 **Next.js (App Router) + TypeScript + Tailwind CSS + PostgreSQL / Prisma** 打造的現代化輕量級 Web CRM 系統。專為中小型企業與團隊設計，無繁複配置，開箱即用。

---

## 🌟 核心功能支柱

### 1. 👥 客戶 360 度統一視圖 (Customer Hub)
* **企業客戶 (Accounts) 與 聯絡人 (Contacts)**：支援自訂標籤與動態 JSON 擴充欄位。
* **統一活動時間軸 (Timeline)**：跨部門共享客戶的所有互動歷史（拜訪筆記、通話、商機進展、客服工單與行銷紀錄）。

### 2. 💼 銷售管理 (Sales Force Automation - SFA)
* **視覺化商機看板 (Kanban Pipeline)**：支援拖曳切換商機階段，即時統計各階段金額與成交機率。
* **潛在線索 (Leads)**：評估意向分數（Lead Scoring），支援一鍵轉換為正式客戶與商機。
* **銷售漏斗與預測**：視覺化掌握各階段轉換率與預期結案業績。

### 3. 📣 行銷自動化 (Marketing Automation)
* **受眾動態分群 (Audience Segmentation)**：依屬性與行為標籤精準過濾目標受眾。
* **EDM 範本與行銷活動**：支援動態變數置換（`{{contact.name}}`），追蹤發送數、開信率與點擊率。
* **事件觸發型自動化工作流**：例如「新線索進單 → 自動發送歡迎信 → 24 小時內建立業務跟進任務」。

### 4. 🎧 客戶服務與售後支援 (Customer Support & Service)
* **集中式工單收件箱 (Ticket Inbox)**：多維度狀態（Open、In Progress、Resolved）與優先級篩選。
* **公開回覆 vs 內部備忘**：客服公開回信與內部團隊協作筆記分離，保護內部溝通隱私。
* **SLA 時效預警**：即時計算逾期倒數，避免漏失客戶請求。

---

## 🛠️ 技術架構

* **前端框架**：Next.js 14 (App Router) + React 18
* **樣式與元件**：Tailwind CSS + Lucide Icons + Radix UI 風格
* **圖表與視覺化**：Recharts
* **拖曳互動**：@dnd-kit (Kanban Board)
* **ORM & 資料庫**：Prisma ORM + SQLite (本地快速開發) / PostgreSQL (生產環境)

---

## 🚀 快速開始

### 1. 安裝相依套件
```bash
npm install
```

### 2. 資料庫初始化與建立資料表
```bash
npx prisma db push
```

### 3. 匯入豐富的展示資料 (Seed Data)
```bash
npm run db:seed
```

### 4. 啟動開發伺服器
```bash
npm run dev
```

開啟瀏覽器並造訪 [http://localhost:3000](http://localhost:3000) 即可使用系統。
