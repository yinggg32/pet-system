import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc, deleteDoc, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
let userPhone = null;
let msgUnsubscribe = null;

const GROOMING_SLOTS    = ['10:00','11:00','14:00','15:00','16:00'];
let   BOARDING_CAPACITY = 10;

async function loadSettings() {
    try {
        const snap = await getDoc(doc(db, "settings", "capacity"));
        if (snap.exists() && snap.data().boardingRooms) BOARDING_CAPACITY = snap.data().boardingRooms;
    } catch(e) { console.warn("settings 讀取失敗", e); }
}
loadSettings();

// ════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════
document.getElementById('loginBtn').onclick = async () => {
    const phone    = document.getElementById('phoneInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    if (!phone || !password) return alert("⚠️ 請輸入手機號碼與密碼");
    try {
        const snap = await getDoc(doc(db, "members", phone));
        if (snap.exists() && snap.data().password === password) {
            doLogin(phone, snap.data().name);
        } else { alert("❌ 帳號或密碼錯誤！"); }
    } catch(e) { alert("登入失敗：" + e.message); }
};

document.getElementById('registerBtn').onclick = async () => {
    const phone    = document.getElementById('phoneInputReg').value.trim();
    const password = document.getElementById('passwordInputReg').value.trim();
    const name     = document.getElementById('nameInput').value.trim();
    if (!phone || !name || !password) return alert("⚠️ 請填寫完整資料！");
    try {
        const snap = await getDoc(doc(db, "members", phone));
        if (snap.exists()) return alert("❌ 此手機已註冊過，請直接登入！");
        await setDoc(doc(db, "members", phone), { name, phone, password });
        alert("🎉 註冊成功！系統將自動登入。");
        doLogin(phone, name);
    } catch(e) { alert("註冊失敗：" + e.message); }
};

function doLogin(phone, name) {
    userPhone = phone;
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('userWelcome').innerText = `你好，${name} 🐾`;
    fetchMyPets();
    fetchMyBookings();
    subscribeMessages();
}

document.getElementById('logoutBtn').onclick = () => {
    if (msgUnsubscribe) { msgUnsubscribe(); msgUnsubscribe = null; }
    userPhone = null;
    document.getElementById('phoneInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
};

// ════════════════════════════════════════════
// 時段狀態更新
// ════════════════════════════════════════════
async function updateTimeSlots(dateStr) {
    if (!dateStr) return;
    try {
        const q = query(
            collection(db, "bookings"),
            where("service", "==", "洗澡美容"),
            where("date", "==", dateStr),
            where("status", "in", ["Pending","Confirmed","CheckedIn"])
        );
        const snap = await getDocs(q);
        const bookedTimes = new Set();
        snap.forEach(d => bookedTimes.add(d.data().time));

        const timeSelect = document.getElementById('timeSelect');
        Array.from(timeSelect.options).forEach(opt => {
            opt.text = opt.text.replace('（已被預約）','').trim();
            if (bookedTimes.has(opt.value)) { opt.disabled = true; opt.text += '（已被預約）'; }
            else opt.disabled = false;
        });
        if (timeSelect.selectedOptions[0]?.disabled) {
            const first = Array.from(timeSelect.options).find(o => !o.disabled);
            if (first) timeSelect.value = first.value;
        }
    } catch(e) { console.error("時段載入失敗", e); }
}

document.getElementById('dateInput').addEventListener('change', e => updateTimeSlots(e.target.value));

// ════════════════════════════════════════════
// 服務切換
// ════════════════════════════════════════════
document.getElementById('serviceSelect').addEventListener('change', (e) => {
    const isBoarding = e.target.value === '星級住宿';
    document.getElementById('groomingBox').classList.toggle('hidden', isBoarding);
    document.getElementById('boardingBox').classList.toggle('hidden', !isBoarding);
});

// ════════════════════════════════════════════
// 寵物選擇
// ════════════════════════════════════════════
document.getElementById('petSelect').addEventListener('change', async (e) => {
    const petId   = e.target.value;
    const preview = document.getElementById('petInfoPreview');
    const serviceSelect = document.getElementById('serviceSelect');
    if (!petId) { preview.classList.add('hidden'); Array.from(serviceSelect.options).forEach(o => o.hidden = false); return; }
    try {
        const snap = await getDoc(doc(db, "pets", petId));
        if (!snap.exists()) return;
        const p = snap.data();
        let ageStr = '';
        if (p.birthday) {
            const age = Math.floor((new Date() - new Date(p.birthday)) / (365.25*24*3600*1000));
            ageStr = `${age} 歲`;
        }
        preview.innerHTML = `${p.petType} <b>${p.petName}</b>（${p.breed||'品種未填'}，${ageStr}）<br>⚕️ 過敏史：${p.allergy||'無'}　💉 最近疫苗：${p.vaccine||'未填寫'}`;
        preview.classList.remove('hidden');
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
    } catch(e) { console.error(e); }
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
        const endDate   = document.getElementById('endDateInput').value;
        finalTime = document.getElementById('boardingTimeSelect').value;
        if (!startDate || !endDate) return alert("⚠️ 請填寫完整入住與退房日期");
        if (startDate >= endDate)   return alert("⚠️ 退房日期必須晚於入住日期！");
        finalDate = `${startDate} 至 ${endDate}`;
        checkDate = startDate;
        if (document.getElementById('addOnGrooming').checked) addOnService = "加購退房前美容服務";
    } else {
        finalDate = document.getElementById('dateInput').value;
        finalTime = document.getElementById('timeSelect').value;
        if (!finalDate) return alert("⚠️ 請選擇預約日期");
        if (document.getElementById('timeSelect').selectedOptions[0]?.disabled) return alert("⚠️ 此時段已被預約，請選擇其他時段！");
        checkDate = finalDate;
    }

    const q = query(collection(db, "bookings"), where("service","==",service), where("status","in",["Pending","Confirmed","CheckedIn"]));
    const checkSnap = await getDocs(q);

    if (service === '洗澡美容') {
        let conflict = false;
        checkSnap.forEach(d => { const b = d.data(); if (b.date === checkDate && b.time === finalTime) conflict = true; });
        if (conflict) return alert(`⚠️ ${checkDate} 的 ${finalTime} 美容時段已額滿，請選擇其他時段。`);
    } else {
        let occupancy = 0;
        checkSnap.forEach(d => {
            const parts = d.data().date.split(' 至 ');
            if (parts.length === 2 && parts[0] <= checkDate && checkDate < parts[1]) occupancy++;
        });
        if (occupancy >= BOARDING_CAPACITY) return alert(`⚠️ ${checkDate} 住宿房間已客滿（${BOARDING_CAPACITY} 間），請選擇其他日期。`);
    }

    try {
        const bookingRef = await addDoc(collection(db, "bookings"), {
            ownerId: userPhone, petId, petName: petData.petName, petType: petData.petType,
            service, date: finalDate, time: finalTime, addOn: addOnService,
            status: "Pending", createdAt: new Date().toISOString()
        });

        // 預約成功 → 自動發系統通知訊息
        await addDoc(collection(db, "messages"), {
            ownerId: userPhone,
            bookingId: bookingRef.id,
            sender: "system",
            content: `✅ 預約申請已收到！\n服務：${service}\n日期：${finalDate}（${finalTime}）\n寵物：${petData.petName}\n\n請稍候，我們將盡快確認您的預約。`,
            createdAt: serverTimestamp(),
            read: false
        });

        alert("🎉 預約成功！請等候櫃台人員確認，系統通知已送至您的訊息匣。");
        document.getElementById('addOnGrooming').checked = false;
        updateTimeSlots(checkDate);
        fetchMyBookings();
        renderCalendar(window.calYear, window.calMonth);
    } catch(e) { alert("預約失敗: " + e); }
};

// ════════════════════════════════════════════
// 寵物檔案
// ════════════════════════════════════════════
async function fetchMyPets() {
    const q    = query(collection(db, "pets"), where("ownerId","==",userPhone));
    const snap = await getDocs(q);
    const listEl   = document.getElementById('petsList');
    const selectEl = document.getElementById('petSelect');
    listEl.innerHTML   = '';
    selectEl.innerHTML = '<option value="">— 請選擇已建立的寵物 —</option>';
    if (snap.empty) { listEl.innerHTML = '<p style="color:var(--muted);font-size:14px;margin-bottom:16px;">尚未建立任何寵物檔案，請在下方新增。</p>'; return; }
    snap.forEach(d => {
        const p = d.data(); const id = d.id;
        let ageStr = '';
        if (p.birthday) { const age = Math.floor((new Date()-new Date(p.birthday))/(365.25*24*3600*1000)); ageStr = `${age} 歲`; }
        listEl.innerHTML += `<div class="pet-card"><div><div class="pet-card-name">${p.petType} ${p.petName}</div><div class="pet-card-info">品種：${p.breed||'未填'}　生日：${p.birthday||'未填'}（${ageStr}）<br>過敏史：${p.allergy||'無'}　最近疫苗：${p.vaccine||'未填'}</div></div><button class="pet-card-delete" onclick="deletePet('${id}')">刪除</button></div>`;
        const opt = document.createElement('option');
        opt.value = id; opt.textContent = `${p.petType} ${p.petName}`;
        opt.dataset.services = (p.petType.includes('倉鼠')||p.petType.includes('兔子')) ? 'boarding' : 'grooming,boarding';
        selectEl.appendChild(opt);
    });
}

document.getElementById('savePetBtn').onclick = async () => {
    const petName  = document.getElementById('newPetName').value.trim();
    const petType  = document.getElementById('newPetType').value;
    const breed    = document.getElementById('newPetBreed').value.trim();
    const birthday = document.getElementById('newPetBirthday').value;
    const allergy  = document.getElementById('newPetAllergy').value.trim();
    const vaccine  = document.getElementById('newPetVaccine').value;
    if (!petName) return alert("⚠️ 請填寫寵物名字！");
    try {
        await setDoc(doc(db, "pets", `${userPhone}_${petName}`), { ownerId:userPhone, petName, petType, breed, birthday, allergy, vaccine });
        alert(`✅ ${petName} 的檔案已儲存！`);
        ['newPetName','newPetBreed','newPetAllergy'].forEach(id => document.getElementById(id).value = '');
        ['newPetBirthday','newPetVaccine'].forEach(id => document.getElementById(id).value = '');
        fetchMyPets();
    } catch(e) { alert("儲存失敗：" + e.message); }
};

window.deletePet = async (petId) => {
    if (!confirm("確定要刪除這筆寵物檔案嗎？")) return;
    try { await deleteDoc(doc(db, "pets", petId)); alert("✅ 已刪除！"); fetchMyPets(); }
    catch(e) { alert("刪除失敗：" + e.message); }
};

// ════════════════════════════════════════════
// 預約紀錄
// ════════════════════════════════════════════
async function fetchMyBookings() {
    const q    = query(collection(db, "bookings"), where("ownerId","==",userPhone));
    const snap = await getDocs(q);
    const tbody = document.getElementById('myBookingsTable');
    tbody.innerHTML = '';
    if (snap.empty) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;font-size:13px;">目前尚無預約紀錄</td></tr>'; return; }
    const badgeColors = { Pending:{bg:'#fff3e0',color:'#e65100'}, Confirmed:{bg:'#e3f2fd',color:'#1565c0'}, CheckedIn:{bg:'#e8f5e9',color:'#2e7d32'}, Completed:{bg:'#f3e5f5',color:'#6a1b9a'}, Cancelled:{bg:'#ffebee',color:'#c62828'} };
    const docs = [];
    snap.forEach(d => docs.push({id:d.id,...d.data()}));
    docs.sort((a,b) => (b.createdAt||'')>(a.createdAt||'') ? 1 : -1);
    docs.forEach(b => {
        const bc = badgeColors[b.status]||{bg:'#eee',color:'#333'};
        const actionBtn = (b.status==='Pending'||b.status==='Confirmed')
            ? `<button onclick="cancelMyBooking('${b.id}')" style="background:none;border:1px solid #e74c3c;color:#e74c3c;padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;">取消</button>`
            : `<span style="color:#ccc;font-size:12px;">—</span>`;
        let serviceDisplay = b.service;
        if (b.addOn && b.addOn !== "無") serviceDisplay += `<br><span style="color:var(--caramel);font-size:11px;">[${b.addOn}]</span>`;
        tbody.innerHTML += `<tr><td style="line-height:1.6;">${b.date}<br><b>${b.time}</b></td><td><b>${b.petName}</b> <span style="font-size:11px;color:var(--muted);">${b.petType||''}</span><br><span style="font-size:12px;color:var(--muted);">${serviceDisplay}</span></td><td><span class="badge" style="background:${bc.bg};color:${bc.color};">${b.status}</span></td><td>${actionBtn}</td></tr>`;
    });
}

window.cancelMyBooking = async (docId) => {
    if (!confirm("確定要取消這筆預約嗎？")) return;
    try {
        await updateDoc(doc(db, "bookings", docId), { status: "Cancelled" });
        // 發取消通知訊息
        await addDoc(collection(db, "messages"), {
            ownerId: userPhone, bookingId: docId, sender: "system",
            content: "您已取消此筆預約。如有需要請重新預約或聯繫我們。",
            createdAt: serverTimestamp(), read: false
        });
        alert("✅ 預約已成功取消！");
        const dateInput = document.getElementById('dateInput');
        if (dateInput.value) updateTimeSlots(dateInput.value);
        fetchMyBookings();
        renderCalendar(window.calYear, window.calMonth);
    } catch(e) { alert("取消失敗：" + e.message); }
};

// ════════════════════════════════════════════
// 訊息系統（顧客端）
// ════════════════════════════════════════════
function subscribeMessages() {
    if (msgUnsubscribe) msgUnsubscribe();
    // 不用 orderBy 避免需要複合索引，改為前端排序
    const q = query(
        collection(db, "messages"),
        where("ownerId","==",userPhone)
    );
    msgUnsubscribe = onSnapshot(q, (snap) => {
        // 前端按 createdAt 排序
        const sorted = [];
        snap.forEach(d => sorted.push({ id: d.id, ...d.data() }));
        sorted.sort((a, b) => {
            const ta = a.createdAt?.seconds || 0;
            const tb = b.createdAt?.seconds || 0;
            return ta - tb;
        });
        renderMessagesSorted(sorted);
        updateUnreadBadgeFromArray(sorted);
    }, (err) => console.error("訊息監聽失敗", err));
}

function renderMessagesSorted(msgs) {
    const thread = document.getElementById('msgThread');
    if (!thread) return;
    thread.innerHTML = '';
    if (msgs.length === 0) {
        thread.innerHTML = '<div class="msg-empty">目前沒有訊息<br><small>預約後系統將自動通知您</small></div>';
        return;
    }
    msgs.forEach(m => {
        const timeStr = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString('zh-TW', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
        // 顧客自己的訊息靠右，旅館/系統靠左
        const cls = m.sender === 'customer' ? 'customer' : m.sender === 'admin' ? 'admin' : 'system';
        const bubble = document.createElement('div');
        bubble.className = `msg-bubble ${cls}`;
        const label = cls === 'admin' ? '<div style="font-size:10px;opacity:0.6;margin-bottom:3px;">🏨 旅館客服</div>' : '';
        bubble.innerHTML = `${label}<div style="white-space:pre-wrap;">${m.content}</div><div class="msg-meta">${timeStr}</div>`;
        thread.appendChild(bubble);
    });
    thread.scrollTop = thread.scrollHeight;
}

function updateUnreadBadgeFromArray(msgs) {
    const badge = document.getElementById('msgUnreadBadge');
    if (!badge) return;
    const isOpen = !document.getElementById('tabMessages')?.classList.contains('hidden');
    const unread = msgs.filter(m => !m.read && m.sender !== 'customer').length;
    if (unread > 0 && !isOpen) {
        badge.textContent = unread;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

window.markMessagesRead = async () => {
    if (!userPhone) return;
    const badge = document.getElementById('msgUnreadBadge');
    if (badge) badge.classList.add('hidden');
    try {
        const q = query(collection(db, "messages"), where("ownerId","==",userPhone));
        const snap = await getDocs(q);
        const promises = [];
        snap.forEach(d => { if (!d.data().read && d.data().sender !== 'customer') promises.push(updateDoc(doc(db,"messages",d.id),{read:true})); });
        await Promise.all(promises);
    } catch(e) { console.error(e); }
};

// 送出訊息
document.getElementById('msgSendBtn').onclick = sendMessage;
document.getElementById('msgInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

async function sendMessage() {
    const input = document.getElementById('msgInput');
    const content = input.value.trim();
    if (!content || !userPhone) return;
    input.value = '';
    try {
        await addDoc(collection(db, "messages"), {
            ownerId: userPhone, sender: "customer",
            content, createdAt: serverTimestamp(), read: false
        });
    } catch(e) { alert("訊息發送失敗：" + e.message); }
}

// ════════════════════════════════════════════
// 日曆
// ════════════════════════════════════════════
window.currentCalType = 'grooming';
window.calYear  = new Date().getFullYear();
window.calMonth = new Date().getMonth();

async function renderCalendar(year, month) {
    window.calYear = year; window.calMonth = month;
    const type = window.currentCalType;
    const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    document.getElementById('calMonthLabel').textContent = `${year} 年 ${months[month]}`;
    const daysEl = document.getElementById('calDays');
    daysEl.innerHTML = '<div class="cal-loading">載入中...</div>';
    const lastDay  = new Date(year, month+1, 0);
    const padMonth = String(month+1).padStart(2,'0');
    const padStart = `${year}-${padMonth}-01`;
    const padEnd   = `${year}-${padMonth}-${String(lastDay.getDate()).padStart(2,'0')}`;
    const q = query(collection(db,"bookings"), where("service","==",type==='grooming'?'洗澡美容':'星級住宿'), where("status","in",["Pending","Confirmed","CheckedIn"]));
    const snap = await getDocs(q);
    const dayData = {};
    snap.forEach(d => {
        const b = d.data();
        if (type === 'grooming') {
            if (b.date >= padStart && b.date <= padEnd) { if (!dayData[b.date]) dayData[b.date] = new Set(); dayData[b.date].add(b.time); }
        } else {
            const parts = b.date.split(' 至 ');
            if (parts.length === 2) {
                const [s,e] = parts;
                for (let d2=1; d2<=lastDay.getDate(); d2++) {
                    const ds = `${year}-${padMonth}-${String(d2).padStart(2,'0')}`;
                    if (s<=ds && ds<e) dayData[ds] = (dayData[ds]||0)+1;
                }
            }
        }
    });
    daysEl.innerHTML = '';
    const firstDow = new Date(year,month,1).getDay();
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i=0; i<firstDow; i++) daysEl.innerHTML += `<div class="cal-day empty"></div>`;
    for (let d2=1; d2<=lastDay.getDate(); d2++) {
        const ds = `${year}-${padMonth}-${String(d2).padStart(2,'0')}`;
        const dateObj = new Date(year,month,d2);
        const isPast  = dateObj < today;
        const isToday = dateObj.getTime() === today.getTime();
        let cls='cal-day', subText='', onclick='';
        if (isPast) { cls+=' past'; }
        else if (type==='grooming') {
            const booked = dayData[ds] ? dayData[ds].size : 0;
            const total  = GROOMING_SLOTS.length;
            if (booked>=total)       { cls+=' full';      subText='已滿'; }
            else if (booked>=total-2){ cls+=' partial';   subText=`剩 ${total-booked} 時段`; onclick=`onclick="calJumpToBooking('${ds}','grooming')"`; }
            else                     { cls+=' available'; subText=`${total-booked} 時段`;    onclick=`onclick="calJumpToBooking('${ds}','grooming')"`; }
        } else {
            const occ = dayData[ds]||0;
            if (occ>=BOARDING_CAPACITY)       { cls+=' full';      subText='已滿'; }
            else if (occ>=BOARDING_CAPACITY-3){ cls+=' partial';   subText=`剩 ${BOARDING_CAPACITY-occ} 間`; onclick=`onclick="calJumpToBooking('${ds}','boarding')"`; }
            else                              { cls+=' available'; subText=`${BOARDING_CAPACITY-occ} 間`;    onclick=`onclick="calJumpToBooking('${ds}','boarding')"`; }
        }
        if (isToday) cls+=' today';
        daysEl.innerHTML += `<div class="${cls}" ${onclick}><span class="cal-day-num">${d2}</span><span class="cal-day-sub">${subText}</span></div>`;
    }
}

window.calJumpToBooking = (dateStr, type) => {
    window.currentCalType = type;
    document.getElementById('calTabGrooming').classList.toggle('active', type==='grooming');
    document.getElementById('calTabBoarding').classList.toggle('active', type==='boarding');
    document.getElementById('booking').scrollIntoView({behavior:'smooth'});
    setTimeout(() => {
        const serviceSelect = document.getElementById('serviceSelect');
        if (type==='grooming') {
            serviceSelect.value = '洗澡美容';
            document.getElementById('groomingBox').classList.remove('hidden');
            document.getElementById('boardingBox').classList.add('hidden');
            const di = document.getElementById('dateInput');
            if (di) { di.value = dateStr; updateTimeSlots(dateStr); }
        } else {
            serviceSelect.value = '星級住宿';
            document.getElementById('groomingBox').classList.add('hidden');
            document.getElementById('boardingBox').classList.remove('hidden');
            const si = document.getElementById('startDateInput');
            if (si) si.value = dateStr;
        }
    }, 700);
};

window.renderCalendar = renderCalendar;
document.getElementById('calPrev').onclick = () => { let m=window.calMonth-1,y=window.calYear; if(m<0){m=11;y--;} renderCalendar(y,m); };
document.getElementById('calNext').onclick = () => { let m=window.calMonth+1,y=window.calYear; if(m>11){m=0;y++;} renderCalendar(y,m); };
renderCalendar(window.calYear, window.calMonth);