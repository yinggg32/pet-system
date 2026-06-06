import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, doc, getDoc, setDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCBSj96SOqhiQgMjOHoku3ARM52FAp5qyg",
    authDomain: "pet-system-609ed.firebaseapp.com",
    projectId: "pet-system-609ed",
    storageBucket: "pet-system-609ed.firebasestorage.app",
    messagingSenderId: "1025593733737",
    appId: "1:1025593733737:web:542bb4a633d6e88b0fe8f8"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
let selectedDocId = null;
let allBookings   = []; // 快取，供搜尋用
let allPets       = []; // 快取，供搜尋用

// ════════════════════════════════════════════
// Tab 切換
// ════════════════════════════════════════════
window.switchAdminTab = (tab) => {
    ['Bookings','Pets','Settings'].forEach(t => {
        document.getElementById('adminTab'+t).classList.toggle('hidden', t.toLowerCase() !== tab);
    });
    document.querySelectorAll('.admin-tab').forEach((btn, i) => {
        btn.classList.toggle('active', ['bookings','pets','settings'][i] === tab);
    });
    if (tab === 'pets') loadAllPets();
    if (tab === 'settings') loadSettings();
};

// ════════════════════════════════════════════
// 登入 / 登出
// ════════════════════════════════════════════
document.getElementById('adminLoginBtn').onclick = () => {
    if (document.getElementById('adminPwd').value === 'admin123') {
        document.getElementById('adminLoginSection').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        loadAllData();
    } else { alert("❌ 密碼錯誤！"); }
};

document.getElementById('adminLogoutBtn').onclick = () => {
    document.getElementById('adminLoginSection').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('adminPwd').value = '';
    document.getElementById('actionArea').classList.add('hidden');
};

// ════════════════════════════════════════════
// 讀取全部預約
// ════════════════════════════════════════════
async function loadAllData() {
    try {
        const snap = await getDocs(collection(db, "bookings"));
        allBookings = [];
        snap.forEach(d => allBookings.push({ id: d.id, ...d.data() }));
        // 排序：Pending 最優先，再依日期
        allBookings.sort((a,b) => {
            const order = { Pending:0, Confirmed:1, CheckedIn:2, Completed:3, Cancelled:4 };
            const od = (order[a.status]??5) - (order[b.status]??5);
            if (od !== 0) return od;
            return (a.date||'') > (b.date||'') ? 1 : -1;
        });
        renderBookingsTable(allBookings);
        renderPendingSelect(allBookings);
    } catch(e) { alert("載入資料庫失敗：" + e.message); }
}

function renderPendingSelect(data) {
    const select = document.getElementById('pendingSelect');
    select.innerHTML = '<option value="">請選擇要處理的預約單...</option>';
    data.filter(b => b.status === 'Pending' || b.status === 'Confirmed').forEach(b => {
        select.innerHTML += `<option value="${b.id}">[${b.status}] ${b.date} — ${b.petName} (${b.service})</option>`;
    });
}

const statusColors = { Pending:'#f39c12', Confirmed:'#3498db', CheckedIn:'#27ae60', Completed:'#8e44ad', Cancelled:'#e74c3c' };

function renderBookingsTable(data) {
    const table = document.getElementById('allBookingsTable');
    if (data.length === 0) { table.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#888;">查無資料</td></tr>'; return; }
    table.innerHTML = data.map(b => {
        const color = statusColors[b.status] || '#999';
        let service = `<b>${b.service}</b>`;
        if (b.addOn && b.addOn !== "無") service += ` <span style="color:#e67e22;font-size:11px;">[${b.addOn}]</span>`;
        const quickBtn = b.status === 'Pending'
            ? `<button onclick="quickConfirm('${b.id}')" style="background:#3498db;color:white;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;">確認接受</button>`
            : '';
        return `<tr>
            <td>${b.date}<br><small>${b.time}</small></td>
            <td><b>${b.petName}</b> <small style="color:#888;">${b.petType||''}</small><br><small>飼主：${b.ownerId}</small></td>
            <td>${service}</td>
            <td style="color:${color};font-weight:bold;font-size:13px;">${b.status}</td>
            <td>${quickBtn}</td>
        </tr>`;
    }).join('');
}

// ════════════════════════════════════════════
// 搜尋預約
// ════════════════════════════════════════════
document.getElementById('searchBtn').onclick = () => {
    const kw = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!kw) return renderBookingsTable(allBookings);
    const filtered = allBookings.filter(b =>
        (b.ownerId||'').toLowerCase().includes(kw) ||
        (b.petName||'').toLowerCase().includes(kw)
    );
    renderBookingsTable(filtered);
};
document.getElementById('clearSearchBtn').onclick = () => {
    document.getElementById('searchInput').value = '';
    renderBookingsTable(allBookings);
};
document.getElementById('searchInput').addEventListener('keyup', e => {
    if (e.key === 'Enter') document.getElementById('searchBtn').click();
});

