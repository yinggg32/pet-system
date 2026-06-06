import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBSj96SOqhiQgMjOHoku3ARM52FAp5qyg",
  authDomain: "pet-system-609ed.firebaseapp.com",
  projectId: "pet-system-609ed",
  storageBucket: "pet-system-609ed.firebasestorage.app",
  messagingSenderId: "1025593733737",
  appId: "1:1025593733737:web:542bb4a633d6e88b0fe8f8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let selectedDocId = null;

// 員工簡單登入防護
document.getElementById('adminLoginBtn').onclick = () => {
    if (document.getElementById('adminPwd').value === 'admin123') {
        document.getElementById('adminLoginSection').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        loadAllData();
    } else {
        alert("密碼錯誤！");
    }
};

document.getElementById('adminLogoutBtn').onclick = () => {
    document.getElementById('adminLoginSection').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('adminPwd').value = '';
};

// 載入後台所有資料
async function loadAllData() {
    // 1. 計算會員總數
    const membersSnap = await getDocs(collection(db, "members"));
    document.getElementById('memberCount').innerText = membersSnap.size;

    // 2. 載入所有預約單
    const bookingsSnap = await getDocs(collection(db, "bookings"));
    const select = document.getElementById('bookingSelect');
    const table = document.getElementById('allBookingsTable');
    
    select.innerHTML = '<option value="">請選擇要處理的預約單...</option>';
    table.innerHTML = '';

    bookingsSnap.forEach(docSnap => {
        const data = docSnap.data();
        // 填入總表
        let color = data.status === 'Cancelled' ? '#e74c3c' : (data.status === 'CheckedIn' ? '#27ae60' : '#f39c12');
        table.innerHTML += `<tr><td>${data.bookingId}</td><td>${data.ownerId}</td><td>${data.petName}</td><td style="color:${color}; font-weight:bold;">${data.status}</td></tr>`;
        
        // 只有還沒處理完的單子，才放進下拉選單給員工選
        if (data.status === 'Pending' || data.status === 'Confirmed') {
            select.innerHTML += `<option value="${docSnap.id}">[單號: ${data.bookingId}] 寵物: ${data.petName} (飼主: ${data.ownerId})</option>`;
        }
    });
}

// 讀取選定的單子詳情
document.getElementById('loadDetailsBtn').onclick = async () => {
    const id = document.getElementById('bookingSelect').value;
    if (!id) return alert("請先從下拉選單選擇一張單子！");
    
    selectedDocId = id;
    const docSnap = await getDoc(doc(db, "bookings", id));
    const data = docSnap.data();
    
    document.getElementById('detailText').innerHTML = `
        <strong>預約單號：</strong>${data.bookingId}<br>
        <strong>寵物名字：</strong>${data.petName}<br>
        <strong>服務項目：</strong>${data.service}
    `;
    document.getElementById('actionArea').classList.remove('hidden');
};

// 處理報到或取消
document.getElementById('checkInBtn').onclick = async () => {
    if (document.getElementById('vaccineStatus').value === 'expired') {
        alert("❌ 疫苗已過期，系統拒絕報到！");
    } else {
        await updateDoc(doc(db, "bookings", selectedDocId), { status: "CheckedIn" });
        alert("✅ 報到成功！資料庫已連動更新。");
        document.getElementById('actionArea').classList.add('hidden');
        loadAllData(); // 重新整理
    }
};

document.getElementById('cancelBtn').onclick = async () => {
    if(!confirm("確定要取消此單嗎？")) return;
    await updateDoc(doc(db, "bookings", selectedDocId), { status: "Cancelled" });
    alert("單據已取消。");
    document.getElementById('actionArea').classList.add('hidden');
    loadAllData();
};