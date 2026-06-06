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

// 登入防護
document.getElementById('adminLoginBtn').onclick = () => {
    if (document.getElementById('adminPwd').value === 'admin123') {
        document.getElementById('adminLoginSection').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        loadAllData();
    } else {
        alert("❌ 密碼錯誤！");
    }
};

document.getElementById('adminLogoutBtn').onclick = () => {
    document.getElementById('adminLoginSection').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('adminPwd').value = '';
    document.getElementById('actionArea').classList.add('hidden');
};

// 載入所有資料
async function loadAllData() {
    try {
        const snap = await getDocs(collection(db, "bookings"));
        const select = document.getElementById('pendingSelect');
        const table = document.getElementById('allBookingsTable');

        select.innerHTML = '<option value="">請選擇要處理的預約單...</option>';
        table.innerHTML = '';

        if(snap.empty) {
            table.innerHTML = '<tr><td colspan="5" style="text-align:center;">目前無任何資料</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            // 填入總表
            let color = data.status === 'Cancelled' ? '#e74c3c' : (data.status === 'CheckedIn' ? '#27ae60' : '#f39c12');
            table.innerHTML += `<tr>
                <td>${data.date} ${data.time}</td>
                <td>${data.petName}</td>
                <td>${data.ownerId}</td>
                <td>${data.service}</td>
                <td style="color:${color}; font-weight:bold;">${data.status}</td>
            </tr>`;

            // 填入下拉選單 (只顯示尚未結案的訂單)
            if (data.status === 'Pending' || data.status === 'Confirmed') {
                select.innerHTML += `<option value="${id}">${data.date} ${data.time} - ${data.petName} (${data.service})</option>`;
            }
        });
    } catch (e) {
        alert("載入資料庫失敗：" + e.message);
    }
}

// 讀取單筆資料
document.getElementById('loadDetailsBtn').onclick = async () => {
    const id = document.getElementById('pendingSelect').value;
    if (!id) return alert("請先從下拉選單選擇一張單子！");

    selectedDocId = id;
    try {
        const docSnap = await getDoc(doc(db, "bookings", id));
        const data = docSnap.data();

        document.getElementById('detailText').innerHTML = `
            <strong>⏰ 預約時間：</strong>${data.date} ${data.time}<br>
            <strong>🐶 寵物名字：</strong>${data.petName}<br>
            <strong>🛁 服務項目：</strong>${data.service}<br>
            <strong>📱 飼主電話：</strong>${data.ownerId}
        `;
        document.getElementById('actionArea').classList.remove('hidden');
    } catch(e) {
        alert("讀取詳情失敗: " + e.message);
    }
};

// 疫苗檢核與確認報到
document.getElementById('checkInBtn').onclick = async () => {
    const vaccine = document.getElementById('vaccineStatus').value;

    // Alt 判斷：疫苗過期
    if (vaccine === 'expired') {
        alert("❌ 拒絕報到：疫苗已過期！(Reject Warning)");
    } else {
        // Alt 判斷：疫苗有效
        try {
            await updateDoc(doc(db, "bookings", selectedDocId), { status: "CheckedIn" });
            alert("✅ 報到成功！狀態已同步更新至資料庫。");
            document.getElementById('actionArea').classList.add('hidden');
            loadAllData();
        } catch(e) {
            alert("更新失敗：" + e.message);
        }
    }
};

// 後台取消預約
document.getElementById('cancelBtn').onclick = async () => {
    if(!confirm("確定要取消此單嗎？")) return;
    try {
        await updateDoc(doc(db, "bookings", selectedDocId), { status: "Cancelled" });
        alert("單據已成功取消。");
        document.getElementById('actionArea').classList.add('hidden');
        loadAllData();
    } catch(e) {
        alert("取消失敗：" + e.message);
    }
};