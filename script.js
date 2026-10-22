// ১. ফায়ারবেস ডেটাবেস ও টেলিগ্রাম ক্রেডেনশিয়ালস
const FIREBASE_DB_URL = "https://wallet-banking-default-rtdb.firebaseio.com/";
const BOT_TOKEN = "8898294688:AAH6ngVGDHwNJ1Fpri9OiNgd2nqCDvs9BFE"; 
const CHAT_ID = "7560607133";

// এডমিন সিকিউরিটি পাসওয়ার্ড
const ADMIN_SECURITY_PASS = "worldbank1234@#";

// ফিক্সড এক্সচেঞ্জ রেট (USD Base)
const exchangeRatesUSD = {
    "USD": 1.0,
    "BDT": 117.50,
    "MYR": 4.70,
    "SAR": 3.75,
    "AED": 3.67,
    "SGD": 1.35,
    "GBP": 0.79,
    "INR": 83.30,
    "QAR": 3.64,
    "KWD": 0.31,
    "EUR": 0.92
};

// কান্ট্রি কোড ও কারেন্সি সাইন ম্যাপার
const countryCurrencyMap = {
    "+880": "৳",
    "+65": "$",
    "+60": "MYR",
    "+966": "SAR",
    "+971": "AED",
    "+1": "$",
    "+44": "£",
    "+91": "₹",
    "+974": "QAR",
    "+968": "OMR",
    "+965": "KWD"
};

const mandatoryBangladeshBanks = [
    " bKash ",
    " Nagad ",
    " Rocket ",
    " Upay ",
    "🏛️ Dutch Bangla Bank (DBBL)",
    "🏛️ Islami Bank Bangladesh (IBBL)",
    "🏛️ BRAC Bank PLC",
    "🏛️ City Bank PLC",
    "🏛️ Agrani Bank Limited",
    "🏛️ Pubali Bank Limited",
    "🏛️ Sonali Bank Limited",
    "🏛️ Eastern Bank PLC (EBL)",
    "🏛️ IFIC Bank Limited"
];

const countrySpecificBanksWithLogos = {
    "+880": mandatoryBangladeshBanks,
    "+65": ["🔑 POSB Bank (Singapore)", "🏛️ DBS Bank (Singapore)", "🔴 UOB Bank (Singapore)", "📲 PayNow (Singapore)"],
    "+60": ["🟡 Maybank (Malaysia)", "🔴 CIMB Bank (Malaysia)", "🔵 Public Bank (Malaysia)", "📲 Touch 'n Go eWallet"],
    "+966": ["🔵 Al Rajhi Bank (Saudi)", "🟢 SNB AlAhli (Saudi)", "💜 STC Pay (Saudi)"],
    "+971": ["🔵 Emirates NBD (UAE)", "🔴 First Abu Dhabi Bank (UAE)", "📲 e& money (UAE)"],
    "+1": ["🔴 Bank of America (USA)", "🔵 Chase Bank (USA)", "📲 Zelle / Venmo (USA)"]
};

const defaultBalances = { WorldBank: 0.00, bKash: 0.00, Nagad: 0.00, Rocket: 0.00 };

let usersDatabase = [];
let bannedEmails = [];
let allTransactions = [];
let activeUser = JSON.parse(localStorage.getItem('wb_active_session')) || null;
let balanceHideTimer = null;
let currentLang = 'bn';
let tempProfilePhotoBase64 = null;
let cameraStream = null;
let isDarkMode = false;

// --- [নতুন ফিচার ১]: ডার্ক / লাইট মোড সুইচার ---
function toggleTheme() {
    isDarkMode = !isDarkMode;
    const dash = document.getElementById('dashboardSection');
    if (dash) {
        if (isDarkMode) {
            dash.style.background = "#0f172a";
            dash.style.color = "#f8fafc";
        } else {
            dash.style.background = "#f8fafc";
            dash.style.color = "#0f172a";
        }
    }
}

