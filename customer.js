import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// ════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════
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
    } catch (e) { alert("登入失敗：" + e.message); }
};

document.getElementById('registerBtn').onclick = async () => {
    const phone = document.getElementById('phoneInputReg').value.trim();
    const password = document.getElementById('passwordInputReg').value.trim();
    const name = document.getElementById('nameInput').value.trim();
    if (!phone || !name || !password) return alert("⚠️ 請填寫完整資料！");
    try {
        const snap = await getDoc(doc(db, "members", phone));
        if (snap.exists()) return alert("❌ 此手機已註冊過，請直接登入！");
        await setDoc(doc(db, "members", phone), { name, phone, password });
        alert("🎉 註冊成功！系統將自動登入。");
        doLogin(phone, name);
    } catch (e) { alert("註冊失敗：" + e.message); }
};

function doLogin(phone, name) {
    userPhone = phone;
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('userWelcome').innerText = `你好，${name} 🐾`;
    fetchMyPets();
    fetchMyBookings();
}

document.getElementById('logoutBtn').onclick = () => {
    userPhone = null;
    document.getElementById('phoneInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
};

// ════════════════════════════════════════════
// 服務切換（洗澡美容 / 星級住宿）
// ════════════════════════════════════════════
document.getElementById('serviceSelect').addEventListener('change', (e) => {
    const isBoarding = e.target.value === '星級住宿';
    document.getElementById('groomingBox').classList.toggle('hidden', isBoarding);
    document.getElementById('boardingBox').classList.toggle('hidden', !isBoarding);
});

// ════════════════════════════════════════════
// 寵物選擇 → 帶入資料預覽 & 過濾服務
// ════════════════════════════════════════════
document.getElementById('petSelect').addEventListener('change', async (e) => {
    const petId = e.target.value;
    const preview = document.getElementById('petInfoPreview');
    const serviceSelect = document.getElementById('serviceSelect');

    if (!petId) {
        preview.classList.add('hidden');
        // 恢復全部服務選項
        Array.from(serviceSelect.options).forEach(o => o.hidden = false);
        return;
    }

    try {
        const snap = await getDoc(doc(db, "pets", petId));
        if (!snap.exists()) return;
        const p = snap.data();

        // 計算年齡
        let ageStr = '';
        if (p.birthday) {
            const age = Math.floor((new Date() - new Date(p.birthday)) / (365.25 * 24 * 3600 * 1000));
            ageStr = `${age} 歲`;
        }

        preview.innerHTML = `
            ${p.petType} <b>${p.petName}</b>（${p.breed || '品種未填'}，${ageStr}）<br>
            ⚕️ 過敏史：${p.allergy || '無'}　💉 最近疫苗：${p.vaccine || '未填寫'}
        `;
        preview.classList.remove('hidden');

        // 根據種類過濾服務
        const allowed = e.target.selectedOptions[0].dataset.services || 'grooming,boarding';
        Array.from(serviceSelect.options).forEach(opt => {
            if (opt.value === '洗澡美容') opt.hidden = !allowed.includes('grooming');
            if (opt.value === '星級住宿') opt.hidden = !allowed.includes('boarding');
        });
        if (serviceSelect.selectedOptions[0]?.hidden) {
            serviceSelect.value = '星級住宿';
            document.getElementById('groomingBox').classList.add('hidden');
            document.getElementById('boardingBox').classList.remove('hidden');
        }
    } catch (e) { console.error(e); }
});

// ════════════════════════════════════════════
// 送出預約
// ════════════════════════════════════════════
document.getElementById('bookBtn').onclick = async () => {
    const petId = document.getElementById('petSelect').value;
    if (!petId) return alert("⚠️ 請先選擇寵物！");

    const petSnap = await getDoc(doc(db, "pets", petId));
    if (!petSnap.exists()) return alert("⚠️ 找不到寵物資料！");
    const petData = petSnap.data();

    const service = document.getElementById('serviceSelect').value;
    let finalDate = "", finalTime = "", checkDate = "", addOnService = "無";

    if (service === '星級住宿') {
        const startDate = document.getElementById('startDateInput').value;
        const endDate = document.getElementById('endDateInput').value;
        finalTime = document.getElementById('boardingTimeSelect').value;
        if (!startDate || !endDate) return alert("⚠️ 請填寫完整入住與退房日期");
        if (startDate >= endDate) return alert("⚠️ 退房日期必須晚於入住日期！");
        finalDate = `${startDate} 至 ${endDate}`;
        checkDate = startDate;
        if (document.getElementById('addOnGrooming').checked) addOnService = "加購退房前美容服務";
    } else {
        finalDate = document.getElementById('dateInput').value;
        finalTime = document.getElementById('timeSelect').value;
        if (!finalDate) return alert("⚠️ 請選擇預約日期");
        checkDate = finalDate;
    }

    // 防撞檢查
    const q = query(collection(db, "bookings"), where("date", "==", checkDate));
    const checkSnap = await getDocs(q);
    let isConflict = false;
    checkSnap.forEach(d => {
        const b = d.data();
        if (b.time === finalTime && b.status !== "Cancelled") isConflict = true;
    });
    if (isConflict) return alert(`⚠️ 抱歉！${checkDate} 的 ${finalTime} 時段已客滿，請選擇其他時段。`);

    try {
        await addDoc(collection(db, "bookings"), {
            ownerId: userPhone,
            petId: petId,
            petName: petData.petName,
            petType: petData.petType,
            service,
            date: finalDate,
            time: finalTime,
            addOn: addOnService,
            status: "Pending"
        });
        alert("🎉 預約成功！請等候櫃台人員確認。");
        document.getElementById('addOnGrooming').checked = false;
        fetchMyBookings();
    } catch (e) { alert("預約失敗: " + e); }
};

// ════════════════════════════════════════════
// 寵物檔案
// ════════════════════════════════════════════
async function fetchMyPets() {
    const q = query(collection(db, "pets"), where("ownerId", "==", userPhone));
    const snap = await getDocs(q);
    const listEl = document.getElementById('petsList');
    const selectEl = document.getElementById('petSelect');

    listEl.innerHTML = '';
    selectEl.innerHTML = '<option value="">— 請選擇已建立的寵物 —</option>';

    if (snap.empty) {
        listEl.innerHTML = '<p style="color:var(--muted);font-size:14px;margin-bottom:16px;">尚未建立任何寵物檔案，請在下方新增。</p>';
        return;
    }

    snap.forEach(d => {
        const p = d.data();
        const id = d.id;

        let ageStr = '';
        if (p.birthday) {
            const age = Math.floor((new Date() - new Date(p.birthday)) / (365.25 * 24 * 3600 * 1000));
            ageStr = `${age} 歲`;
        }

        listEl.innerHTML += `
            <div class="pet-card">
                <div>
                    <div class="pet-card-name">${p.petType} ${p.petName}</div>
                    <div class="pet-card-info">
                        品種：${p.breed || '未填'}　生日：${p.birthday || '未填'}（${ageStr}）<br>
                        過敏史：${p.allergy || '無'}　最近疫苗：${p.vaccine || '未填'}
                    </div>
                </div>
                <button class="pet-card-delete" onclick="deletePet('${id}')">刪除</button>
            </div>`;

        // 加進預約下拉選單
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `${p.petType} ${p.petName}`;
        opt.dataset.services = p.petType.includes('倉鼠') || p.petType.includes('兔子') ? 'boarding' : 'grooming,boarding';
        selectEl.appendChild(opt);
    });
}

document.getElementById('savePetBtn').onclick = async () => {
    const petName = document.getElementById('newPetName').value.trim();
    const petType = document.getElementById('newPetType').value;
    const breed   = document.getElementById('newPetBreed').value.trim();
    const birthday = document.getElementById('newPetBirthday').value;
    const allergy  = document.getElementById('newPetAllergy').value.trim();
    const vaccine  = document.getElementById('newPetVaccine').value;

    if (!petName) return alert("⚠️ 請填寫寵物名字！");

    const petId = `${userPhone}_${petName}`;
    try {
        await setDoc(doc(db, "pets", petId), { ownerId: userPhone, petName, petType, breed, birthday, allergy, vaccine });
        alert(`✅ ${petName} 的檔案已儲存！`);
        document.getElementById('newPetName').value = '';
        document.getElementById('newPetBreed').value = '';
        document.getElementById('newPetBirthday').value = '';
        document.getElementById('newPetAllergy').value = '';
        document.getElementById('newPetVaccine').value = '';
        fetchMyPets();
    } catch (e) { alert("儲存失敗：" + e.message); }
};

window.deletePet = async (petId) => {
    if (!confirm("確定要刪除這筆寵物檔案嗎？")) return;
    try {
        await deleteDoc(doc(db, "pets", petId));
        alert("✅ 已刪除！");
        fetchMyPets();
    } catch (e) { alert("刪除失敗：" + e.message); }
};

// ════════════════════════════════════════════
// 預約紀錄
// ════════════════════════════════════════════
async function fetchMyBookings() {
    const q = query(collection(db, "bookings"), where("ownerId", "==", userPhone));
    const snap = await getDocs(q);
    const tbody = document.getElementById('myBookingsTable');
    tbody.innerHTML = '';

    if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;font-size:13px;">目前尚無預約紀錄</td></tr>';
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

        let actionBtn = (b.status === 'Pending' || b.status === 'Confirmed')
            ? `<button onclick="cancelMyBooking('${docId}')" style="background:none;border:1px solid #e74c3c;color:#e74c3c;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;">取消</button>`
            : `<span style="color:#ccc;font-size:12px;">—</span>`;

        let serviceDisplay = b.service;
        if (b.addOn && b.addOn !== "無") serviceDisplay += `<br><span style="color:var(--caramel);font-size:11px;">[${b.addOn}]</span>`;

        tbody.innerHTML += `
            <tr>
                <td style="line-height:1.6;">${b.date}<br><b>${b.time}</b></td>
                <td>
                    <b>${b.petName}</b> <span style="font-size:11px;color:var(--muted);">${b.petType || ''}</span>
                    <br><span style="font-size:12px;color:var(--muted);">${serviceDisplay}</span>
                </td>
                <td><span class="badge" style="background:${bc.bg};color:${bc.color};">${b.status}</span></td>
                <td>${actionBtn}</td>
            </tr>`;
    });
}

