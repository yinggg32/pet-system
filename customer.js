import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// UI 切換
document.getElementById('toggleRegBtn').onclick = () => {
    document.getElementById('regFields').classList.toggle('hidden');
    document.getElementById('registerBtn').classList.toggle('hidden');
    document.getElementById('loginBtn').classList.toggle('hidden');
    document.getElementById('toggleRegBtn').innerText = document.getElementById('regFields').classList.contains('hidden') ? "還不是會員？我要註冊" : "已有帳號？返回登入";
};

// 註冊
document.getElementById('registerBtn').onclick = async () => {
    const phone = document.getElementById('phoneInput').value;
    const name = document.getElementById('nameInput').value;
    if(!phone || !name) return alert("請填寫完整");
    await setDoc(doc(db, "members", phone), { name, phone });
    alert("註冊成功！");
    doLogin(phone, name);
};

// 登入
document.getElementById('loginBtn').onclick = async () => {
    const phone = document.getElementById('phoneInput').value;
    const snap = await getDoc(doc(db, "members", phone));
    if(snap.exists()) {
        doLogin(phone, snap.data().name);
    } else {
        alert("手機號碼未註冊");
    }
};

function doLogin(phone, name) {
    userPhone = phone;
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('userWelcome').innerText = `你好，${name}！`;
    fetchMyBookings();
}

document.getElementById('logoutBtn').onclick = () => {
    userPhone = null;
    document.getElementById('phoneInput').value = '';
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
};

// 預約功能 (繞過 Firebase 複合索引限制的完美防撞機制)
document.getElementById('bookBtn').onclick = async () => {
    const pet = document.getElementById('petNameInput').value;
    const service = document.getElementById('serviceSelect').value;
    const date = document.getElementById('dateInput').value;
    const time = document.getElementById('timeSelect').value;

    if(!pet || !date) return alert("請填寫完整日期與寵物名字");

    // 先抓出「該日期」的所有預約
    const q = query(collection(db, "bookings"), where("date", "==", date));
    const checkSnap = await getDocs(q);

    let isConflict = false;
    // 在前端用 JS 判斷時段與狀態，避開資料庫報錯
    checkSnap.forEach(d => {
        const b = d.data();
        if (b.time === time && b.status !== "Cancelled") {
            isConflict = true;
        }
    });

    if(isConflict) {
        return alert(`⚠️ 抱歉！${date} ${time} 這個時段已經有人預約了，請選擇其他時段。`);
    }

    try {
        await addDoc(collection(db, "bookings"), {
            ownerId: userPhone,
            petName: pet,
            service: service,
            date: date,
            time: time,
            status: "Pending"
        });
        alert("🎉 預約成功！請等候櫃台人員確認。");
        fetchMyBookings();
    } catch(e) { alert("預約失敗，請檢查連線: " + e); }
};

async function fetchMyBookings() {
    const q = query(collection(db, "bookings"), where("ownerId", "==", userPhone));
    const snap = await getDocs(q);
    const tbody = document.getElementById('myBookingsTable');
    tbody.innerHTML = '';
    snap.forEach(d => {
        const b = d.data();
        let badge = b.status === 'Pending' ? '#f39c12' : (b.status === 'Confirmed' ? '#3498db' : (b.status === 'CheckedIn' ? '#27ae60' : '#e74c3c'));
        tbody.innerHTML += `<tr><td>${b.date} ${b.time}</td><td>${b.petName}</td><td><span style="padding: 4px 10px; border-radius: 12px; background:${badge}; color:white; font-size:12px; font-weight:bold;">${b.status}</span></td></tr>`;
    });
}