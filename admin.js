import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, doc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// ════════════════════════════════════════════
// 登入 / 登出
// ════════════════════════════════════════════
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

// ════════════════════════════════════════════
// 讀取全部資料
// ════════════════════════════════════════════
async function loadAllData() {
    try {
        const snap = await getDocs(collection(db, "bookings"));
        const select = document.getElementById('pendingSelect');
        const table  = document.getElementById('allBookingsTable');

        select.innerHTML = '<option value="">請選擇要處理的預約單...</option>';
        table.innerHTML  = '';

        if (snap.empty) {
            table.innerHTML = '<tr><td colspan="5" style="text-align:center;">目前無任何資料</td></tr>';
            return;
        }

        // 排序：Pending 優先
        const docs = [];
        snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
        docs.sort((a, b) => {
            const order = { Pending: 0, Confirmed: 1, CheckedIn: 2, Completed: 3, Cancelled: 4 };
            return (order[a.status] ?? 5) - (order[b.status] ?? 5);
        });

        docs.forEach(data => {
            const id = data.id;
            const statusColors = {
                Pending:   '#f39c12',
                Confirmed: '#3498db',
                CheckedIn: '#27ae60',
                Completed: '#8e44ad',
                Cancelled: '#e74c3c',
            };
            const color = statusColors[data.status] || '#999';

            let serviceDetails = `<b>${data.service}</b>`;
            if (data.addOn && data.addOn !== "無") {
                serviceDetails += ` <span style="color:#e67e22;font-size:12px;">[${data.addOn}]</span>`;
            }

            table.innerHTML += `<tr>
                <td>${data.date}<br><small>${data.time}</small></td>
                <td><b>${data.petName}</b> <small style="color:#888;">${data.petType || ''}</small><br><small>飼主: ${data.ownerId}</small></td>
                <td>${serviceDetails}</td>
                <td style="color:${color};font-weight:bold;">${data.status}</td>
                <td>
                    ${data.status === 'Pending'
                        ? `<button onclick="quickConfirm('${id}')" style="background:#3498db;color:white;border:none;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;margin-right:4px;">確認接受</button>`
                        : ''}
                </td>
            </tr>`;

            if (data.status === 'Pending' || data.status === 'Confirmed') {
                select.innerHTML += `<option value="${id}">[${data.status}] ${data.date} — ${data.petName} (${data.service})</option>`;
            }
        });
    } catch (e) {
        alert("載入資料庫失敗：" + e.message);
    }
}

// ════════════════════════════════════════════
// 快速確認接受（從總表直接按）
// ════════════════════════════════════════════
window.quickConfirm = async (id) => {
    if (!confirm("確認接受此預約？狀態將變更為 Confirmed。")) return;
    try {
        await updateDoc(doc(db, "bookings", id), { status: "Confirmed" });
        alert("✅ 已確認接受，顧客預約狀態更新為 Confirmed！");
        loadAllData();
    } catch (e) { alert("更新失敗：" + e.message); }
};

// ════════════════════════════════════════════
// 讀取單筆詳情（辦理手續面板）
// ════════════════════════════════════════════
document.getElementById('loadDetailsBtn').onclick = async () => {
    const id = document.getElementById('pendingSelect').value;
    if (!id) return alert("請先選擇一張單子！");

    selectedDocId = id;
    try {
        const bookSnap = await getDoc(doc(db, "bookings", id));
        const data = bookSnap.data();
        const isGrooming = data.service === '洗澡美容';

        // 嘗試讀取寵物檔案
        let petProfileHTML = '';
        if (data.petId) {
            try {
                const petSnap = await getDoc(doc(db, "pets", data.petId));
                if (petSnap.exists()) {
                    const p = petSnap.data();
                    petProfileHTML = `
                        <div style="background:#f0faf5;border:1px solid #b2dfdb;border-radius:10px;padding:12px 16px;margin:12px 0;font-size:13px;line-height:1.9;">
                            <b style="color:#2e7d32;">🐾 寵物檔案資料</b><br>
                            品種：${p.breed || '未填'}　生日：${p.birthday || '未填'}<br>
                            <span style="color:#c0392b;font-weight:500;">⚕️ 過敏史：${p.allergy || '無'}</span><br>
                            💉 最近疫苗日期：${p.vaccine || '未填寫'}
                        </div>`;
                }
            } catch (e) {}
        }

        let addOnDisplay = data.addOn || "無";
        let addOnStyle = addOnDisplay !== "無" ? "color:#e67e22;font-weight:bold;" : "color:#666;";

        document.getElementById('detailText').innerHTML = `
            <strong>⏰ 預約期間：</strong>${data.date}（報到時段：${data.time}）<br>
            <strong>🐶 寵物名字：</strong><span style="font-size:16px;color:#2c3e50;"><b>${data.petName}</b></span>
            <span style="font-size:13px;color:#888;">${data.petType || ''}</span>
            ${petProfileHTML}
            <strong>🏨 主營服務：</strong>${data.service}<br>
            <strong>🎁 加購項目：</strong><span style="${addOnStyle}">${addOnDisplay}</span><br>
            <strong>📱 飼主聯繫：</strong>${data.ownerId}
        `;

        // 按鈕文字依服務類型調整
        document.getElementById('checkInBtn').textContent = isGrooming
            ? '✅ 確認完成美容服務'
            : '✅ 確認核准並辦理入住';
        document.getElementById('cancelBtn').textContent = isGrooming
            ? '❌ 取消 / 顧客未到'
            : '❌ 拒絕入住並取消單據';

        // 美容服務隱藏疫苗核對
        document.getElementById('vaccineSection').classList.toggle('hidden', isGrooming);

        // 如果已是 Confirmed，顯示「確認接受」按鈕區塊
        document.getElementById('confirmSection').classList.toggle('hidden', data.status !== 'Pending');

        document.getElementById('actionArea').classList.remove('hidden');
    } catch (e) { alert("讀取詳情失敗: " + e.message); }
};

// ════════════════════════════════════════════
// 確認接受（從詳情面板）
// ════════════════════════════════════════════
document.getElementById('confirmBookingBtn').onclick = async () => {
    try {
        await updateDoc(doc(db, "bookings", selectedDocId), { status: "Confirmed" });
        alert("✅ 已確認接受預約！顧客狀態變更為 Confirmed。");
        document.getElementById('actionArea').classList.add('hidden');
        loadAllData();
    } catch (e) { alert("更新失敗：" + e.message); }
};

// ════════════════════════════════════════════
// 辦理到場手續（Check-in / Completed）
// ════════════════════════════════════════════
document.getElementById('checkInBtn').onclick = async () => {
    try {
        const bookSnap = await getDoc(doc(db, "bookings", selectedDocId));
        const data = bookSnap.data();
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
        alert(isGrooming ? "✅ 美容服務已確認完成！" : "✅ 辦理入住成功！毛孩狀態已變更為 CheckedIn。");
        document.getElementById('actionArea').classList.add('hidden');
        loadAllData();
    } catch (e) { alert("更新失敗：" + e.message); }
};

// ════════════════════════════════════════════
// 取消單據
// ════════════════════════════════════════════
document.getElementById('cancelBtn').onclick = async () => {
    if (!confirm("確定要取消此單嗎？")) return;
    try {
        await updateDoc(doc(db, "bookings", selectedDocId), { status: "Cancelled" });
        alert("單據已成功取消。");
        document.getElementById('actionArea').classList.add('hidden');
        loadAllData();
    } catch (e) { alert("取消失敗：" + e.message); }
};