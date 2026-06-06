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

// 預約功能 (包含防撞機制！)
document.getElementById('bookBtn').onclick = async () => {
    const pet = document.getElementById('petNameInput').value;
    const service = document.getElementById('serviceSelect').value;
    const date = document.getElementById('dateInput').value;
    const time = document.getElementById('timeSelect').value;

    if(!pet || !date) return alert("請填寫完整日期與寵物名字");

    // 【防撞機制核心】: 查詢該時段是否已有預約
    const q = query(collection(db, "bookings"),
        where("date", "==", date),
        where("time", "==", time),
        where("status", "!=", "Cancelled") // 已取消的時段不算
    );

    const checkSnap = await getDocs(q);
    if(!checkSnap.empty) {
        return alert(`⚠️ 抱歉！${date} ${time} 這個時段已經有人預約了，請選擇其他時段。`);
    }

    try {
        await addDoc(collection(db, "bookings"), {
            ownerId: userPhone,
            petName: pet,
            service: service,
            date: date,
            time: time,
            status: "Pending", // 預設為待確認
            createdAt: new Date()
        });
        alert("🎉 預約成功！請等候櫃台人員確認。");
        fetchMyBookings();
    } catch(e) { alert("失敗:" + e); }
};

async function fetchMyBookings() {
    const q = query(collection(db, "bookings"), where("ownerId", "==", userPhone));
    const snap = await getDocs(q);
    const tbody = document.getElementById('myBookingsTable');
    tbody.innerHTML = '';
    snap.forEach(d => {
        const b = d.data();
        let badge = b.status === 'Pending' ? '#f39c12' : (b.status === 'Confirmed' ? '#3498db' : (b.status === 'CheckedIn' ? '#27ae60' : '#e74c3c'));
        tbody.innerHTML += `<tr><td>${b.date} ${b.time}</td><td>${b.petName}</td><td><span class="status-badge" style="background:${badge}; color:white">${b.status}</span></td></tr>`;
    });
}