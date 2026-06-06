====================================================================
Project: Pet Grooming & Boarding System - Receptionist Check-in
Architecture: Serverless Cloud-Native (Vercel + Firebase Firestore)
Author: 葉采瑩 (411277029)
Date: 2026-06
====================================================================

【1. 系統架構說明 (System Architecture)】
本系統採用現代化的 Serverless (無伺服器) 全端架構實作，以完美對應設計階段的 UML 圖表：
- 前端 (Frontend): HTML5, CSS3, Vanilla JavaScript (ES6 Modules)
- 後端與資料庫 (Backend & Database): Google Firebase Cloud Firestore (BaaS)
- 部署環境 (Deployment): 透過 Vercel 進行雲端託管

本系統去除了傳統的本地端伺服器 (如 Python/Flask)，前端直接透過 Firebase Web SDK (v10) 與雲端資料庫進行即時連線，實現高可用性與低延遲的資料同步。


【2. 專案檔案結構 (File Structure)】
- index.html   : 系統前端介面 (UI)，包含搜尋框、按鈕與今日預約總表。
- app.js       : 核心業務邏輯，包含 Firebase 初始化、API 請求，以及實作 Sequence Diagram 與 State Diagram 中的狀態切換邏輯。
- Readme.txt   : 本說明文件。


【3. 核心功能與 UML 對應關係 (Features & Traceability)】
1. 預約總表即時讀取：
   - 網頁載入時自動向 Firestore 的 `bookings` 集合發送請求，展示所有資料。
2. 飼主預約查詢 (對應 Sequence Diagram: Request booking data)：
   - 輸入 Owner ID 即可透過 `where` 查詢條件，精準抓取對應的預約單。
3. 疫苗檢核邏輯 (對應 Sequence Diagram: alt Vaccine Expired/Valid)：
   - 實作前端 if/else 判斷。若選擇「過期」，系統將觸發 Reject Warning (拒絕報到)。
   - 若選擇「有效」，則發送 `updateDoc` 請求至資料庫。
4. 狀態機切換 (對應 State Diagram: Confirmed -> CheckedIn / Cancelled)：
   - 提供「確認報到」與「取消預約」功能，點擊後會即時修改雲端資料庫的 `status` 屬性，並同步更新畫面。


【4. 執行與測試方式 (How to Run)】

[方法 A：雲端線上測試 (推薦)]
本專案已部署至雲端，可直接點擊下方連結進行測試，無需配置本地環境：
線上連結：[請在這裡貼上你剛剛 Vercel 生出來的網址，例如 https://pet-system-xxx.vercel.app]

[方法 B：本地開發環境測試 (Local Development)]
由於本專案採用了 ES6 Modules (`type="module"`) 引入 Firebase SDK，直接雙擊打開 index.html 可能會遇到瀏覽器的 CORS 安全限制。
請依下列步驟執行：
1. 使用具備 Live Server 功能的編輯器 (如 PyCharm 內建的瀏覽器預覽，或 VS Code 的 Live Server 擴充套件)。
2. 啟動 Local Server 後開啟 `index.html`。
3. 確保測試電腦具備網路連線，系統將自動連線至 Firebase 雲端資料庫抓取測試資料。

====================================================================