window.cancelMyBooking = async (docId) => {
    if (!confirm("確定要取消這筆預約嗎？")) return;
    try {
        await updateDoc(doc(db, "bookings", docId), { status: "Cancelled" });
        alert("✅ 預約已成功取消！");
        fetchMyBookings();
    } catch (e) { alert("取消失敗：" + e.message); }
};

// ════════════════════════════════════════════
// 營業日曆
// ════════════════════════════════════════════
const TOTAL_SLOTS = 5; // 每日最多時段數
let calYear, calMonth;

async function renderCalendar(year, month) {
    calYear = year;
    calMonth = month;

    const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    document.getElementById('calMonthLabel').textContent = `${year} 年 ${months[month]}`;

    const daysEl = document.getElementById('calDays');
    daysEl.innerHTML = '<div class="cal-loading">載入中...</div>';

    // 查詢該月所有 bookings
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const padStart = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const padEnd   = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;

    const q = query(collection(db, "bookings"), where("status", "!=", "Cancelled"));
    const snap = await getDocs(q);

    // 統計每天的預約數
    const bookingCount = {};
    snap.forEach(d => {
        const dateStr = d.data().date; // e.g. "2024-06-15" or "2024-06-15 至 2024-06-18"
        const mainDate = dateStr.split(' ')[0];
        if (mainDate >= padStart && mainDate <= padEnd) {
            bookingCount[mainDate] = (bookingCount[mainDate] || 0) + 1;
        }
    });

    // 渲染格子
    daysEl.innerHTML = '';
    const startDow = firstDay.getDay(); // 0=Sun
    const today = new Date();
    today.setHours(0,0,0,0);

    // 空格
    for (let i = 0; i < startDow; i++) {
        daysEl.innerHTML += `<div class="cal-day empty"></div>`;
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dateObj = new Date(year, month, d);
        const count   = bookingCount[dateStr] || 0;
        const isToday = dateObj.getTime() === today.getTime();
        const isPast  = dateObj < today;

        let cls = 'cal-day';
        if (isPast) cls += ' past';
        else if (count >= TOTAL_SLOTS) cls += ' full';
        else if (count >= TOTAL_SLOTS - 2) cls += ' partial';
        else cls += ' available';
        if (isToday) cls += ' today';

        let onclick = '';
        if (!isPast && count < TOTAL_SLOTS) {
            onclick = `onclick="calJumpToBooking('${dateStr}')"`;
        }

        daysEl.innerHTML += `
            <div class="${cls}" ${onclick}>
                <span class="cal-day-num">${d}</span>
                <span class="cal-day-dot"></span>
            </div>`;
    }
}

window.calJumpToBooking = (dateStr) => {
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
    // 帶入日期到表單（若已登入）
    setTimeout(() => {
        const dateInput = document.getElementById('dateInput');
        const startInput = document.getElementById('startDateInput');
        if (dateInput) dateInput.value = dateStr;
        if (startInput) startInput.value = dateStr;
    }, 600);
};

document.getElementById('calPrev').onclick = () => {
    let m = calMonth - 1, y = calYear;
    if (m < 0) { m = 11; y--; }
    renderCalendar(y, m);
};

document.getElementById('calNext').onclick = () => {
    let m = calMonth + 1, y = calYear;
    if (m > 11) { m = 0; y++; }
    renderCalendar(y, m);
};

// 初始化日曆
const now = new Date();
renderCalendar(now.getFullYear(), now.getMonth());