// ════════════════════════════════════════════
// 快速確認接受（從總表）
// ════════════════════════════════════════════
window.quickConfirm = async (id) => {
    if (!confirm("確認接受此預約？")) return;
    try {
        await updateDoc(doc(db, "bookings", id), { status: "Confirmed", confirmedAt: new Date().toISOString() });
        alert("✅ 已確認接受！顧客狀態更新為 Confirmed。");
        loadAllData();
    } catch(e) { alert("更新失敗：" + e.message); }
};

// ════════════════════════════════════════════
// 讀取單筆詳情
// ════════════════════════════════════════════
document.getElementById('loadDetailsBtn').onclick = async () => {
    const id = document.getElementById('pendingSelect').value;
    if (!id) return alert("請先選擇一張單子！");
    selectedDocId = id;
    try {
        const bookSnap = await getDoc(doc(db, "bookings", id));
        const data = bookSnap.data();
        const isGrooming = data.service === '洗澡美容';

        // 嘗試讀寵物檔案
        let petProfileHTML = '';
        if (data.petId) {
            try {
                const petSnap = await getDoc(doc(db, "pets", data.petId));
                if (petSnap.exists()) {
                    const p = petSnap.data();
                    const allergyStyle = p.allergy && p.allergy !== '無' ? 'color:#e74c3c;font-weight:600;' : '';
                    petProfileHTML = `
                        <div style="background:#f0faf5;border:1px solid #b2dfdb;border-radius:10px;padding:12px 16px;margin:10px 0;font-size:13px;line-height:1.9;">
                            <b style="color:#2e7d32;">🐾 寵物健康檔案</b><br>
                            品種：${p.breed||'未填'}　生日：${p.birthday||'未填'}<br>
                            <span style="${allergyStyle}">⚕️ 過敏史 / 注意：${p.allergy||'無'}</span><br>
                            💉 最近疫苗日期：${p.vaccine||'未填寫'}
                        </div>`;
                }
            } catch(e) {}
        }

        const confirmedInfo = data.confirmedAt
            ? `<br><small style="color:#3498db;">✅ 已於 ${data.confirmedAt.slice(0,10)} 確認接受</small>` : '';

        const addOnDisplay = data.addOn || "無";
        const addOnStyle   = addOnDisplay !== "無" ? "color:#e67e22;font-weight:bold;" : "color:#666;";

        document.getElementById('detailText').innerHTML = `
            <strong>⏰ 預約期間：</strong>${data.date}（報到時段：${data.time}）${confirmedInfo}<br>
            <strong>🐶 寵物：</strong><b style="font-size:16px;">${data.petName}</b> <span style="color:#888;font-size:13px;">${data.petType||''}</span>
            ${petProfileHTML}
            <strong>🏨 服務：</strong>${data.service}<br>
            <strong>🎁 加購：</strong><span style="${addOnStyle}">${addOnDisplay}</span><br>
            <strong>📱 飼主：</strong>${data.ownerId}
        `;

        document.getElementById('checkInBtn').textContent = isGrooming ? '✅ 確認完成美容服務' : '✅ 確認核准並辦理入住';
        document.getElementById('cancelBtn').textContent  = isGrooming ? '❌ 取消 / 顧客未到' : '❌ 拒絕入住並取消單據';
        document.getElementById('vaccineSection').classList.toggle('hidden', isGrooming);
        document.getElementById('confirmSection').classList.toggle('hidden', data.status !== 'Pending');
        document.getElementById('actionArea').classList.remove('hidden');
    } catch(e) { alert("讀取詳情失敗: " + e.message); }
};

// 確認接受（從詳情面板）
document.getElementById('confirmBookingBtn').onclick = async () => {
    try {
        await updateDoc(doc(db, "bookings", selectedDocId), { status: "Confirmed", confirmedAt: new Date().toISOString() });
        alert("✅ 已確認接受！顧客狀態更新為 Confirmed。");
        document.getElementById('actionArea').classList.add('hidden');
        loadAllData();
    } catch(e) { alert("更新失敗：" + e.message); }
};

