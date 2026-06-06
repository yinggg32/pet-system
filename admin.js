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

// ────────────────────────────────────────────
// 登入 / 登出
// ────────────────────────────────────────────
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

// ────────────────────────────────────────────
// 讀取全部資料
// ────────────────────────────────────────────
async function loadAllData() {
    try {
        const snap = await getDocs(collection(db, "bookings"));
        const select = document.getElementById('pendingSelect');
        const table = document.getElementById('allBookingsTable');

        select.innerHTML = '<option value="">請選擇要處理的預約單...</option>';
        table.innerHTML = '';

        if (snap.empty) {
            table.innerHTML = '<tr><td colspan="4" style="text-align:center;">目前無任何資料</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            let color = data.status === 'Cancelled' ? '#e74c3c'
                : data.status === 'CheckedIn' ? '#27ae60'
                : data.status === 'Completed' ? '#8e44ad'
                : '#f39c12';

            let serviceDetails = `<b>${data.service}</b>`;
            if (data.addOn && data.addOn !== "無") {
                serviceDetails += ` <span style="color:#e67e22; font-size:12px;">[${data.addOn}]</span>`;
            }

            let petDisplay = `<b>${data.petName}</b>`;
            if (data.petType) {
                petDisplay += `<br><small style="color:#888;">${data.petType}</small>`;
            }

            table.innerHTML += `<tr>
                <td>${data.date}<br><small>${data.time}</small></td>
                <td>${petDisplay}<br><small>飼主: ${data.ownerId}</small></td>
                <td>${serviceDetails}</td>
                <td style="color:${color}; font-weight:bold;">${data.status}</td>
            </tr>`;

            if (data.status === 'Pending' || data.status === 'Confirmed') {
                select.innerHTML += `<option value="${id}">${data.date} - ${data.petName} (${data.service})</option>`;
            }
        });
    } catch (e) {
        alert("載入資料庫失敗：" + e.message);
    }
}

// ────────────────────────────────────────────
// 讀取單筆預約詳情
// ────────────────────────────────────────────
document.getElementById('loadDetailsBtn').onclick = async () => {
    const id = document.getElementById('pendingSelect').value;
    if (!id) return alert("請先選擇一張單子！");

    selectedDocId = id;
    try {
        const docSnap = await getDoc(doc(db, "bookings", id));
        const data = docSnap.data();
        const isGrooming = data.service === '洗澡美容';

        let addOnDisplay = data.addOn ? data.addOn : "無";
        let addOnColor = addOnDisplay !== "無" ? "color:#e67e22; font-weight:bold;" : "color:#666;";
        let petTypeDisplay = data.petType ? data.petType : "未填寫";

        document.getElementById('detailText').innerHTML = `
            <strong>⏰ 預約期間：</strong>${data.date} (報到時段: ${data.time})<br>
            <strong>🐶 寵物名字：</strong><span style="font-size:16px; color:#2c3e50;"><b>${data.petName}</b></span><br>
            <strong>🐾 寵物種類：</strong>${petTypeDisplay}<br>
            <strong>🏨 主營服務：</strong>${data.service}<br>
            <strong>🎁 附加加購項目：</strong><span style="${addOnColor}">${addOnDisplay}</span><br>
            <strong>📱 飼主聯繫電話：</strong>${data.ownerId}
        `;

        // 根據服務類型動態調整按鈕文字
        document.getElementById('checkInBtn').textContent = isGrooming
            ? '✅ 確認完成美容服務'
            : '✅ 確認核准並辦理入住';
        document.getElementById('cancelBtn').textContent = isGrooming
            ? '❌ 取消 / 顧客未到'
            : '❌ 拒絕入住並取消單據';

        // 美容服務不需要疫苗核對，隱藏疫苗區塊
        document.getElementById('vaccineSection').classList.toggle('hidden', isGrooming);

        document.getElementById('actionArea').classList.remove('hidden');
    } catch (e) {
        alert("讀取詳情失敗: " + e.message);
    }
};

// ────────────────────────────────────────────
// 確認完成（美容 → Completed；住宿 → CheckedIn）
// ────────────────────────────────────────────
document.getElementById('checkInBtn').onclick = async () => {
    try {
        const docSnap = await getDoc(doc(db, "bookings", selectedDocId));
        const data = docSnap.data();
        const isGrooming = data.service === '洗澡美容';

        if (!isGrooming) {
            const vaccine = document.getElementById('vaccineStatus').value;
            if (vaccine === 'expired') {
                alert("❌ 拒絕報到：安全核對失敗，該寵物疫苗已過期！(Reject Warning)");
                return;
            }
        }

        const newStatus = isGrooming ? "Completed" : "CheckedIn";
        await updateDoc(doc(db, "bookings", selectedDocId), { status: newStatus });
        alert(isGrooming ? "✅ 美容服務已確認完成！" : "✅ 辦理入住成功！毛孩狀態已變更為 [已入住 (CheckedIn)]。");
        document.getElementById('actionArea').classList.add('hidden');
        loadAllData();
    } catch (e) {
        alert("更新失敗：" + e.message);
    }
};

// ────────────────────────────────────────────
// 取消單據
// ────────────────────────────────────────────
document.getElementById('cancelBtn').onclick = async () => {
    if (!confirm("確定要取消此單嗎？")) return;
    try {
        await updateDoc(doc(db, "bookings", selectedDocId), { status: "Cancelled" });
        alert("單據已成功取消。");
        document.getElementById('actionArea').classList.add('hidden');
        loadAllData();
    } catch (e) {
        alert("取消失敗：" + e.message);
    }
};