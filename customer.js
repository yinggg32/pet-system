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
let currentPhone = null;

// UI 切換邏輯
document.getElementById('showRegBtn').onclick = () => {
    document.getElementById('registerFields').classList.remove('hidden');
    document.getElementById('registerBtn').classList.remove('hidden');
    document.getElementById('cancelRegBtn').classList.remove('hidden');
    document.getElementById('loginBtn').classList.add('hidden');
    document.getElementById('showRegBtn').classList.add('hidden');
};
document.getElementById('cancelRegBtn').onclick = () => {
    document.getElementById('registerFields').classList.add('hidden');
    document.getElementById('registerBtn').classList.add('hidden');
    document.getElementById('cancelRegBtn').classList.add('hidden');
    document.getElementById('loginBtn').classList.remove('hidden');
    document.getElementById('showRegBtn').classList.remove('hidden');
};

// 註冊功能
document.getElementById('registerBtn').onclick = async () => {
    const phone = document.getElementById('phoneInput').value.trim();
    const name = document.getElementById('nameInput').value.trim();
    if (!phone || !name) return alert("手機與姓名不可為空！");

    try {
        const docRef = doc(db, "members", phone);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return alert("此手機已註冊過，請直接登入！");

        await setDoc(docRef, { name: name, phone: phone });
        alert("註冊成功！自動為您登入。");
        executeLogin(phone, name);
    } catch (error) { alert("註冊失敗：" + error.message); }
};

// 登入功能
document.getElementById('loginBtn').onclick = async () => {
    const phone = document.getElementById('phoneInput').value.trim();
    if (!phone) return alert("請輸入手機號碼");

    try {
        const docRef = doc(db, "members", phone);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            executeLogin(phone, docSnap.data().name);
        } else {
            alert("找不到此會員，請先註冊！");
        }
    } catch (error) { alert("登入失敗：" + error.message); }
};

function executeLogin(phone, name) {
    currentPhone = phone;
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('welcomeMsg').innerText = `歡迎回來，${name}！`;
    fetchMyBookings();
}

document.getElementById('logoutBtn').onclick = () => {
    currentPhone = null;
    document.getElementById('phoneInput').value = '';
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
};

// 新增預約
document.getElementById('bookBtn').onclick = async () => {
    const petName = document.getElementById('petNameInput').value.trim();
    const service = document.getElementById('serviceSelect').value;
    if (!petName) return alert("請輸入寵物名字！");

    const randomId = "B-" + Math.floor(1000 + Math.random() * 9000);
    try {
        await addDoc(collection(db, "bookings"), {
            bookingId: randomId,
            ownerId: currentPhone,
            petName: petName,
            service: service,
            status: "Pending"
        });
        alert("✅ 預約單已送出！");
        document.getElementById('petNameInput').value = '';
        fetchMyBookings();
    } catch (error) { alert("預約失敗：" + error.message); }
};

// 讀取個人預約
async function fetchMyBookings() {
    const q = query(collection(db, "bookings"), where("ownerId", "==", currentPhone));
    const querySnapshot = await getDocs(q);
    const tbody = document.getElementById('myBookingsTable');
    tbody.innerHTML = '';
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        let color = data.status === 'Cancelled' ? '#d9534f' : (data.status === 'CheckedIn' ? '#5cb85c' : '#f0ad4e');
        tbody.innerHTML += `<tr><td>${data.bookingId}</td><td>${data.petName}</td><td>${data.service}</td><td style="color:${color}; font-weight:bold;">${data.status}</td></tr>`;
    });
}