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
// 切換註冊 / 登入模式
// ────────────────────────────────────────────
document.getElementById('toggleRegBtn').onclick = () => {
    document.getElementById('regFields').classList.toggle('hidden');
    document.getElementById('registerBtn').classList.toggle('hidden');
    document.getElementById('loginBtn').classList.toggle('hidden');
    document.getElementById('toggleRegBtn').innerText = document.getElementById('regFields').classList.contains('hidden')
        ? "還不是會員？我要註冊"
        : "已有帳號？返回登入";
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

    // 若目前選到的服務已被隱藏，自動切換到星級住宿
    if (serviceSelect.selectedOptions[0].hidden) {
        serviceSelect.value = '星級住宿';
        document.getElementById('groomingBox').classList.add('hidden');
        document.getElementById('boardingBox').classList.remove('hidden');
    }
});

// ────────────────────────────────────────────
// 服務種類切換（洗澡美容 / 星級住宿）
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
// 註冊
// ────────────────────────────────────────────
document.getElementById('registerBtn').onclick = async () => {
    const phone = document.getElementById('phoneInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
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

function doLogin(phone, name) {
    userPhone = phone;
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('userWelcome').innerText = `你好，${name}！`;
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

    if (isConflict) return alert(`⚠️ 抱歉！該日期的 ${finalTime} 這個時段已經客滿了，請選擇其他時段。`);

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

    snap.forEach(d => {
        const b = d.data();
        const docId = d.id;
        let badge = b.status === 'Pending' ? '#f39c12'
            : b.status === 'Confirmed' ? '#3498db'
            : b.status === 'CheckedIn' ? '#27ae60'
            : b.status === 'Completed' ? '#8e44ad'
            : '#e74c3c';

        let actionBtn = '';
        if (b.status === 'Pending' || b.status === 'Confirmed') {
            actionBtn = `<button onclick="cancelMyBooking('${docId}')" style="background: #e74c3c; color: white; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer;">取消</button>`;
        } else {
            actionBtn = `<span style="color: #999; font-size: 12px;">無法操作</span>`;
        }

        let serviceDisplay = b.service;
        if (b.addOn && b.addOn !== "無") {
            serviceDisplay += ` <span style="color:var(--accent); font-size:12px;">[${b.addOn}]</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td style="font-size: 12px; line-height: 1.4;">${b.date}<br><b>${b.time}</b></td>
                <td>
                    <b>${b.petName}</b>
                    <span style="font-size:12px; color:#888;">${b.petType || ''}</span>
                    <br>
                    <span style="font-size: 12px; color:#666;">${serviceDisplay}</span>
                </td>
                <td><span style="padding: 4px 10px; border-radius: 12px; background:${badge}; color:white; font-size:12px; font-weight:bold;">${b.status}</span></td>
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