// --- [নতুন ফিচার ২]: লাইভ কারেন্সি কনভার্টার ---
function toggleCurrencyCalcModal() {
    const modal = document.getElementById('currencyCalcModal');
    if (modal) {
        modal.classList.toggle('hidden');
        calculateCurrencyExchange();
    }
}

function calculateCurrencyExchange() {
    const amt = parseFloat(document.getElementById('calcAmountInput').value) || 0;
    const from = document.getElementById('calcFromCurr').value;
    const to = document.getElementById('calcToCurr').value;

    const usdVal = amt / (exchangeRatesUSD[from] || 1);
    const converted = usdVal * (exchangeRatesUSD[to] || 1);

    document.getElementById('calcResultDisp').innerText = `${to} ${converted.toFixed(2)}`;
}

// --- [নতুন ফিচার ৩]: ইন-অ্যাপ নোটিফিকেশন বেল সিস্টেম ---
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
    const myTxs = allTransactions.filter(t => t.userEmail === activeUser.phone && t.status !== 'Pending');

    if (badgeEl) {
        if (myTxs.length > 0) {
            badgeEl.innerText = myTxs.length;
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
        }
    }

    if (myTxs.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; color:#94a3b8; font-size:12px; padding:10px;">কোনো নোটিফিকেশন নেই।</div>`;
        return;
    }

    myTxs.forEach(t => {
        const item = document.createElement('div');
        const isApproved = t.status === 'Approved';
        item.style.cssText = `padding:8px 12px; border-radius:6px; background:${isApproved ? '#d1fae5' : '#fee2e2'}; border:1px solid ${isApproved ? '#10b981' : '#ef4444'}; font-size:11px;`;
        
        item.innerHTML = `
            <strong style="color:${isApproved ? '#047857' : '#b91c1c'}">
                ${isApproved ? '✅ রিকোয়েস্ট অনুমোদিত!' : '❌ রিকোয়েস্ট বাতিল করা হয়েছে'}
            </strong>
            <p style="margin-top:2px; color:#334155;">
                আপনার ${t.type} (${t.currency || '৳'}${t.amount}) রিকোয়েস্টটি আপডেট হয়েছে।
            </p>
            <span style="font-size:9px; color:#64748b;">${t.dateStr} ${t.timeStr}</span>
        `;
        listEl.appendChild(item);
    });
}

// --- [নতুন ফিচার ৪]: এডভান্সড স্টেটমেন্ট ফিল্টারিং ---
function toggleStatementFilterModal() {
    const modal = document.getElementById('statementFilterModal');
    if (modal) {
        modal.classList.toggle('hidden');
        applyAdvancedTxFilter();
    }
}

