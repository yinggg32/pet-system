# 🐾 汪喵精品旅館 — Pet Hotel Booking System

一個為寵物旅館量身打造的全端預約管理系統，支援顧客線上預約、即時訊息溝通、員工後台管理，以及即時空位日曆查詢。

**Live Demo：** [pet-system-puce.vercel.app](https://pet-system-puce.vercel.app)

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | HTML5 / CSS3 / Vanilla JavaScript (ES Module) |
| 資料庫 | Firebase Cloud Firestore |
| 部署 | Vercel（連接 GitHub 自動部署） |
| 字型 | Google Fonts（Playfair Display、Noto Serif TC） |

---

## 功能總覽

### 顧客端（`index.html` + `customer.js`）

**品牌首頁**
- 全螢幕 Hero 大圖，進場縮放動畫
- 固定頂部 Navbar，滾動不消失
- 服務介紹卡片（洗澡美容 / 星級住宿）
- 六格特色賣點區塊
- 顧客評價牆
- LINE 浮動客服按鈕
- 滾動進場動畫（Scroll Reveal）
- 完整 RWD 響應式設計（768px / 480px 斷點）

**即時空位日曆**
- 美容 / 住宿雙模式切換
- 綠色（有空位）/ 黃色（剩少量）/ 紅色（已滿）/ 灰色（已過去）
- 點擊可用日期自動跳轉預約區並帶入日期

**會員系統**
- 手機號碼 + 密碼註冊 / 登入
- 資料儲存於 Firestore `members` 集合

**寵物檔案**
- 建立多筆寵物資料（名字、種類、品種、生日、過敏史、疫苗日期）
- 預約時直接從下拉選單帶入，不用每次重填
- 生日 / 疫苗日期限制不能選未來

**線上預約**
- 洗澡美容：選日期 + 時段（已預約時段自動顯示「已被預約」並 disabled）
- 星級住宿：選入住 / 退房日期，支援加購退房前美容
- 倉鼠 / 兔子自動過濾掉洗澡美容選項
- 防撞機制：美容看時段、住宿看房間數，兩者完全獨立
- 預約日期限制不能選過去

**預約紀錄**
- 顯示所有預約，支援取消（Pending / Confirmed 狀態）
- 狀態 Badge 色碼：橘（Pending）/ 藍（Confirmed）/ 綠（CheckedIn）/ 紫（Completed）/ 紅（Cancelled）

**站內訊息**
- 預約成功 / 取消自動發系統通知
- 顧客可與旅館即時對話
- 未讀訊息紅色數字 Badge 提示
- 即時更新（Firebase `onSnapshot`）

---

### 員工後台（`admin.html` + `admin.js`）

**登入**
- 密碼驗證（`admin123`）

**預約管理**
- 全客戶預約紀錄總表，按狀態排序（Pending 優先）
- 搜尋功能（飼主手機號碼 / 寵物名字）
- 快速確認接受（Pending → Confirmed）
- 辦理手續流程：讀取詳情 → 疫苗核對（住宿）→ Check-in / 完成
- 按鈕文字依服務類型動態切換（美容 vs 住宿）
- 刪除單筆（僅 Cancelled / Completed）
- 批次清除已取消 / 已完成紀錄

**寵物檔案總覽**
- 查閱所有顧客的寵物資料
- 過敏史有填寫自動標紅字提醒
- 搜尋功能（飼主手機 / 寵物名）

**顧客訊息**
- 左側顧客列表，有未讀排最上面
- 右側即時對話框
- 員工回覆後顧客端即時收到
- 各操作（確認 / 入住 / 完成 / 取消）自動發系統訊息給顧客

**系統設定**
- 住宿房間數上限（儲存至 Firestore `settings/capacity`）
- 即時生效，日曆空位計算同步更新

---

## Firestore 資料結構

```
members/{phone}
  name, phone, password

pets/{phone_petName}
  ownerId, petName, petType, breed, birthday, allergy, vaccine

bookings/{id}
  ownerId, petId, petName, petType, service, date, time
  addOn, status, createdAt, confirmedAt

messages/{id}
  ownerId, bookingId, sender, content, createdAt, read

settings/capacity
  boardingRooms
```

---

## 預約狀態流程

```
Pending → Confirmed → CheckedIn（住宿）
                    → Completed（美容）
        → Cancelled（任一階段可取消）
```

---

## 本地開發

此專案為純靜態網站，不需要 Node.js 或打包工具。

```bash
# Clone 專案
git clone https://github.com/your-repo/pet-system.git
cd pet-system

# 直接用 Live Server 或任意靜態伺服器開啟
# VS Code 安裝 Live Server 擴充，右鍵 index.html → Open with Live Server
```

> Firebase 設定已內嵌於 JS 檔案中，clone 後可直接使用同一個 Firestore 資料庫。

---

## 專案結構

```
├── index.html       # 顧客端首頁
├── customer.js      # 顧客端邏輯（Auth、預約、寵物檔案、訊息、日曆）
├── admin.html       # 員工後台
├── admin.js         # 後台邏輯（預約管理、訊息、設定）
├── grooming.png     # 洗澡美容服務圖片
├── boarding.png     # 星級住宿服務圖片
├── hotel.png        # Hero 封面圖片
└── README.md
```

---

## 開發紀錄

本系統從零開始迭代開發，主要功能里程碑：

- ✅ 基礎預約系統（美容 / 住宿）
- ✅ Firebase Auth + Firestore 整合
- ✅ 品牌首頁改版（官網風格）
- ✅ 寵物種類過濾（倉鼠 / 兔子不能美容）
- ✅ 寵物健康檔案系統
- ✅ Admin 確認接受流程（Pending → Confirmed）
- ✅ 雙模式即時空位日曆
- ✅ 修正防撞機制（美容 / 住宿獨立計算）
- ✅ 美容時段 disabled 標示
- ✅ 站內即時訊息系統
- ✅ Admin 寵物檔案總覽 + 搜尋
- ✅ 住宿房間數設定
- ✅ 歷史資料刪除 / 批次清除
- ✅ RWD 手機版響應式設計
- ✅ LINE 客服浮動按鈕