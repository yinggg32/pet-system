// 引入 Firebase 10.8.0 模組化 SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// (選擇性) 如果你想保留 Analytics，也可以把它加進來
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// 你專屬的 Firebase 設定檔
const firebaseConfig = {
  apiKey: "AIzaSyCBSj96SOqhiQgMjOHoku3ARM52FAp5qyg",
  authDomain: "pet-system-609ed.firebaseapp.com",
  projectId: "pet-system-609ed",
  storageBucket: "pet-system-609ed.firebasestorage.app",
  messagingSenderId: "1025593733737",
  appId: "1:1025593733737:web:542bb4a633d6e88b0fe8f8",
  measurementId: "G-1216ND27PK"
};

// 初始化雲端服務
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// const analytics = getAnalytics(app); // 暫時不需要可註解掉

// 註冊事件監聽器
document.getElementById('searchBtn').addEventListener('click', searchBooking);
window.addEventListener('DOMContentLoaded', fetchAllBookings);

// ----------------------------------------------------------------------
// 功能 A: 從 Firebase Firestore 讀取所有預約資料 (今日預約總表)
// ----------------------------------------------------------------------
async function fetchAllBookings() {
    try {
        const querySnapshot = await getDocs(collection(db, "bookings"));
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        querySnapshot.forEach((documentSnapshot) => {
            const booking = documentSnapshot.data();
            let statusColor = booking.status === 'Cancelled' ? '#d9534f' : (booking.status === 'CheckedIn' ? '#5cb85c' : '#333');
            tbody.innerHTML += `
                <tr>
                    <td>${booking.bookingId}</td>
                    <td>${booking.petName}</td>
                    <td style="color: ${statusColor}; font-weight: bold;">${booking.status}</td>
                </tr>`;
        });
    } catch (error) {
        console.error("Firestore 總表讀取失敗:", error);
    }
}

// ----------------------------------------------------------------------
// 功能 B: 搜尋單一預約
// ----------------------------------------------------------------------
async function searchBooking() {
    const ownerId = document.getElementById('ownerIdInput').value.trim();
    const resultArea = document.getElementById('resultArea');
    if (!ownerId) return alert("請輸入 Owner ID");

    try {
        // 對應 Sequence Diagram 中的資料庫查詢條件
        const q = query(collection(db, "bookings"), where("ownerId", "==", ownerId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const bookingDoc = querySnapshot.docs[0];
            const data = bookingDoc.data();
            const docId = bookingDoc.id; // 紀錄 Firestore 的文件識別碼用於後續更新

            if (data.status === 'Cancelled') {
                resultArea.innerHTML = `<p style="color:#d9534f; font-weight:bold;">❌ 此預約已取消！</p>`;
            } else if (data.status === 'CheckedIn') {
                resultArea.innerHTML = `<p style="color:#5cb85c; font-weight:bold;">✅ 已完成報到手續！</p>`;
            } else {
                // 還沒報到、也還沒取消的預約 (Confirmed)，顯示疫苗選單與按鈕
                resultArea.innerHTML = `
                    <p><strong>Pet Name:</strong> ${data.petName}</p>
                    <p><strong>Service:</strong> ${data.service}</p>
                    <div style="margin-top: 10px; background: #f9f6f0; padding: 10px; border-radius: 6px;">
                        <label style="display:inline-block; margin-right:10px; font-weight:bold;">疫苗狀態 (Vaccine):</label>
                        <select id="vaccineStatus" style="padding: 5px; border-radius: 4px; border: 1px solid #ddd;">
                            <option value="valid">✅ 有效 (Valid)</option>
                            <option value="expired">❌ 過期 (Expired)</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button id="checkInBtn" style="flex: 1; padding: 10px; background: #5c4d43; color: white; border: none; border-radius: 6px; cursor:pointer;">✅ 確認報到</button>
                        <button id="cancelBtn" style="flex: 1; padding: 10px; background: #d9534f; color: white; border: none; border-radius: 6px; cursor:pointer;">❌ 取消預約</button>
                    </div>`;

                // 動態綁定點擊事件，傳遞雲端文件 ID (這很重要，更新資料庫需要 ID)
                document.getElementById('checkInBtn').onclick = () => confirmCheckIn(docId);
                document.getElementById('cancelBtn').onclick = () => cancelBooking(docId);
            }
        } else {
            resultArea.innerHTML = `<p style="color:red;">No booking found for this Owner ID.</p>`;
        }
    } catch (error) {
        resultArea.innerHTML = `<p style="color:red;">雲端資料庫連線超時：${error.message}</p>`;
        console.error(error);
    }
}

// ----------------------------------------------------------------------
// 功能 C: 確認報到（對應 Sequence Diagram 內 Vaccine Valid 的 alt 分支）
// ----------------------------------------------------------------------
async function confirmCheckIn(docId) {
    const vacStatus = document.getElementById('vaccineStatus').value;
    if (vacStatus === 'expired') {
        // alt [Vaccine Expired]
        alert("❌ 拒絕報到：疫苗已過期！(Reject Warning)");
    } else {
        // else [Vaccine Valid] -> 透過 SDK 直接更新雲端狀態
        try {
            const docRef = doc(db, "bookings", docId);
            await updateDoc(docRef, { status: "CheckedIn" });
            alert("✅ 報到成功！狀態已實時同步至 Cloud Firestore。");
            searchBooking();
            fetchAllBookings();
        } catch (error) {
            alert("雲端更新失敗：" + error.message);
        }
    }
}

// ----------------------------------------------------------------------
// 功能 D: 取消預約（對應 State Diagram 狀態切換）
// ----------------------------------------------------------------------
async function cancelBooking(docId) {
    if (!confirm("確定要取消這個預約嗎？")) return;
    try {
        const docRef = doc(db, "bookings", docId);
        await updateDoc(docRef, { status: "Cancelled" });
        alert("預約已成功取消！");
        searchBooking();
        fetchAllBookings();
    } catch (error) {
        alert("雲端取消失敗：" + error.message);
    }
}