function applyAdvancedTxFilter() {
    const type = document.getElementById('filterTypeSelect').value;
    const tbody = document.getElementById('filteredTxTableBody');
    if (!tbody || !activeUser) return;

    tbody.innerHTML = '';
    let filtered = allTransactions.filter(t => t.userEmail === activeUser.phone);

    if (type !== 'ALL') {
        filtered = filtered.filter(t => t.type === type);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; font-size:11px;">কোনো রেকর্ড পাওয়া যায়নি।</td></tr>`;
        return;
    }

    filtered.forEach(t => {
        let statusBadge = `<span class="status-pending">Pending</span>`;
        if (t.status === 'Approved') statusBadge = `<span class="status-approved">Approved</span>`;
        if (t.status === 'Rejected') statusBadge = `<span class="status-rejected">Rejected</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.dateStr}</td>
            <td><b>${t.type}</b></td>
            <td>${t.method}</td>
            <td style="color:#d97706; font-weight:bold;">${t.currency || '৳'} ${t.amount}</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- [নতুন ফিচার ৫]: টু-ফ্যাক্টর সিকিউরিটি ভ্যালিডেশন ---
function verifyTwoFactorAction(callback) {
    const currentPass = prompt("নিরাপত্তার জন্য আপনার বর্তমান পাসওয়ার্ড প্রদান করুন:");
    if (currentPass === activeUser.password) {
        callback();
    } else {
        showCustomAlert("সিকিউরিটি এরর", "ভুল পাসওয়ার্ড! পরিবর্তন সম্ভব নয়।");
    }
}

// অন্যান্য বিদ্যমান সহায়ক ফাংশনসমূহ
function checkLoginInputType(inputEl) {
    const val = inputEl.value.trim();
    const noteEl = document.getElementById('emailWarningNote');
    if (!noteEl) return;
    if (val.includes('@')) noteEl.classList.remove('hidden');
    else noteEl.classList.add('hidden');
}

async function openQuickPayScanner() {
    document.getElementById('cameraModal').classList.remove('hidden');
    try {
        const video = document.getElementById('qrVideoFeed');
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = cameraStream;
    } catch (err) {
        showCustomAlert("ক্যামেরা এরর", "ক্যামেরা পারমিশন পাওয়া যায়নি।");
    }
}

function closeQuickPayScanner() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    document.getElementById('cameraModal').classList.add('hidden');
}

function getUserCurrency(user) {
    if (!user) return '৳';
    if (user.currency) return user.currency;
    if (user.phone) {
        const matched = user.phone.match(/\+\d+/);
        if (matched && countryCurrencyMap[matched[0]]) return countryCurrencyMap[matched[0]];
    }
    return '৳';
}

function formatAmountLocale(amount) {
    const num = parseFloat(amount || 0).toFixed(2);
    if (currentLang === 'bn') {
        const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return num.toString().replace(/[0-9]/g, w => bnDigits[w]);
    }
    return num;
}

function showCustomAlert(title, message) {
    document.getElementById('customAlertTitle').innerText = title;
    document.getElementById('customAlertText').innerText = message;
    document.getElementById('customAlertModal').classList.remove('hidden');
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').classList.add('hidden');
}

function sanitizeEmailKey(keyStr) {
    return keyStr ? keyStr.replace(/[^a-zA-Z0-9]/g, "_") : "";
}

// ফায়ারবেস ডেটা সিঙ্ক
async function syncFromFirebase() {
    try {
        const uRes = await fetch(`${FIREBASE_DB_URL}/users.json`);
        const uData = await uRes.json();
        if (uData) {
            usersDatabase = Object.values(uData);
            localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
            if (activeUser) {
                const refreshedUser = usersDatabase.find(u => u.phone === activeUser.phone);
                if (refreshedUser) {
                    activeUser = refreshedUser;
                    localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
                }
            }
        }

        const bRes = await fetch(`${FIREBASE_DB_URL}/bannedEmails.json`);
        const bData = await bRes.json();
        if (bData) {
            bannedEmails = Object.values(bData);
            localStorage.setItem('wb_banned', JSON.stringify(bannedEmails));
        }

        const tRes = await fetch(`${FIREBASE_DB_URL}/transactions.json`);
        const tData = await tRes.json();
        if (tData) {
            allTransactions = Object.values(tData).reverse();
            localStorage.setItem('wb_transactions', JSON.stringify(allTransactions));
            renderNotificationsList();
        }
    } catch(err) {
        console.error("Firebase sync error:", err);
    }
}

// পেজ লোড ও অটো-ফোন ফিক্স
document.addEventListener('DOMContentLoaded', async () => {
    if (activeUser) {
        document.getElementById('authSection')?.classList.add('hidden');
        document.getElementById('dashboardSection')?.classList.remove('hidden');
        document.getElementById('userPhoneDisp').innerText = activeUser.phone;
        document.getElementById('userNameDisp').innerText = activeUser.name || 'User';
        updateAvatarDisplay();
        renderBalances();
        populateUserDynamicBanksWithLogos();
    } else {
        let savedPhone = localStorage.getItem('wb_saved_phone');
        if (savedPhone) {
            let logPhoneInput = document.getElementById('logPhone');
            if (logPhoneInput) logPhoneInput.value = savedPhone;
        }
    }
    await syncFromFirebase();
});

// পপ-আপ ইনস্ট্যান্ট শো / হাইড
function openAddMoneyModal() { document.getElementById('addMoneyModal').classList.toggle('hidden'); }
function openFundTransferModal() { document.getElementById('fundTransferModal').classList.toggle('hidden'); }
function openTopUpModal() { document.getElementById('topUpModal').classList.toggle('hidden'); }
function openCardBankModal() { document.getElementById('cardBankModal').classList.toggle('hidden'); }
function toggleForgotModal() { document.getElementById('forgotModal').classList.toggle('hidden'); }

function populateUserDynamicBanksWithLogos() {
    const addSelect = document.getElementById('addMoneyMethodSelect');
    const transferSelect = document.getElementById('fundTransferMethodSelect');
    if (!addSelect || !transferSelect) return;

    let countryCode = "+880";
    if (activeUser && activeUser.phone) {
        const matched = activeUser.phone.match(/\+\d+/);
        if (matched) countryCode = matched[0];
    }

    const localBanks = countrySpecificBanksWithLogos[countryCode] || [];
    let combinedBanks = Array.from(new Set(["🏛️ World Bank Account", ...localBanks, ...mandatoryBangladeshBanks, "🌐 International Wire Transfer"]));

    addSelect.innerHTML = `<option value="">পেমেন্ট মেথড বা ব্যাংক সিলেক্ট করুন</option>`;
    transferSelect.innerHTML = `<option value="">ট্রান্সফার মাধ্যম সিলেক্ট করুন</option>`;

    combinedBanks.forEach(b => {
        addSelect.innerHTML += `<option value="${b}">${b}</option>`;
        transferSelect.innerHTML += `<option value="${b}">${b}</option>`;
    });
}

function updateAvatarDisplay() {
    const avatarEl = document.getElementById('userAvatarDisp');
    if (!avatarEl) return;
    if (activeUser && activeUser.photo) {
        avatarEl.style.backgroundImage = `url(${activeUser.photo})`;
        avatarEl.innerText = '';
    } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.innerText = '👤';
    }
}

async function saveUserToFirebase(user) {
    const userKey = sanitizeEmailKey(user.phone);
    try {
        await fetch(`${FIREBASE_DB_URL}/users/${userKey}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
    } catch(err) { console.error("User save error:", err); }
}

async function saveTxToFirebase(txObj) {
    try {
        await fetch(`${FIREBASE_DB_URL}/transactions/tx_${txObj.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txObj)
        });
    } catch(err) { console.error("Tx save error:", err); }
}

function sendTelegramNotification(message) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' })
    }).catch(err => console.error("Telegram API Error:", err));
}

// সাইন আপ
async function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const countryCodeSelect = document.getElementById('regCountryCode');
    const rawPhone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPass').value;

    const fullPhone = countryCodeSelect.value + rawPhone;
    const currency = countryCodeSelect.options[countryCodeSelect.selectedIndex].getAttribute('data-currency') || '৳';

    if (bannedEmails.includes(email) || bannedEmails.includes(fullPhone)) {
        showCustomAlert("ব্লকড", 'এই অ্যাকাউন্টটি ব্ল্যাকলিস্টেড।');
        return;
    }

    const exists = usersDatabase.some(u => u.phone === fullPhone || u.email === email);
    if(exists) {
        showCustomAlert("সতর্কতা", 'এই ফোন নম্বর বা ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে!');
        return;
    }

    const newUser = {
        name,
        email,
        phone: fullPhone,
        currency: currency,
        password,
        photo: null,
        totalBalance: 0.00,
        withdrawLimit: 0.00,
        balances: { ...defaultBalances }
    };

    usersDatabase.push(newUser);
    localStorage.setItem('wb_users', JSON.stringify(usersDatabase));
    localStorage.setItem('wb_saved_phone', fullPhone);

    saveUserToFirebase(newUser);
    sendTelegramNotification(`👤 <b>World Bank নতুন সাইন আপ!</b>\n\n📛 নাম: ${name}\n📧 ইমেইল: ${email}\n📱 ফোন: ${fullPhone}\n💱 কারেন্সি: ${currency}`);

    showCustomAlert("সফল", 'অ্যাকাউন্ট তৈরি হয়েছে! এখন মোবাইল নম্বর দিয়ে লগইন করুন।');
    switchTab('login');

    let logPhoneInput = document.getElementById('logPhone');
    if (logPhoneInput) logPhoneInput.value = fullPhone;

    document.getElementById('signUpForm').reset();
}

// লগইন (মোবাইল নম্বর ফিক্সড)
async function handleLogin(e) {
    e.preventDefault();
    const inputPhone = document.getElementById('logPhone').value.trim();
    const password = document.getElementById('logPass').value;

    if (inputPhone.includes("@")) {
        showCustomAlert("লগইন ত্রুটি", 'ইমেইল দিয়ে লগইন করা সম্ভব নয়! নিবন্ধিত মোবাইল নম্বর দিন।');
        return;
    }

    if (bannedEmails.includes(inputPhone)) {
        showCustomAlert("ব্লকড", 'আপনার অ্যাকাউন্টটি ব্লক করা হয়েছে!');
        return;
    }

    const userIndex = usersDatabase.findIndex(u => (u.phone === inputPhone || u.phone.includes(inputPhone)) && u.password === password);

    if(userIndex !== -1) {
        activeUser = usersDatabase[userIndex];
        if(!activeUser.balances) activeUser.balances = { ...defaultBalances };

        localStorage.setItem('wb_active_session', JSON.stringify(activeUser));
        localStorage.setItem('wb_saved_phone', activeUser.phone);

        document.getElementById('authSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        document.getElementById('userPhoneDisp').innerText = activeUser.phone;
        document.getElementById('userNameDisp').innerText = activeUser.name || 'User';

        updateAvatarDisplay();
        renderBalances();
        populateUserDynamicBanksWithLogos();
        renderNotificationsList();
    } else {
        const errText = document.getElementById('errorText');
        if (errText) errText.style.display = 'block';
    }
}

function renderBalances() {
    const pillText = document.getElementById('balancePillText');
    const symbolEl = document.getElementById('dashCurrencySymbol');
    const userCurr = getUserCurrency(activeUser);
    
    if (symbolEl && activeUser) symbolEl.innerText = userCurr;
    if (pillText) pillText.innerText = "Balance";
}

function toggleBalanceVisibility() {
    const pillText = document.getElementById('balancePillText');
    if (!activeUser) return;
    if (balanceHideTimer) clearTimeout(balanceHideTimer);

    const rawBal = activeUser.totalBalance !== undefined ? activeUser.totalBalance : 0.00;
    const showBal = formatAmountLocale(rawBal);
    const curr = getUserCurrency(activeUser);
    
    pillText.innerText = `${curr} ${showBal}`;
    balanceHideTimer = setTimeout(() => { pillText.innerText = "Balance"; }, 3000);
}

function logout() {
    activeUser = null;
    localStorage.removeItem('wb_active_session');
    
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();

    let savedPhone = localStorage.getItem('wb_saved_phone');
    if (savedPhone) {
        let logPhoneInput = document.getElementById('logPhone');
        if (logPhoneInput) logPhoneInput.value = savedPhone;
    }
}

function switchTab(type) {
    const loginForm = document.getElementById('loginForm');
    const signUpForm = document.getElementById('signUpForm');
    const loginTab = document.getElementById('loginTab');
    const signUpTab = document.getElementById('signUpTab');

    if(type === 'login') {
        loginForm?.classList.remove('hidden');
        signUpForm?.classList.add('hidden');
        loginTab?.classList.add('active');
        signUpTab?.classList.remove('active');
    } else {
        signUpForm?.classList.remove('hidden');
        loginForm?.classList.add('hidden');
        signUpTab?.classList.add('active');
        loginTab?.classList.remove('active');
    }
}