// Check-in / Completed
document.getElementById('checkInBtn').onclick = async () => {
    try {
        const bookSnap  = await getDoc(doc(db, "bookings", selectedDocId));
        const data      = bookSnap.data();
        const isGrooming = data.service === '洗澡美容';

        if (!isGrooming) {
            const vaccine = document.getElementById('vaccineStatus').value;
            if (vaccine === 'expired') { alert("❌ 拒絕報到：疫苗已過期！(Reject Warning)"); return; }
        }

        const newStatus = isGrooming ? "Completed" : "CheckedIn";
        await updateDoc(doc(db, "bookings", selectedDocId), { status: newStatus });
        alert(isGrooming ? "✅ 美容服務已確認完成！" : "✅ 辦理入住成功！");
        document.getElementById('actionArea').classList.add('hidden');
        loadAllData();
    } catch(e) { alert("更新失敗：" + e.message); }
};

// 取消
document.getElementById('cancelBtn').onclick = async () => {
    if (!confirm("確定要取消此單嗎？")) return;
    try {
        await updateDoc(doc(db, "bookings", selectedDocId), { status: "Cancelled" });
        alert("單據已成功取消。");
        document.getElementById('actionArea').classList.add('hidden');
        loadAllData();
    } catch(e) { alert("取消失敗：" + e.message); }
};

// ════════════════════════════════════════════
// 寵物檔案總覽
// ════════════════════════════════════════════
async function loadAllPets() {
    try {
        const snap = await getDocs(collection(db, "pets"));
        allPets = [];
        snap.forEach(d => allPets.push({ id: d.id, ...d.data() }));
        allPets.sort((a,b) => (a.ownerId||'') > (b.ownerId||'') ? 1 : -1);
        renderPetsList(allPets);
    } catch(e) { alert("載入寵物檔案失敗：" + e.message); }
}

function renderPetsList(data) {
    const el = document.getElementById('allPetsList');
    if (data.length === 0) { el.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">查無寵物資料</p>'; return; }
    el.innerHTML = data.map(p => {
        let ageStr = '';
        if (p.birthday) {
            const age = Math.floor((new Date() - new Date(p.birthday)) / (365.25*24*3600*1000));
            ageStr = `${age} 歲`;
        }
        const allergyClass = p.allergy && p.allergy !== '無' ? 'allergy-flag' : '';
        return `<div class="pet-row">
            <div class="pet-row-header">
                <span class="pet-row-name">${p.petType||''} ${p.petName}</span>
                <span class="pet-row-owner">飼主手機：${p.ownerId}</span>
            </div>
            <div class="pet-row-info">
                品種：${p.breed||'未填'}　生日：${p.birthday||'未填'}（${ageStr}）<br>
                <span class="${allergyClass}">⚕️ 過敏史：${p.allergy||'無'}</span>　💉 最近疫苗：${p.vaccine||'未填'}
            </div>
        </div>`;
    }).join('');
}

document.getElementById('petSearchBtn').onclick = () => {
    const kw = document.getElementById('petSearchInput').value.trim().toLowerCase();
    if (!kw) return renderPetsList(allPets);
    const filtered = allPets.filter(p =>
        (p.ownerId||'').toLowerCase().includes(kw) ||
        (p.petName||'').toLowerCase().includes(kw)
    );
    renderPetsList(filtered);
};
document.getElementById('petClearBtn').onclick = () => {
    document.getElementById('petSearchInput').value = '';
    renderPetsList(allPets);
};
document.getElementById('petSearchInput').addEventListener('keyup', e => {
    if (e.key === 'Enter') document.getElementById('petSearchBtn').click();
});

// ════════════════════════════════════════════
// 系統設定（住宿房間數）
// ════════════════════════════════════════════
async function loadSettings() {
    try {
        const snap = await getDoc(doc(db, "settings", "capacity"));
        if (snap.exists() && snap.data().boardingRooms) {
            document.getElementById('settingRooms').value = snap.data().boardingRooms;
        }
    } catch(e) { console.warn("settings 讀取失敗", e); }
}

document.getElementById('saveSettingBtn').onclick = async () => {
    const rooms = parseInt(document.getElementById('settingRooms').value);
    if (!rooms || rooms < 1) return alert("⚠️ 請輸入有效的房間數！");
    try {
        await setDoc(doc(db, "settings", "capacity"), { boardingRooms: rooms });
        alert(`✅ 已儲存！住宿上限設定為 ${rooms} 間。`);
    } catch(e) { alert("儲存失敗：" + e.message); }
};