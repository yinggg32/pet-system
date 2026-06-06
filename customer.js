// 引入 Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ 請替換成你自己的 Firebase 金鑰！
const firebaseConfig = {
  apiKey: "AIzaSyCBSj96SOqhiQgMjOHoku3ARM52FAp5qyg",
  authDomain: "pet-system-609ed.firebaseapp.com",
  projectId: "pet-system-609ed",
  storageBucket: "pet-system-609ed.firebasestorage.app",
  messagingSenderId: "1025593733737",
  appId: "1:1025593733737:web:542bb4a633d6e88b0fe8f8",
  measurementId: "G-1216ND27PK"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 全域變數，用來記住現在登入的顧客 ID
let currentOwnerId = null;

// 綁定按鈕事件
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('bookBtn').addEventListener('click', createBooking);

// ==========================================
// 1. 顧客登入邏輯
// ==========================================
function login() {
    const ownerId = document.getElementById('loginIdInput').value.trim();
    if (!ownerId) return alert("請輸入 Owner ID");

    currentOwnerId = ownerId;

    // 切換畫面顯示
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');

    // 載入該顧客的專屬預約紀錄
    fetchMyBookings();
}

function logout() {
    currentOwnerId = null;
    document.getElementById('loginIdInput').value = '';
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
}

// ==========================================
// 2. 新增預約 (寫入 Firebase)
// ==========================================
async function createBooking() {
    const petName = document.getElementById('petNameInput').value.trim();
    const service = document.getElementById('serviceSelect').value;

    if (!petName) return alert("請輸入寵物名字！");

    // 隨機產生一個 B- 開頭的單號
    const randomBookingId = "B-" + Math.floor(1000 + Math.random() * 9000);

    try {
        // 將預約資料寫入 Firestore，預設狀態為 Pending (待確認)
        await addDoc(collection(db, "bookings"), {
            bookingId: randomBookingId,
            ownerId: currentOwnerId,
            petName: petName,
            service: service,
            status: "Pending" // 完美對應你畫的 State Diagram 初始狀態！
        });

        alert("✅ 預約成功！您的預約已送出。");
        document.getElementById('petNameInput').value = ''; // 清空輸入框
        fetchMyBookings(); // 重新整理表格
    } catch (error) {
        alert("預約失敗：" + error.message);
    }
}

// ==========================================
// 3. 讀取個人預約紀錄
// ==========================================
async function fetchMyBookings() {
    try {
        // 只抓取「目前登入者 (currentOwnerId)」的預約
        const q = query(collection(db, "bookings"), where("ownerId", "==", currentOwnerId));
        const querySnapshot = await getDocs(q);

        const tbody = document.getElementById('myBookingsTable');
        tbody.innerHTML = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#999;">目前沒有任何預約紀錄</td></tr>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // 根據不同狀態給不同顏色
            let statusColor = '#333';
            if (data.status === 'Cancelled') statusColor = '#d9534f'; // 紅
            if (data.status === 'CheckedIn') statusColor = '#5cb85c'; // 綠
            if (data.status === 'Pending') statusColor = '#f0ad4e';   // 橘黃

            tbody.innerHTML += `
                <tr>
                    <td>${data.bookingId}</td>
                    <td>${data.petName}</td>
                    <td>${data.service}</td>
                    <td style="color: ${statusColor}; font-weight: bold;">${data.status}</td>
                </tr>`;
        });
    } catch (error) {
        console.error("無法讀取紀錄:", error);
    }
}