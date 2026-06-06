import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, updateDoc, deleteDoc, doc, getDoc, setDoc, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
    ['Bookings','Pets','Messages','Settings'].forEach(t => {
        document.getElementById('adminTab'+t).classList.toggle('hidden', t.toLowerCase() !== tab);
    });
    document.querySelectorAll('.admin-tab').forEach((btn, i) => {
        btn.classList.toggle('active', ['bookings','pets','messages','settings'][i] === tab);
    });
    if (tab === 'pets') loadAllPets();
    if (tab === 'settings') loadSettings();
    if (tab === 'messages') initAdminMessages();
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
        const canDelete = b.status === 'Cancelled' || b.status === 'Completed';
        const deleteBtn = canDelete
            ? `<button onclick="deleteBooking('${b.id}')" style="background:none;border:1px solid #e74c3c;color:#e74c3c;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;">🗑️</button>`
            : `<span style="color:#ddd;font-size:12px;">—</span>`;
        return `<tr>
            <td>${b.date}<br><small>${b.time}</small></td>
            <td><b>${b.petName}</b> <small style="color:#888;">${b.petType||''}</small><br><small>飼主：${b.ownerId}</small></td>
            <td>${service}</td>
            <td style="color:${color};font-weight:bold;font-size:13px;">${b.status}</td>
            <td>${quickBtn}</td>
            <td>${deleteBtn}</td>
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
// 刪除單筆（僅 Cancelled / Completed）
// ════════════════════════════════════════════
window.deleteBooking = async (id) => {
    if (!confirm("確定要永久刪除此筆紀錄嗎？此操作無法還原。")) return;
    try {
        await deleteDoc(doc(db, "bookings", id));
        allBookings = allBookings.filter(b => b.id !== id);
        renderBookingsTable(allBookings);
        renderPendingSelect(allBookings);
        alert("✅ 已成功刪除！");
    } catch(e) { alert("刪除失敗：" + e.message); }
};

// 批次清除 Cancelled + Completed
const batchBtn = document.getElementById('batchDeleteBtn'); if(batchBtn) batchBtn.onclick = async () => {
    const targets = allBookings.filter(b => b.status === 'Cancelled' || b.status === 'Completed');
    if (targets.length === 0) return alert("目前沒有可清除的紀錄（僅清除已取消／已完成的單據）。");
    if (!confirm(`確定要批次刪除 ${targets.length} 筆已取消／已完成的紀錄嗎？此操作無法還原。`)) return;
    try {
        await Promise.all(targets.map(b => deleteDoc(doc(db, "bookings", b.id))));
        allBookings = allBookings.filter(b => b.status !== 'Cancelled' && b.status !== 'Completed');
        renderBookingsTable(allBookings);
        renderPendingSelect(allBookings);
        alert(`✅ 已成功清除 ${targets.length} 筆紀錄！`);
    } catch(e) { alert("批次刪除失敗：" + e.message); }
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


// ════════════════════════════════════════════
// 後台訊息系統
// ════════════════════════════════════════════
let adminMsgUnsubscribe = null;
let currentChatOwner   = null;
let allConversations   = {}; // ownerId -> { msgs, memberName, unread }

async function initAdminMessages() {
    if (adminMsgUnsubscribe) return;
    try {
    // 不加 where 條件，避免需要複合索引；改用前端排序
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    adminMsgUnsubscribe = onSnapshot(q, (snap) => {
        // 重建對話群組
        allConversations = {};
        snap.forEach(d => {
            const m = d.data();
            if (!m.ownerId) return;
            if (!allConversations[m.ownerId]) allConversations[m.ownerId] = { msgs: [], unread: 0 };
            allConversations[m.ownerId].msgs.push({ id: d.id, ...m });
            if (!m.read && m.sender !== 'admin') allConversations[m.ownerId].unread++;
        });
        renderAdminSidebar();
        if (currentChatOwner) renderAdminThread(currentChatOwner);
        updateAdminMsgBadge();
    }, err => console.error("admin 訊息監聽失敗 - 可能需要 Firestore 複合索引:", err));
    } catch(e) { console.error("initAdminMessages 失敗:", e); }
}

function updateAdminMsgBadge() {
    const badge = document.getElementById('adminMsgBadge');
    if (!badge) return;
    let total = 0;
    Object.values(allConversations).forEach(c => { total += c.unread; });
    if (total > 0) { badge.textContent = total; badge.style.display = 'inline-block'; }
    else badge.style.display = 'none';
}

async function renderAdminSidebar() {
    const sidebar = document.getElementById('adminMsgSidebar');
    if (!sidebar) return;

    // 查成員名字
    const ownerIds = Object.keys(allConversations);
    const nameMap  = {};
    await Promise.all(ownerIds.map(async id => {
        try {
            const snap = await getDoc(doc(db, "members", id));
            nameMap[id] = snap.exists() ? snap.data().name : id;
        } catch(e) { nameMap[id] = id; }
    }));

    // 排序：有未讀的排前面
    const sorted = ownerIds.sort((a,b) => {
        const ua = allConversations[a].unread, ub = allConversations[b].unread;
        if (ua !== ub) return ub - ua;
        const ma = allConversations[a].msgs, mb = allConversations[b].msgs;
        const ta = ma[ma.length-1]?.createdAt?.seconds || 0;
        const tb = mb[mb.length-1]?.createdAt?.seconds || 0;
        return tb - ta;
    });

    sidebar.innerHTML = sorted.map(ownerId => {
        const conv    = allConversations[ownerId];
        const last    = conv.msgs[conv.msgs.length - 1];
        const preview = last ? last.content.slice(0,24).split('\n').join(' ') + (last.content.length>24?'\u2026':'') : '';
        const badge   = conv.unread > 0 ? `<span class="msg-conv-badge">${conv.unread}</span>` : '';
        const active  = ownerId === currentChatOwner ? ' active' : '';
        return `<div class="msg-conv-item${active}" onclick="openAdminChat('${ownerId}','${nameMap[ownerId]}')">
            <div class="msg-conv-name">${nameMap[ownerId]}${badge}<br><small style="font-weight:400;color:#aaa;">${ownerId}</small></div>
            <div class="msg-conv-preview">${preview}</div>
        </div>`;
    }).join('') || '<div style="padding:20px;color:#aaa;font-size:13px;text-align:center;">尚無顧客訊息</div>';
}

window.openAdminChat = async (ownerId, name) => {
    currentChatOwner = ownerId;
    document.getElementById('adminMsgHeader').textContent = `💬 ${name}（${ownerId}）`;
    renderAdminThread(ownerId);
    renderAdminSidebar();
    // 標記已讀
    const conv = allConversations[ownerId];
    if (conv) {
        const promises = conv.msgs
            .filter(m => !m.read && m.sender !== 'admin')
            .map(m => updateDoc(doc(db, "messages", m.id), { read: true }));
        await Promise.all(promises);
        allConversations[ownerId].unread = 0;
        updateAdminMsgBadge();
    }
};

function renderAdminThread(ownerId) {
    const thread = document.getElementById('adminMsgThread');
    if (!thread) return;
    const conv = allConversations[ownerId];
    if (!conv || conv.msgs.length === 0) {
        thread.innerHTML = '<div class="msg-empty-state">此顧客尚無訊息</div>';
        return;
    }
    thread.innerHTML = '';
    conv.msgs.forEach(m => {
        const timeStr = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
        const cls = m.sender === 'customer' ? 'customer' : m.sender === 'admin' ? 'admin' : 'system';
        const bubble = document.createElement('div');
        bubble.className = `msg-bubble ${cls}`;
        bubble.innerHTML = `<div style="white-space:pre-wrap;">${m.content}</div><div class="msg-meta">${timeStr}</div>`;
        thread.appendChild(bubble);
    });
    thread.scrollTop = thread.scrollHeight;
}

// 送出回覆
const adminSendEl = document.getElementById('adminMsgSendBtn'); if(adminSendEl) adminSendEl.onclick = adminSendMessage;
const adminInputEl = document.getElementById('adminMsgInput'); if(adminInputEl) adminInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); adminSendMessage(); }
});

async function adminSendMessage() {
    const input   = document.getElementById('adminMsgInput');
    const content = input.value.trim();
    if (!content || !currentChatOwner) return;
    input.value = '';
    try {
        await addDoc(collection(db, "messages"), {
            ownerId: currentChatOwner, sender: "admin",
            content, createdAt: serverTimestamp(), read: false
        });
    } catch(e) { alert("訊息發送失敗：" + e.message); }
}