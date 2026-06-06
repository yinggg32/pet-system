import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
let userPhone = null;

// ────────────────────────────────────────────
// 登入
// ────────────────────────────────────────────
document.getElementById('loginBtn').onclick = async () => {
    const phone = document.getElementById('phoneInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    if (!phone || !password) return alert("⚠️ 請輸入手機號碼與密碼");

    try {
        const snap = await getDoc(doc(db, "members", phone));
        if (snap.exists() && snap.data().password === password) {
            doLogin(phone, snap.data().name);
        } else {
            alert("❌ 帳號或密碼錯誤！");
        }
    } catch (error) { alert("登入失敗：" + error.message); }
};

// ────────────────────────────────────────────
// 註冊（新的 id：phoneInputReg, passwordInputReg）
// ────────────────────────────────────────────
document.getElementById('registerBtn').onclick = async () => {
    const phone = document.getElementById('phoneInputReg').value.trim();
    const password = document.getElementById('passwordInputReg').value.trim();
    const name = document.getElementById('nameInput').value.trim();

    if (!phone || !name || !password) return alert("⚠️ 請填寫完整資料！");
    try {
        const docSnap = await getDoc(doc(db, "members", phone));
        if (docSnap.exists()) return alert("❌ 此手機已註冊過，請直接登入！");
        await setDoc(doc(db, "members", phone), { name, phone, password });
        alert("🎉 註冊成功！系統將自動登入。");
        doLogin(phone, name);
    } catch (error) { alert("註冊失敗：" + error.message); }
};

// ────────────────────────────────────────────
// 登入後顯示 dashboard
// ────────────────────────────────────────────
function doLogin(phone, name) {
    userPhone = phone;
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('userWelcome').innerText = `你好，${name} 🐾`;
    fetchMyBookings();
}

// ────────────────────────────────────────────
// 登出
// ────────────────────────────────────────────
document.getElementById('logoutBtn').onclick = () => {
    userPhone = null;
    document.getElementById('phoneInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
};

// ────────────────────────────────────────────
// 寵物種類變更 → 動態過濾可用服務
// ────────────────────────────────────────────
document.getElementById('petTypeSelect').addEventListener('change', (e) => {
    const allowedServices = e.target.selectedOptions[0].dataset.services;
    const serviceSelect = document.getElementById('serviceSelect');

    Array.from(serviceSelect.options).forEach(opt => {
        if (opt.value === '洗澡美容') opt.hidden = !allowedServices.includes('grooming');
        if (opt.value === '星級住宿') opt.hidden = !allowedServices.includes('boarding');
    });

    if (serviceSelect.selectedOptions[0].hidden) {
        serviceSelect.value = '星級住宿';
        document.getElementById('groomingBox').classList.add('hidden');
        document.getElementById('boardingBox').classList.remove('hidden');
    }
});

// ────────────────────────────────────────────
// 服務種類切換
// ────────────────────────────────────────────
document.getElementById('serviceSelect').addEventListener('change', (e) => {
    if (e.target.value === '星級住宿') {
        document.getElementById('groomingBox').classList.add('hidden');
        document.getElementById('boardingBox').classList.remove('hidden');
    } else {
        document.getElementById('groomingBox').classList.remove('hidden');
        document.getElementById('boardingBox').classList.add('hidden');
    }
});

// ────────────────────────────────────────────
// 送出預約
// ────────────────────────────────────────────
document.getElementById('bookBtn').onclick = async () => {
    const pet = document.getElementById('petNameInput').value.trim();
    const petType = document.getElementById('petTypeSelect').value;
    const service = document.getElementById('serviceSelect').value;

    let finalDate = "";
    let finalTime = "";
    let checkDateForCollision = "";
    let addOnService = "無";

    if (service === '星級住宿') {
        const startDate = document.getElementById('startDateInput').value;
        const endDate = document.getElementById('endDateInput').value;
        finalTime = document.getElementById('boardingTimeSelect').value;

        if (!pet || !startDate || !endDate) return alert("⚠️ 請填寫完整入住與退房日期");
        if (startDate >= endDate) return alert("⚠️ 退房日期必須晚於入住日期！");

        finalDate = `${startDate} 至 ${endDate}`;
        checkDateForCollision = startDate;

        if (document.getElementById('addOnGrooming').checked) {
            addOnService = "加購退房前美容服務";
        }
    } else {
        finalDate = document.getElementById('dateInput').value;
        finalTime = document.getElementById('timeSelect').value;
        if (!pet || !finalDate) return alert("⚠️ 請填寫完整日期");
        checkDateForCollision = finalDate;
    }

    // 防撞檢查
    const q = query(collection(db, "bookings"), where("date", "==", checkDateForCollision));
    const checkSnap = await getDocs(q);
    let isConflict = false;
    checkSnap.forEach(d => {
        const b = d.data();
        if (b.time === finalTime && b.status !== "Cancelled") isConflict = true;
    });

    if (isConflict) return alert(`⚠️ 抱歉！該日期的 ${finalTime} 時段已客滿，請選擇其他時段。`);

    try {
        await addDoc(collection(db, "bookings"), {
            ownerId: userPhone,
            petName: pet,
            petType: petType,
            service: service,
            date: finalDate,
            time: finalTime,
            addOn: addOnService,
            status: "Pending"
        });
        alert("🎉 預約成功！請等候櫃台人員確認。");
        document.getElementById('petNameInput').value = '';
        document.getElementById('addOnGrooming').checked = false;
        fetchMyBookings();
    } catch (e) { alert("預約失敗: " + e); }
};

// ────────────────────────────────────────────
// 讀取我的預約紀錄
// ────────────────────────────────────────────
async function fetchMyBookings() {
    const q = query(collection(db, "bookings"), where("ownerId", "==", userPhone));
    const snap = await getDocs(q);
    const tbody = document.getElementById('myBookingsTable');
    tbody.innerHTML = '';

    if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#9a7b6a; padding:20px; font-size:13px;">目前尚無預約紀錄</td></tr>';
        return;
    }

    const badgeColors = {
        Pending:   { bg: '#fff3e0', color: '#e65100' },
        Confirmed: { bg: '#e3f2fd', color: '#1565c0' },
        CheckedIn: { bg: '#e8f5e9', color: '#2e7d32' },
        Completed: { bg: '#f3e5f5', color: '#6a1b9a' },
        Cancelled: { bg: '#ffebee', color: '#c62828' },
    };

    snap.forEach(d => {
        const b = d.data();
        const docId = d.id;
        const bc = badgeColors[b.status] || { bg: '#eee', color: '#333' };

        let actionBtn = '';
        if (b.status === 'Pending' || b.status === 'Confirmed') {
            actionBtn = `<button onclick="cancelMyBooking('${docId}')" style="background:none;border:1px solid #e74c3c;color:#e74c3c;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;">取消</button>`;
        } else {
            actionBtn = `<span style="color:#ccc;font-size:12px;">—</span>`;
        }

        let serviceDisplay = b.service;
        if (b.addOn && b.addOn !== "無") {
            serviceDisplay += `<br><span style="color:#c8956c; font-size:11px;">[${b.addOn}]</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td style="line-height:1.6;">${b.date}<br><b style="font-size:13px;">${b.time}</b></td>
                <td>
                    <b>${b.petName}</b>
                    <span style="font-size:11px; color:#9a7b6a; margin-left:4px;">${b.petType || ''}</span>
                    <br><span style="font-size:12px; color:#9a7b6a;">${serviceDisplay}</span>
                </td>
                <td>
                    <span class="badge" style="background:${bc.bg}; color:${bc.color};">${b.status}</span>
                </td>
                <td>${actionBtn}</td>
            </tr>`;
    });
}

// ────────────────────────────────────────────
// 取消預約
// ────────────────────────────────────────────
window.cancelMyBooking = async (docId) => {
    if (!confirm("確定要取消這筆預約嗎？")) return;
    try {
        await updateDoc(doc(db, "bookings", docId), { status: "Cancelled" });
        alert("✅ 預約已成功取消！");
        fetchMyBookings();
    } catch (error) { alert("取消失敗：" + error.message); }
};